using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using CITIREPDFPLUXEE;
using TranzactiiCommon.Models;


namespace CITIREPDFPLUXEE
{
    public static class PluxeePdfReader
    {
        public static List<TranzactieING> Parse(string filePath)
{
    var tranzactii = new List<TranzactieING>();

    if (!File.Exists(filePath))
    {
        Console.WriteLine("❌ PDF inexistent: " + filePath);
        return tranzactii;
    }

    // 🔹 Citim tot PDF-ul
    using var pdfDoc = new PdfDocument(new PdfReader(filePath));
    string allText = "";
    for (int pageIndex = 1; pageIndex <= pdfDoc.GetNumberOfPages(); pageIndex++)
        allText += PdfTextExtractor.GetTextFromPage(pdfDoc.GetPage(pageIndex)) + "\n";

    // 🔹 Normalizează caractere speciale
    allText = allText.Replace('\u2212', '-')  // minus
                     .Replace('\u00A0', ' ')  // NBSP
                     .Replace("−", "-");

    // 🔹 Curățăm liniile și eliminăm cele INVEST
    var rawLines = allText.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                          .Select(l => l.Trim())
                          .Where(l => !string.IsNullOrWhiteSpace(l))
                          .Where(l => !l.Contains("INVEST INTERMED GOLD", StringComparison.OrdinalIgnoreCase))
                          .ToList();

    Console.WriteLine($"=== Test parser PDF Pluxee ===");
    Console.WriteLine($"📄 Fișier: {Path.GetFileName(filePath)}\n");

    // 🔹 🧠 Corectăm liniile care conțin data + merchant + sumă pe același rând
    for (int i = 0; i < rawLines.Count; i++)
    {
        // Ex: "12 Oct 2025 10:15:51 KAUFLAND -RON 84.33"
        if (Regex.IsMatch(rawLines[i], @"\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2}:\d{2}.*-?RON\s*\d"))
        {
            var match = Regex.Match(rawLines[i],
                @"\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+(.*?)\s+-?RON",
                RegexOptions.IgnoreCase);

            if (match.Success)
            {
                string merchantInline = match.Groups[1].Value.Trim();
                // evităm dublurile
                if (i == 0 || !rawLines[i - 1].Equals(merchantInline, StringComparison.OrdinalIgnoreCase))
                {
                    rawLines.Insert(i, merchantInline);
                    i++; // skip peste ce am inserat
                }
            }
        }
    }

    // 🔹 Începem de la coadă spre început
    for (int i = rawLines.Count - 1; i >= 2; i--)
    {
        string line2 = rawLines[i];     // ex: Purchase
        string line1 = rawLines[i - 1]; // ex: 01 Sept 2025 ...
        string line0 = rawLines[i - 2]; // ex: SHOP & GO

        // Detectăm dacă linia [1] e o dată validă
        if (TryParseDateFromLine(line1, out DateTime dataOra, out _))
        {
            bool esteCredit = false;
            decimal sumaAbs = 0m;
            TryParseAmountFromText(line1, out esteCredit, out sumaAbs);

            string tip = "Other";
            if (line2.Contains("Purchase", StringComparison.OrdinalIgnoreCase))
                tip = "Purchase";
            else if (line2.Contains("TopUp", StringComparison.OrdinalIgnoreCase) ||
                     line2.Contains("Corporate", StringComparison.OrdinalIgnoreCase))
                tip = "TopUp";

            string merchant = "(necunoscut)";
            if (!Regex.IsMatch(line0, @"\d{1,2}\s+\w+\s+\d{4}", RegexOptions.IgnoreCase) &&
                !line0.Contains("Purchase", StringComparison.OrdinalIgnoreCase) &&
                !line0.Contains("TopUp", StringComparison.OrdinalIgnoreCase))
            {
                merchant = line0.Trim();
            }

            // 🔹 corecție Merchant
            if (merchant.Contains("Merchant name unavailable", StringComparison.OrdinalIgnoreCase))
                merchant = "SALARIU ITHIT";

            // 🔹 rectificare sumă — dacă e gen 4699 → 46.99
            if (sumaAbs > 10 && !line1.Contains('.') && !line1.Contains(','))
            {
                var temp = sumaAbs / 100m;
                if (temp < 10000) sumaAbs = temp;
            }

            tranzactii.Add(new TranzactieING
            {
                DataTranzactie = dataOra,
                TipTranzactie = tip,
                Merchant = merchant,
                EsteCredit = esteCredit,
                Suma = Math.Round(esteCredit ? sumaAbs : -sumaAbs, 2)
            });

            i -= 2; // Sărim peste liniile consumate
        }
    }

    tranzactii.Reverse(); // inversăm ca să fie cronologic

            // 🔹 Asigurăm completarea automată a câmpurilor lipsă
            foreach (var t in tranzactii)
            {
                t.SursaCard = "PLUXEE";
                t.EsteCredit = false; // Pluxee sunt plăți (debit)
                t.TipTranzactie ??= "Purchase";
                t.Categorie ??= "Tranzactie Pluxee";
                t.Detalii ??= "(import automat PDF)";
            }


            return tranzactii;
}


