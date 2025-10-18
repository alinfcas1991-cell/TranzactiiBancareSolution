using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using TranzactiiCommon.Models;

public class CsvIngParser
{
    private readonly AppDbContextTranzactiiFinanciare _context;

    public CsvIngParser(AppDbContextTranzactiiFinanciare context)
    {
        _context = context;
    }

    public void AutoSplitSpecialTransactions()
    {
        // 🔹 Selectăm tranzacțiile care trebuie auto-splitate
        var targetTransactions = _context.TranzactiiING
            .Where(t => t.Categorie != null && t.Categorie.Contains("1 pachet tigari"))
            .ToList();

        foreach (var parent in targetTransactions)
        {
            if (parent.EsteProcesata == true)
                continue;

            decimal diferenta = 0m;
            var match = Regex.Match(parent.Categorie, @"\(([\d,\.]+)\s*lei\)");
            if (match.Success && decimal.TryParse(match.Groups[1].Value.Replace(",", "."), NumberStyles.Any, CultureInfo.InvariantCulture, out decimal val))
                diferenta = val;

            // 🔹 Soldul părintelui (se va propaga)
            decimal soldParinte = parent.SoldFinal ?? 0m;
            decimal soldCurent = soldParinte;

            // ✅ Copil 1 – TIGARI
            var copilTigari = new TranzactiiCommon.Models.TranzactieING
            {
                DataTranzactie = parent.DataTranzactie,
                TipTranzactie = parent.TipTranzactie,
                Merchant = parent.Merchant,
                Suma = 27.5m,
                Categorie = "TIGARI",
                EsteCredit = parent.EsteCredit,
                Detalii = "(auto) 1 pachet tigari",
                ParentId = parent.Id,
                SoldFinal = soldCurent,
                // ✅ moștenim sursa părintelui
                SursaCard = parent.SursaCard
            };

            soldCurent -= copilTigari.Suma ?? 0;

            // ✅ Copil 2 – BERE (doar dacă există diferență)
            TranzactiiCommon.Models.TranzactieING copilBere = null;
            if (diferenta > 0)
            {
                copilBere = new TranzactiiCommon.Models.TranzactieING
                {
                    DataTranzactie = parent.DataTranzactie,
                    TipTranzactie = parent.TipTranzactie,
                    Merchant = parent.Merchant,
                    Suma = diferenta,
                    Categorie = "BERE",
                    EsteCredit = parent.EsteCredit,
                    Detalii = $"(auto) diferență bere ({diferenta:0.00} lei)",
                    ParentId = parent.Id,
                    SoldFinal = soldCurent,
                    // ✅ moștenim și aici
                    SursaCard = parent.SursaCard
                };

                soldCurent -= copilBere.Suma ?? 0;
            }

            // ✅ Adăugăm copiii
            _context.TranzactiiING.Add(copilTigari);
            if (copilBere != null)
                _context.TranzactiiING.Add(copilBere);

            // ✅ Marcăm părintele procesat, dar nu-l ștergem
            parent.EsteProcesata = true;
            if (string.IsNullOrEmpty(parent.Detalii))
                parent.Detalii = "🔁 AutoSplit generat automat (TIGARI + BERE)";
            else if (!parent.Detalii.Contains("🔁"))
                parent.Detalii += " | 🔁 AutoSplit generat automat";

            Console.WriteLine(
                $"🤖 AutoSplit #{parent.Id} ({parent.SursaCard}): TIGARI {copilTigari.Suma:0.00} + {(copilBere != null ? $"BERE {copilBere.Suma:0.00}" : "—")} | Sold final {soldParinte:0.00}"
            );
        }

        _context.SaveChanges();
        Console.WriteLine("✅ AutoSplit complet: copiii au moștenit SursaCard-ul părintelui.");
    }


    private string MakeKey(TranzactiiCommon.Models.TranzactieING t, string sursa)
    {
        return $"{sursa}-" +
               (t.DataTranzactie.HasValue ? t.DataTranzactie.Value.ToString("yyyyMMdd") : "") +
               (t.TipTranzactie ?? "").Trim().ToUpperInvariant() + "|" +
               (t.Suma ?? 0) + "|" +
               (t.Merchant ?? "").Trim().ToUpperInvariant() + "|" +
               (t.NumarAutorizare ?? "").Trim();
    }



    public void ImportFromCsv(string filePath, string sursa)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException("Fișierul CSV nu există!", filePath);

        var lines = File.ReadAllLines(filePath);
        TranzactiiCommon.Models.TranzactieING current = null;

        // =====================================================
        // 🔹 1. Extragem cheile deja existente din DB (active)
        // =====================================================
        var existingKeys = new HashSet<string>(
            _context.TranzactiiING
            .Where(t => t.EsteProcesata == false || t.EsteProcesata == null)
            .ToList()
            .Select(t => MakeKey(t, sursa))
        );