        // 🔹 metodele helper
        private static bool TryParseDateFromLine(string line, out DateTime dt, out string restAfterTime)
        {
            dt = DateTime.MinValue;
            restAfterTime = "";
            var headSplit = line.Split(' ', 4);
            if (headSplit.Length < 4) return false;

            string day = headSplit[0];
            string mon = headSplit[1];
            string year = headSplit[2];
            string timeAndRest = headSplit[3];

            int sp = timeAndRest.IndexOf(' ');
            if (sp < 0) return false;
            string time = timeAndRest[..sp].Trim();
            restAfterTime = timeAndRest[(sp + 1)..].Trim();

            mon = Regex.Replace(mon, @"\bSept\.?\b", "Sep", RegexOptions.IgnoreCase);
            string dateStr = $"{day} {mon} {year} {time}";
            return TryParseDateTimeFlexible(dateStr, out dt);
        }

        private static bool TryParseDateTimeFlexible(string input, out DateTime result)
        {
            result = DateTime.MinValue;
            string[] fmts = { "d MMM yyyy HH:mm:ss", "dd MMM yyyy HH:mm:ss" };
            var ro = new CultureInfo("ro-RO");
            var en = new CultureInfo("en-US");

            foreach (var fmt in fmts)
            {
                if (DateTime.TryParseExact(input, fmt, ro, DateTimeStyles.None, out result)) return true;
                if (DateTime.TryParseExact(input, fmt, en, DateTimeStyles.None, out result)) return true;
            }
            return false;
        }

        private static bool TryParseAmountFromText(string text, out bool esteCredit, out decimal sumaAbs)
        {
            esteCredit = false;
            sumaAbs = 0m;

            if (string.IsNullOrWhiteSpace(text))
                return false;

            text = text.Replace('\u2212', '-')
                       .Replace('\u00A0', ' ')
                       .Replace("−", "-")
                       .Trim();

            var m = Regex.Match(text, @"([+-]?)\s*RON\s*([\d\.\,]+)", RegexOptions.IgnoreCase);
            if (!m.Success) return false;

            string sign = m.Groups[1].Value.Trim();
            string num = m.Groups[2].Value.Trim();

            esteCredit = string.IsNullOrEmpty(sign) || sign == "+";

            // Dacă avem ambele punct și virgulă – curățăm elegant
            if (num.Contains('.') && num.Contains(','))
            {
                if (num.LastIndexOf('.') > num.LastIndexOf(','))
                    num = num.Replace(",", "");
                else
                    num = num.Replace(".", "").Replace(',', '.');
            }
            else
            {
                num = num.Replace(',', '.');
            }

            if (!decimal.TryParse(num, NumberStyles.Number, CultureInfo.InvariantCulture, out sumaAbs))
                return false;

            // ✅ Corecție: dacă textul NU conține . sau , și suma e >10 → probabil lipsește separatorul
            if (sumaAbs > 10 && !text.Contains('.') && !text.Contains(','))
                sumaAbs /= 100m;

            return true;
        }

    }
}