        // =====================================================
        // 🔹 2. Extragem cheile istorice (toate tranzacțiile importate vreodată)
        // =====================================================
        var historyKeys = new HashSet<string>(
            _context.ImportHistory.Select(h => h.UniqueKey).ToList()
        );

        var newOnes = new List<TranzactiiCommon.Models.TranzactieING>();

        foreach (var rawLine in lines)
        {
            if (string.IsNullOrWhiteSpace(rawLine))
                continue;

            string cleanedLine = rawLine.Replace("\"", "").Replace(";", ",").Trim();
            var cols = cleanedLine.Split(',');

            if (TryParseRomanianDate(cols[0], out DateTime dataTranz))
            {
                if (current != null)
                {
                    ApplyCustomRules(current);
                    string key = MakeKey(current, sursa);

                    if (!existingKeys.Contains(key) && !historyKeys.Contains(key))
                    {
                        current.SursaCard = sursa;

                        newOnes.Add(current);
                        existingKeys.Add(key);
                        historyKeys.Add(key);

                        _context.ImportHistory.Add(new ImportHistory
                        {
                            Sursa = sursa,
                            UniqueKey = key,
                            CreatedAt = DateTime.Now
                        });

                        Console.WriteLine($"✅ Nouă tranzacție: {current.Merchant} - {current.Suma} ({key}) [{sursa}]");
                    }
                    else
                    {
                        Console.WriteLine($"🧱 Ignorată (deja importată): {current.Merchant} - {current.Suma}");
                    }
                }

                string tipSauMerchant = cols.Skip(1)
                    .FirstOrDefault(c => !string.IsNullOrWhiteSpace(c))?.Trim() ?? "";

                bool isApproved = tipSauMerchant.Contains("POS", StringComparison.OrdinalIgnoreCase) ||
                                  tipSauMerchant.Contains("Incasare", StringComparison.OrdinalIgnoreCase) ||
                                  tipSauMerchant.Contains("Transfer", StringComparison.OrdinalIgnoreCase);

                var (suma, sold) = ExtractSumaSiSold(cleanedLine);

                if (isApproved)
                {
                    current = new TranzactiiCommon.Models.TranzactieING
                    {
                        DataTranzactie = dataTranz,
                        TipTranzactie = tipSauMerchant,
                        Suma = suma,
                        EsteCredit = tipSauMerchant.Contains("Incasare", StringComparison.OrdinalIgnoreCase),
                        SoldFinal = sold,
                        Detalii = cleanedLine,
                        SursaCard = sursa
                    };
                }
                else
                {
                    current = new TranzactiiCommon.Models.TranzactieING
                    {
                        DataTranzactie = dataTranz,
                        TipTranzactie = "Pending",
                        Merchant = tipSauMerchant,
                        Suma = suma,
                        EsteCredit = false,
                        SoldFinal = sold,
                        DataDecontarii = null,
                        Categorie = "Tranzacție în așteptare",
                        Detalii = cleanedLine,
                        SursaCard = sursa
                    };
                }
            }
            else if (current != null)
            {
                // 🔹 Continuare de detalii
                current.Detalii += " | " + cleanedLine;

                if (cleanedLine.Contains("Beneficiar:"))
                    current.Merchant = ExtractValue(cleanedLine);

                if (cleanedLine.Contains("Ordonator:"))
                    current.Merchant = ExtractValue(cleanedLine);

                if (cleanedLine.Contains("Detalii:"))
                    current.Categorie = ExtractValue(cleanedLine);

                if (cleanedLine.Contains("In contul:"))
                    current.Referinta = ExtractValue(cleanedLine);

                if (cleanedLine.Contains("Banca:"))
                    current.Categorie = ExtractValue(cleanedLine);

                if (cleanedLine.Contains("Numar card"))
                    current.NumarCard = ExtractValue(cleanedLine);

                if (cleanedLine.Contains("Tranzactie la"))
                    current.Merchant = ExtractValue(cleanedLine);

                if (cleanedLine.Contains("Numar autorizare"))
                    current.NumarAutorizare = ExtractValue(cleanedLine);

                if (cleanedLine.Contains("Data finalizarii"))
                {
                    var val = ExtractValue(cleanedLine);
                    if (DateTime.TryParseExact(val, "dd-MM-yyyy", CultureInfo.InvariantCulture,
                                               DateTimeStyles.None, out DateTime d))
                        current.DataDecontarii = d;
                }

                if (cleanedLine.Contains("Data autorizarii"))
                {
                    var val = ExtractValue(cleanedLine);
                    if (DateTime.TryParseExact(val, "dd-MM-yyyy", CultureInfo.InvariantCulture,
                                               DateTimeStyles.None, out DateTime d))
                        current.DataAutorizarii = d;
                }
            }
        }



        // 🔹 ultima tranzacție din fișier
        if (current != null)
        {
            ApplyCustomRules(current);
            string key = MakeKey(current, sursa);

            if (!existingKeys.Contains(key) && !historyKeys.Contains(key))
            {
                current.SursaCard = sursa;
                newOnes.Add(current);
                existingKeys.Add(key);

                _context.ImportHistory.Add(new ImportHistory
                {
                    Sursa = sursa,
                    UniqueKey = key,
                    CreatedAt = DateTime.Now
                });

                Console.WriteLine($"✅ Ultima tranzacție: {current.Merchant} - {current.Suma} [{sursa}]");
            }
            else
            {
                Console.WriteLine($"🧱 Ignorată (deja importată): {current.Merchant} - {current.Suma}");
            }
        }



        // =====================================================
        // 🔹 3. Salvăm totul
        // =====================================================
        if (newOnes.Any())
        {
            _context.TranzactiiING.AddRange(newOnes);
            _context.SaveChanges();

            Console.WriteLine($"✅ Import finalizat: {newOnes.Count} tranzacții noi ({sursa}).");
        }
        else
        {
            Console.WriteLine($"ℹ️ Nicio tranzacție nouă pentru sursa {sursa} (toate erau deja importate).");
        }
    }




    // 🔹 helper care face cheia unica
    private string MakeKey(TranzactiiCommon.Models.TranzactieING t)
    {
        return (t.DataTranzactie.HasValue ? t.DataTranzactie.Value.ToString("yyyyMMdd") : "") +
               (t.TipTranzactie ?? "").Trim().ToUpperInvariant() + "|" +
               (t.Suma ?? 0) + "|" +
               (t.Merchant ?? "").Trim().ToUpperInvariant() + "|" +
               (t.NumarAutorizare ?? "").Trim();
    }


    // 🔹 helper care normalizeaza stringurile pentru comparatii (null → "", trim, uppercase)
    private string Normalize(string input)
    {
        return string.IsNullOrWhiteSpace(input) ? "" : input.Trim().ToUpperInvariant();
    }

    // 🔹 helper care intoarce mereu string safe (null → "")
    private string SafeTrim(string input)
    {
        return string.IsNullOrEmpty(input) ? "" : input.Trim();
    }

    // 🔹 verificare duplicate inteligenta (autorizare sau referinta)
    private bool IsDuplicate(TranzactiiCommon.Models.TranzactieING t)
    {
        string merchant = Normalize(t.Merchant);
        string numarAutorizare = SafeTrim(t.NumarAutorizare);
        string referinta = SafeTrim(t.Referinta);

        return _context.TranzactiiING
            .AsEnumerable() // mutăm logica de comparare în memorie
            .Any(ex =>
                ex.DataTranzactie == t.DataTranzactie &&
                ex.Suma == t.Suma &&
                Normalize(ex.Merchant) == merchant &&
                (
                    (!string.IsNullOrEmpty(numarAutorizare) && SafeTrim(ex.NumarAutorizare) == numarAutorizare)
                    ||
                    (string.IsNullOrEmpty(numarAutorizare) && SafeTrim(ex.Referinta) == referinta)
                ) &&
                ex.EsteCredit == t.EsteCredit
            );
    }

    private void ApplyCustomRules(TranzactiiCommon.Models.TranzactieING tranzactie)
    {
        if ((tranzactie.TipTranzactie.Equals("Cumparare POS", StringComparison.OrdinalIgnoreCase) ||
             tranzactie.TipTranzactie.Equals("Pending", StringComparison.OrdinalIgnoreCase)) &&
            (tranzactie.Merchant?.Contains("ALEN PLAZA", StringComparison.OrdinalIgnoreCase) ?? false))
        {
            var suma = tranzactie.Suma ?? 0;
            if (Math.Abs(suma - 27.5m) < 0.01m)
            {
                tranzactie.Categorie = "1 pachet tigari";
            }
            else if (suma > 27.5m)
            {
                decimal diferenta = suma - 27.5m;
                tranzactie.Categorie = $"1 pachet tigari | diferenta bere ({diferenta:0.00} lei)";
            }
        }
    }

    private bool TryParseRomanianDate(string input, out DateTime date)
    {
        string[] formats = { "d MMMM yyyy", "dd MMMM yyyy" };
        var culture = new CultureInfo("ro-RO");
        return DateTime.TryParseExact(input.Trim(), formats, culture, DateTimeStyles.None, out date);
    }

    private (decimal? suma, decimal? sold) ExtractSumaSiSold(string line)
    {
        var matches = Regex.Matches(line, @"\d{1,3}(\.\d{3})*,\d{2}");

        decimal? suma = null, sold = null;

        if (matches.Count > 0 &&
            decimal.TryParse(matches[0].Value, NumberStyles.Any, new CultureInfo("ro-RO"), out decimal valSuma))
        {
            suma = valSuma;
        }

        if (matches.Count > 1 &&
            decimal.TryParse(matches[1].Value, NumberStyles.Any, new CultureInfo("ro-RO"), out decimal valSold))
        {
            sold = valSold;
        }

        return (suma, sold);
    }

    private string ExtractValue(string line)
    {
        var parts = line.Split(':');
        return parts.Length > 1 ? parts[1].Trim().Trim(',') : "";
    }
}
