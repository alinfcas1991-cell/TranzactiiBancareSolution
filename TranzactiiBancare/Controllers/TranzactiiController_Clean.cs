using CITIREPDFPLUXEE;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using TranzactiiBancare;
using TranzactiiCommon.Models;
using TranzactiiBancare.Models;


[ApiController]
[Route("api/[controller]")]


public class TranzactiiController : ControllerBase
{
    private readonly AppDbContextTranzactiiFinanciare _context;

    public TranzactiiController(AppDbContextTranzactiiFinanciare context)
    {
        _context = context;
    }

    // ======================================================
    // 🔹 GET toate tranzacțiile
    // ======================================================
    [HttpGet]
    public IActionResult GetAll()
    {
        var list = _context.TranzactiiING
                           .OrderByDescending(t => t.DataTranzactie)
                           .ToList();
        return Ok(list);
    }

    // 🔹 Funcție helper pentru a elimina diacriticele (ă, î, ș, ț)
    string Normalize(string input)
    {
        if (string.IsNullOrEmpty(input)) return "";
        var formD = input.Normalize(NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (var ch in formD)
        {
            var uc = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (uc != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).ToLower();
    }

    // adaugă în TranzactiiController_Clean.cs (unde ai deja metoda Normalize)
    private string MakePluxeeKey(TranzactiiCommon.Models.TranzactieING t, string sursa)
    {
        // rotunjim suma la 2 zecimale pentru stabilitate
        var suma = Math.Abs(t.Suma ?? 0m);
        var sumStr = suma.ToString("0.00", CultureInfo.InvariantCulture);

        var merchant = (t.Merchant ?? "").Trim().ToUpperInvariant();
        var data = (t.DataTranzactie ?? DateTime.MinValue);

        // includem și ora/minutul (în extrasele Pluxee apare timestamp)
        return $"{sursa}|{data:yyyyMMddHHmm}|{sumStr}|{merchant}";
    }



    // ======================================================
    // 🔹 GET categorii din fișier JSON (frontend autocomplete)
    // ======================================================
    [HttpGet("categorii-json")]
    public IActionResult GetCategoriiJson()
    {
        try
        {
            var rootPath = Directory.GetCurrentDirectory();

            // 🔍 căutăm în mai multe locații posibile
            var possiblePaths = new[]
            {
            Path.Combine(rootPath, "DataFiles", "categorii.json"),                                 // local dev
            Path.Combine(rootPath, "TranzactiiBancare", "DataFiles", "categorii.json"),           // VS build
            Path.Combine(AppContext.BaseDirectory, "DataFiles", "categorii.json"),                 // bin\Debug\net8.0
            Path.Combine(AppContext.BaseDirectory, "categorii.json"),                              // fallback direct
            Path.Combine(Directory.GetParent(AppContext.BaseDirectory)?.FullName ?? "", "DataFiles", "categorii.json"), // render publish root
            Path.Combine(Directory.GetParent(rootPath)?.FullName ?? "", "DataFiles", "categorii.json")                 // un nivel mai sus
        };

            Console.WriteLine("🔍 Caut categorii.json în următoarele locuri:");
            foreach (var p in possiblePaths)
                Console.WriteLine("➡️ " + p);

            // 📄 alegem primul fișier existent
            var fileToUse = possiblePaths.FirstOrDefault(System.IO.File.Exists);

            if (fileToUse == null)
            {
                Console.WriteLine("⚠️ Fișierul categorii.json nu a fost găsit nicăieri!");
                return Ok(new string[0]);
            }

            Console.WriteLine($"✅ Folosesc fișierul: {fileToUse}");

            var json = System.IO.File.ReadAllText(fileToUse);
            var categorii = JsonSerializer.Deserialize<List<string>>(json) ?? new();

            Console.WriteLine($"✅ Găsit {categorii.Count} categorii în {fileToUse}");
            return Ok(categorii);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"🔥 Eroare la citirea categorii.json: {ex.Message}");
            return StatusCode(500, new { message = "Eroare la citirea categoriilor", details = ex.Message });
        }
    }



    [HttpPut("update-netpersonal/{id}")]
    public async Task<IActionResult> UpdateNetPersonal(int id, [FromBody] JsonElement body)
    {
        if (!body.TryGetProperty("netPersonal", out var val)) return BadRequest();
        var tranz = await _context.TranzactiiING.FindAsync(id);
        if (tranz == null) return NotFound();

        tranz.NetPersonal = val.GetDecimal();
        tranz.EstePersonal = true;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"NetPersonal actualizat la {val.GetDecimal():0.00} lei pentru tranzacția {id}"
        });

    }



    // ======================================================
    // 🔹 OCR + AI learning (cu log și try/catch complet)
    // ======================================================
    [ApiExplorerSettings(IgnoreApi = true)]
    [HttpPost("attach-ocr")]
    public async Task<IActionResult> AttachOcr([FromForm] IFormFile file, [FromForm] int parentId)
    {
        Console.WriteLine("🚀 Serverul rulează versiunea NOUĂ a AttachOcr (DetectCategorie actualizat)");

        try
        {
            if (file == null || parentId <= 0)
                return BadRequest("Lipsește fișierul sau ID-ul tranzacției");

            var parent = _context.TranzactiiING.FirstOrDefault(t => t.Id == parentId);
            if (parent == null)
                return NotFound($"Tranzacția {parentId} nu există");
            //test


            string endpoint = Environment.GetEnvironmentVariable("AZURE_OCR_ENDPOINT");
            string key = Environment.GetEnvironmentVariable("AZURE_OCR_KEY");
            string url = $"{endpoint}formrecognizer/documentModels/prebuilt-receipt:analyze?api-version=2023-07-31";
            //test

            var client = new HttpClient();
           

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            ms.Position = 0;

            using var content = new ByteArrayContent(ms.ToArray());
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");

            // 🔹 1️⃣ Trimiterea către Azure
            var resp = await client.PostAsync(url, content);
            var body = await resp.Content.ReadAsStringAsync();

            Console.WriteLine($"🟢 Azure response: {resp.StatusCode}");
            Console.WriteLine($"🔹 Azure body: {body}");

            if (!resp.IsSuccessStatusCode)
                return StatusCode((int)resp.StatusCode, new { message = "Eroare OCR Azure", details = body });

            if (!resp.Headers.Contains("operation-location"))
                return BadRequest("Azure nu a returnat operation-location (verifică endpointul și cheile).");

            string opUrl = resp.Headers.GetValues("operation-location").First();

            // 🔹 2️⃣ Așteptăm finalizarea analizei
            string json = "";
            for (int i = 0; i < 20; i++)
            {
                await Task.Delay(1000);
                var checkResp = await client.GetAsync(opUrl);
                json = await checkResp.Content.ReadAsStringAsync();

                if (json.Contains("\"status\":\"succeeded\""))
                    break;
            }

            if (string.IsNullOrEmpty(json))
                return StatusCode(500, new { message = "Azure nu a returnat niciun răspuns JSON." });

            // 🔹 3️⃣ Parsăm rezultatul OCR
            var doc = JsonNode.Parse(json);
            var fields = doc?["analyzeResult"]?["documents"]?.AsArray()?.FirstOrDefault()?["fields"];
            var items = fields?["Items"]?["valueArray"]?.AsArray();
            decimal? totalOcr = fields?["Total"]?["valueNumber"]?.GetValue<decimal?>();
            decimal totalParent = parent.Suma ?? 0;

            if (totalOcr == null || items == null)
                return BadRequest("OCR invalid sau fără produse.");

            // 🔹 Categoriile principale
            string[] mancare = {
    "napolitana", "napolitane", "iaurt", "carnat", "lapte", "pizza", "ou", "salata",
    "piept", "pui", "toast", "chips", "chipsuri", "kefir", "biscuit", "paine", "corn",
    "cereale", "crenvurst", "mezel", "pate", "snitel", "sandwich", "salam", "batoane",
    "rosii", "castraveti", "ardei", "cartofi", "morcovi", "usturoi", "ceapa"
};


            string[] ingrediente = {
    "ulei", "sare", "faina", "zahar", "piper", "otet", "mustar", "condiment", "boia"
};

            string[] bauturi = { "cola", "fanta", "pepsi", "tymbark", "suc", "cappy", "apa", "sprite" };
            string[] igiena = { "gel", "dus", "pasta", "dinti", "sampon", "servetel", "detergent", "spuma" };

            // 🔹 Funcție robustă de clasificare
            // 🔹 Funcție robustă de clasificare cu potrivire pe cuvinte întregi
            string DetectCategorie(string text)
            {
                if (string.IsNullOrWhiteSpace(text))
                    return "ALTELE";

                string t = Normalize(text);

                bool ContineOricare(string[] lista)
                {
                    // Splităm textul în cuvinte reale (cu delimitatori)
                    var cuvinte = t.Split(new[] { ' ', ',', '.', '-', '/', '(', ')', ':', ';' }, StringSplitOptions.RemoveEmptyEntries);
                    return lista.Any(cuv => cuvinte.Contains(cuv));
                }

                // ✅ Priorități clare (cu potriviri exacte)
                if (t.Contains("chips") || t.Contains("chipsuri")) return "MANCARE";
                if (ContineOricare(mancare)) return "MANCARE";
                if (ContineOricare(ingrediente)) return "INGREDIENTE";
                if (ContineOricare(bauturi)) return "SUC";
                if (ContineOricare(igiena)) return "IGIENA(PRODUSE)";
                if (t.Contains("bere") || t.Contains("vin") || t.Contains("vodka")) return "BERE";
                if (t.Contains("cafe") || t.Contains("espresso") || t.Contains("jacobs")) return "CAFEA";

                return "ALTELE";
            }




            // 🔹 4️⃣ Procesăm produsele și învățăm AI-ul
            var produse = new List<(string desc, decimal suma, string cat)>();

            foreach (var item in items)
            {
                var obj = item?["valueObject"];
                string desc = obj?["Description"]?["valueString"]?.ToString() ?? "(fără descriere)";
                decimal? total = obj?["TotalPrice"]?["valueNumber"]?.GetValue<decimal?>();

                if (total == null || total <= 0 || string.IsNullOrWhiteSpace(desc) || desc.Length < 3)
                    continue;

                string keyword = desc.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                                     .FirstOrDefault()?.ToLower() ?? "";

                var learned = _context.OcrKnowledge.AsNoTracking().FirstOrDefault(k => k.Keyword == keyword);
                var existent = _context.TranzactiiING.AsNoTracking()
                                  .FirstOrDefault(t => t.Detalii != null && t.Detalii.ToLower().Contains(keyword));

                string cat = learned?.Categorie ?? existent?.Categorie ?? DetectCategorie(desc);

                // 🧠 învățare automată
                // 🧠 învățare automată
                if (!string.IsNullOrEmpty(keyword))
                {
                    // Reguli speciale (manuale)
                    if (keyword.Contains("chips"))
                        cat = "MANCARE";
                    else if (keyword.Contains("sare"))
                        cat = "INGREDIENTE";

                    var existing = _context.OcrKnowledge.FirstOrDefault(k => k.Keyword == keyword);

                    if (existing == null)
                    {
                        // dacă nu există, îl adăugăm cu categoria detectată (inclusiv regulile de mai sus)
                        _context.OcrKnowledge.Add(new OcrKnowledge
                        {
                            Keyword = keyword,
                            Categorie = cat,
                            Confidence = 1
                        });
                    }
                    else
                    {
                        // dacă există deja — verificăm categoria
                        if (existing.Categorie != cat)
                        {
                            // dacă regula manuală spune altceva, o forțăm o singură dată
                            if ((keyword.Contains("chips") && cat == "MANCARE") ||
                                (keyword.Contains("sare") && cat == "INGREDIENTE"))
                            {
                                existing.Categorie = cat;
                                existing.Confidence = 10; // bonus mare, ca să nu o mai schimbe ușor
                            }
                            else
                            {
                                // comportament normal (AI generic)
                                existing.Categorie = cat;
                                existing.Confidence = Math.Max(1, existing.Confidence - 1);
                            }
                        }
                        else
                        {
                            // dacă e aceeași categorie, creștem încrederea
                            existing.Confidence++;
                        }
                    }
                }


                produse.Add((desc, total.Value, cat));
            }

            await _context.SaveChangesAsync();

            // 🔹 5️⃣ Grupăm rezultatele
            // 🔹 5️⃣ Grupăm rezultatele
            var grupuri = produse
                .Where(p => !string.Equals(p.cat, "DE-ALE STATULUI", StringComparison.OrdinalIgnoreCase))
                .GroupBy(p => p.cat)
                .Select(g => new
                {
                    categorie = g.Key,
                    total = g.Sum(x => x.suma),
                    produse = g.Select(x => x.desc).ToList()
                })
                .ToList();

            // 🔹 Calcul suplimentar pentru total corect
            decimal totalCalc = produse.Sum(p => p.suma);
            decimal difference = Math.Round((totalOcr ?? 0) - totalCalc, 2);

            // 🔹 Adăugăm automat linia PROMOTIE / DISCOUNT dacă există diferență
            if (Math.Abs(difference) > 0.05m)
            {
                grupuri.Add(new
                {
                    categorie = "PROMOTIE / DISCOUNT",
                    total = difference,
                    produse = new List<string> { $"Ajustare automată (-{Math.Abs(difference)} lei)" }
                });

                // Ajustăm totalul calculat pentru a se potrivi exact cu totalOcr
                totalCalc += difference;
                difference = 0;
            }

            // 🔹 Log complet
            Console.WriteLine("------------------------------------------------");
            Console.WriteLine($"✅ OCR finalizat: {grupuri.Count} categorii detectate");
            Console.WriteLine($"🧾 Total OCR Azure: {totalOcr}");
            Console.WriteLine($"📦 Total calculat (cu promo): {totalCalc}");
            Console.WriteLine($"📉 Diferență finală: {difference}");
            Console.WriteLine("------------------------------------------------");

            // 🔹 Return complet pentru frontend (Angular)
            return Ok(new
            {
                success = true,
                totalParent,
                totalOcr = totalCalc,
                difference = Math.Round((totalOcr ?? 0) - totalCalc, 2),
                grupuri
            });


        }
        catch (Exception ex)
        {
            Console.WriteLine("🔥 EROARE în AttachOcr:");
            Console.WriteLine(ex.ToString());
            return StatusCode(500, new
            {
                success = false,
                message = "Eroare internă OCR",
                details = ex.Message
            });
        }
    }



    [HttpGet("raport")]
    public IActionResult GetRaport([FromQuery] int days = 7)
    {
        var dataLimita = DateTime.Now.AddDays(-days);

        var raport = _context.TranzactiiING
            .Where(t => t.DataTranzactie >= dataLimita)
            .GroupBy(t => t.Categorie)
            .Select(g => new {
                Categorie = g.Key,
                Total = g.Sum(x => x.Suma)
            })
            .OrderByDescending(r => r.Total)
            .ToList();

        return Ok(raport);
    }


    /*

    //IMPORT LOCAL  
    
    [HttpPost("import-csv")]
    public IActionResult ImportCsv([FromBody] ImportRequest req)
    {
        try
        {
            Console.WriteLine("🔥🔥🔥 ImportCsv() A FOST APELAT 🔥🔥🔥");
            string sursa = req.Sursa?.ToUpperInvariant() ?? "NECUNOSCUT";
            string folderPath = @"G:\My Drive\DriveSyncFiles";

            if (!Directory.Exists(folderPath))
                return NotFound("Folderul CSV/PDF nu există.");

            string? lastFile = sursa switch
            {
                "PLUXEE" => Directory.GetFiles(folderPath, "*.pdf")
                                     .OrderByDescending(f => System.IO.File.GetCreationTime(f))
                                     .FirstOrDefault(),

                "ING" => Directory.GetFiles(folderPath, "*.csv")
                                  .OrderByDescending(f => System.IO.File.GetCreationTime(f))
                                  .FirstOrDefault(),

                _ => null
            };

            if (string.IsNullOrEmpty(lastFile))
                return NotFound($"Nu am găsit fișier pentru sursa {sursa}.");

            Console.WriteLine($"📂 Import {sursa} din {Path.GetFileName(lastFile)}");

            if (sursa == "ING")
            {
                var parser = new CsvIngParser(_context);
                parser.ImportFromCsv(lastFile,sursa);
                if (req.AutoSplit)
                    parser.AutoSplitSpecialTransactions();
            }
            else if (sursa == "PLUXEE")
            {
                var parser = new PluxeePdfParser_OLD(_context);
                parser.ImportFromPdf(lastFile, sursa);
            }

            _context.SaveChanges();
            return Ok(new { success = true, message = $"✅ Import {sursa} finalizat cu succes!" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"🔥 Eroare import {req.Sursa}: {ex.Message}");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
    */



    [HttpPost("import-csv")]
    public IActionResult ImportCsv([FromBody] ImportRequest req)
    {
        try
        {
            Console.WriteLine("🔥🔥🔥 ImportCsv() A FOST APELAT 🔥🔥🔥");
            string sursa = req.Sursa?.ToUpperInvariant() ?? "NECUNOSCUT";
            Console.WriteLine($"📦 PRIMIT JSON: {JsonSerializer.Serialize(req)}");
            Console.WriteLine($"🎯 După normalizare: sursa = '{sursa}'");

            // ============================================================
            // 🔹 1️⃣ Dacă lipsesc cheile Google, fallback automat la local
            // ============================================================
            var googleSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET_JSON");
            var googleToken = Environment.GetEnvironmentVariable("GOOGLE_TOKEN_JSON");
            var folderId = Environment.GetEnvironmentVariable("GOOGLE_DRIVE_FOLDER_ID");

            bool useGoogle = !string.IsNullOrEmpty(googleSecret) &&
                             !string.IsNullOrEmpty(googleToken) &&
                             !string.IsNullOrEmpty(folderId);

            string filePath = null;

            // ============================================================
            // 🔹 2️⃣ Alegem sursa de fișier (Google sau local fallback)
            // ============================================================
            if (useGoogle)
            {
                Console.WriteLine("☁️ Mod Google Drive activ — încerc să descarc fișierul...");
                var drive = new GoogleDriveService();

                if (sursa == "ING")
                    filePath = drive.DownloadLatestCsv(folderId);
                else if (sursa == "PLUXEE")
                    filePath = drive.DownloadLatestPdf(folderId);
            }
            else
            {
                Console.WriteLine("💾 Mod LOCAL fallback — lipsesc cheile Google, citesc din folder local.");
                string folderPath = @"G:\My Drive\DriveSyncFiles";

                if (!Directory.Exists(folderPath))
                    return NotFound("Folderul CSV/PDF local nu există.");

                filePath = sursa switch
                {
                    "PLUXEE" => Directory.GetFiles(folderPath, "*.pdf")
                                         .OrderByDescending(f => System.IO.File.GetCreationTime(f))
                                         .FirstOrDefault(),

                    "ING" => Directory.GetFiles(folderPath, "*.csv")
                                       .OrderByDescending(f => System.IO.File.GetCreationTime(f))
                                       .FirstOrDefault(),

                    _ => null
                };
            }

            if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
            {
                Console.WriteLine($"⚠️ Nu am găsit fișier pentru {sursa}");
                return NotFound($"❌ Nu am găsit fișierul pentru sursa {sursa}.");
            }

            Console.WriteLine($"📂 Se importă fișierul: {filePath}");

            // ============================================================
            // 🔹 3️⃣ ING — CSV import
            // ============================================================
            if (sursa == "ING")
            {
                var parser = new CsvIngParser(_context);
                parser.ImportFromCsv(filePath, sursa);

                if (req.AutoSplit)
                    parser.AutoSplitSpecialTransactions();

                _context.SaveChanges();
                Console.WriteLine("✅ Import ING finalizat cu succes!");
            }

            // ============================================================
            // 🔹 4️⃣ PLUXEE — PDF import + anti-dublură
            // ============================================================
            else if (sursa == "PLUXEE")
            {
                Console.WriteLine("🚀 Începem importul PDF PLUXEE...");
                var tranzactii = CITIREPDFPLUXEE.PluxeePdfReader.Parse(filePath);

                if (tranzactii == null || tranzactii.Count == 0)
                {
                    Console.WriteLine("⚠️ PDF gol sau format necunoscut.");
                    return Ok(new { success = false, message = "PDF gol sau format necunoscut." });
                }

                foreach (var t in tranzactii)
                {
                    t.SursaCard = "PLUXEE";
                    t.EsteCredit = false;
                    t.TipTranzactie ??= "Cumparare POS";
                    t.Categorie ??= "Tranzactie Pluxee";
                    t.Detalii ??= "(import automat PDF)";
                }

                // 🔹 Colectăm cheile existente (anti-duplicat)
                var existingKeys = new HashSet<string>(
                    _context.TranzactiiING
                        .Where(t => t.SursaCard == "PLUXEE")
                        .Select(t => $"{t.DataTranzactie:yyyyMMdd}|{Math.Abs(t.Suma ?? 0):0.00}|{(t.Merchant ?? "").Trim().ToUpperInvariant()}")
                        .ToList()
                );

                var historyKeys = new HashSet<string>(
                    _context.ImportHistory.Select(h => h.UniqueKey).ToList()
                );

                int adaugate = 0;

                foreach (var t in tranzactii)
                {
                    var key = $"{t.DataTranzactie:yyyyMMdd}|{Math.Abs(t.Suma ?? 0):0.00}|{(t.Merchant ?? "").Trim().ToUpperInvariant()}";

                    if (existingKeys.Contains(key) || historyKeys.Contains(key))
                    {
                        Console.WriteLine($"🧱 Dublură PLUXEE ignorată: {t.Merchant} {t.Suma:0.00}");
                        continue;
                    }

                    _context.TranzactiiING.Add(t);
                    _context.ImportHistory.Add(new ImportHistory
                    {
                        Sursa = "PLUXEE",
                        UniqueKey = key,
                        CreatedAt = DateTime.Now
                    });

                    existingKeys.Add(key);
                    historyKeys.Add(key);
                    adaugate++;
                }

                _context.SaveChanges();
                Console.WriteLine($"✅ Import PLUXEE finalizat — {adaugate} tranzacții noi salvate.");
            }

            return Ok(new { success = true, message = $"✅ Import {sursa} finalizat cu succes!" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"🔥 Eroare import {req.Sursa}: {ex.Message}");
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }






    public class ImportRequest
        {
            public string? Sursa { get; set; }
            public bool AutoSplit { get; set; }
        }


    // ======================================================
    // 🔹 Confirm OCR + întărire AI
    // ======================================================
    [HttpPost("confirm-ocr")]
    public IActionResult ConfirmOcr([FromBody] ConfirmOcrDto dto)
    {
        var parent = _context.TranzactiiING.FirstOrDefault(t => t.Id == dto.ParentId);
        if (parent == null)
            return NotFound($"Tranzacția {dto.ParentId} nu există");

        decimal soldParinte = parent.SoldFinal ?? 0m;
        decimal soldCurent = soldParinte;

        var newChildren = new List<TranzactiiCommon.Models.TranzactieING>();

        foreach (var g in dto.Grupuri)
        {
            string produseList = (g.Produse != null && g.Produse.Any())
                ? string.Join(", ", g.Produse)
                : "(fără produse OCR)";

            var copil = new TranzactiiCommon.Models.TranzactieING
            {
                DataTranzactie = parent.DataTranzactie,
                TipTranzactie = parent.TipTranzactie,
                EsteCredit = parent.EsteCredit,
                SursaCard = parent.SursaCard,
                Merchant = parent.Merchant,
                Categorie = g.Categorie,
                Detalii = $"🧾 Bon OCR: {g.Categorie} → {produseList}",
                Suma = g.Total,
                ParentId = parent.Id,
                SoldFinal = soldCurent
            };

            soldCurent -= g.Total;
            newChildren.Add(copil);

            // 🧠 întărim AI-ul
            var learned = _context.OcrKnowledge.FirstOrDefault(k => k.Categorie == g.Categorie);
            if (learned == null)
            {
                _context.OcrKnowledge.Add(new OcrKnowledge
                {
                    Keyword = g.Categorie.ToLower(),
                    Categorie = g.Categorie,
                    Confidence = 2
                });
            }
            else
            {
                learned.Confidence++;
            }
        }

        // ✅ AICI adăugăm efectiv copiii în DB
        _context.TranzactiiING.AddRange(newChildren);

        // 🔹 marcăm părintele ca procesat vizual
        parent.EsteProcesata = true;
        if (string.IsNullOrEmpty(parent.Detalii))
            parent.Detalii = "🔁 AutoSplit OCR";
        else if (!parent.Detalii.Contains("🔁"))
            parent.Detalii += " | 🔁 AutoSplit OCR";

        _context.SaveChanges();

        Console.WriteLine($"🤖 OCR Confirm: Parent {parent.Id} → {newChildren.Count} copii, sold inițial {soldParinte:0.00}");

        return Ok(new
        {
            message = "✅ Grupurile OCR au fost salvate și tranzacția marcată ca procesată.",
            newIds = newChildren.Select(c => c.Id).ToList(),
            soldInitial = soldParinte,
            soldFinalUltimCopil = soldCurent
        });
    }



    // ======================================================
    // 🔹 DELETE individual
    // ======================================================
    [HttpDelete("{id:int}")]
    public IActionResult DeleteById(int id)
    {
        var tranzactie = _context.TranzactiiING.FirstOrDefault(t => t.Id == id);
        if (tranzactie == null)
            return NotFound($"Tranzacția {id} nu există.");

        _context.TranzactiiING.Remove(tranzactie);
        _context.SaveChanges();

        Console.WriteLine($"🗑️ Tranzacția {id} ștearsă definitiv din DB.");
        return Ok(new { message = $"Tranzacția {id} a fost ștearsă." });
    }

    // ======================================================
    // 🔹 GET după ID
    // ======================================================
    [HttpGet("{id:int}")]

    public IActionResult GetById(int id)
    {
        var tranzactie = _context.TranzactiiING.FirstOrDefault(t => t.Id == id);
        if (tranzactie == null) return NotFound();
        return Ok(tranzactie);
    }

    // ======================================================
    // 🔹 Update generic (pentru edit inline)
    // ======================================================
    [HttpPut("update-inline/{id:int}")]
    public IActionResult UpdateInline(int id, [FromBody] JsonElement update)
    {
        var tranz = _context.TranzactiiING.FirstOrDefault(t => t.Id == id);
        if (tranz == null) return NotFound();

        if (update.TryGetProperty("suma", out var suma))
        {
            if (suma.ValueKind == JsonValueKind.Number)
                tranz.Suma = suma.GetDecimal();
            else if (suma.ValueKind == JsonValueKind.String && decimal.TryParse(suma.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var val))
                tranz.Suma = val;
        }

        if (update.TryGetProperty("merchant", out var merchant) && merchant.ValueKind == JsonValueKind.String)
            tranz.Merchant = merchant.GetString();

        if (update.TryGetProperty("categorie", out var categorie) && categorie.ValueKind == JsonValueKind.String)
            tranz.Categorie = categorie.GetString();
        if (update.TryGetProperty("sursaCard", out var sursaCard) && sursaCard.ValueKind == JsonValueKind.String)
            tranz.SursaCard = sursaCard.GetString();


        if (update.TryGetProperty("soldFinal", out var sold))
        {
            if (sold.ValueKind == JsonValueKind.Number)
                tranz.SoldFinal = sold.GetDecimal();
            else if (sold.ValueKind == JsonValueKind.String && decimal.TryParse(sold.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var val2))
                tranz.SoldFinal = val2;
        }

        _context.SaveChanges();
        return Ok(tranz);
    }



    // ======================================================
    // 🔹 Update categorie (single)
    // ======================================================
    [HttpPut("{id:int}")]

    public IActionResult UpdateCategorie(int id, [FromBody] UpdateCategorieDto dto)
    {
        var tranz = _context.TranzactiiING.FirstOrDefault(t => t.Id == id);
        if (tranz == null) return NotFound();
        tranz.Categorie = dto.Categorie;
        tranz.NrTigari = dto.NrTigari;
        _context.SaveChanges();
        return Ok(tranz);
    }

    public class UpdateCategorieDto
    {
        public string? Categorie { get; set; }
        public int? NrTigari { get; set; }
    }

    // ======================================================
    // 🔹 Bulk update categorie
    // ======================================================
    public class BulkUpdateDto
    {
        public string? Categorie { get; set; }
        public List<int> Ids { get; set; } = new();
    }

    [HttpGet("categorie/filtru/{numeCategorie}")]
    public IActionResult GetByCategorieFiltru(string numeCategorie, [FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        var tranzactii = _context.TranzactiiING
            .Where(t => t.Categorie == numeCategorie)
            .Where(t => !start.HasValue || t.DataTranzactie >= start)
            .Where(t => !end.HasValue || t.DataTranzactie <= end)
            .OrderByDescending(t => t.DataTranzactie)
            .ToList();

        return Ok(tranzactii);
    }



    [HttpGet("categorie/{numeCategorie}")]
    public IActionResult GetByCategorie(string numeCategorie, [FromQuery] DateTime? start, [FromQuery] DateTime? end)
    {
        var tranzactii = _context.TranzactiiING
            .Where(t => t.Categorie == numeCategorie)
            .Where(t => !start.HasValue || t.DataTranzactie >= start)
            .Where(t => !end.HasValue || t.DataTranzactie <= end)
            .OrderByDescending(t => t.DataTranzactie)
            .ToList();

        return Ok(tranzactii);
    }




    [HttpPut("bulk-categorie")]
    public IActionResult BulkUpdateCategorie([FromBody] BulkUpdateDto dto)
    {
        if (dto.Categorie == null || dto.Ids.Count == 0)
            return BadRequest("Date invalide");

        var tranzactii = _context.TranzactiiING
                                 .Where(t => dto.Ids.Contains(t.Id))
                                 .ToList();

        if (!tranzactii.Any())
            return NotFound();

        tranzactii.ForEach(t => t.Categorie = dto.Categorie);
        _context.SaveChanges();

        return Ok(new { updated = tranzactii.Count });
    }

    // ======================================================
    // 🔹 Split tranzacție
    // ======================================================
    public class SplitRequestDto
    {
        public int ParentId { get; set; }
        public List<SplitItemDto> Splits { get; set; } = new();
    }

    public class SplitItemDto
    {
        public decimal Suma { get; set; }
        public string? Categorie { get; set; }
        public string? Detalii { get; set; }
    }

    [HttpPost("split")]
    public IActionResult SplitTranzactie([FromBody] SplitRequestDto dto)
    {
        var original = _context.TranzactiiING.FirstOrDefault(t => t.Id == dto.ParentId);
        if (original == null)
            return NotFound($"Tranzacția {dto.ParentId} nu există");

        if (dto.Splits == null || !dto.Splits.Any())
            return BadRequest("Trebuie specificate liniile de split");

        if (dto.Splits.Any(s => s.Suma <= 0))
            return BadRequest("Toate sumele din split trebuie să fie > 0");

        var origSum = original.Suma ?? 0m;
        var totalSplit = dto.Splits.Sum(i => i.Suma);
        if (totalSplit > origSum)
            return BadRequest("Sumele split depășesc valoarea tranzacției originale");

        using var tx = _context.Database.BeginTransaction();
        var newRows = new List<TranzactiiCommon.Models.TranzactieING>();

        foreach (var item in dto.Splits)
        {
            var clone = new TranzactiiCommon.Models.TranzactieING
            {
                DataTranzactie = original.DataTranzactie,
                TipTranzactie = original.TipTranzactie,
                EsteCredit = original.EsteCredit,
                SoldFinal = original.SoldFinal,
                DataDecontarii = original.DataDecontarii,
                NumarCard = original.NumarCard,
                Merchant = original.Merchant,
                DataAutorizarii = original.DataAutorizarii,
                NumarAutorizare = original.NumarAutorizare,
                Referinta = original.Referinta,
                Detalii = item.Detalii ?? original.Detalii,
                Categorie = item.Categorie ?? original.Categorie,
                Suma = item.Suma
            };

            newRows.Add(clone);
        }

        _context.TranzactiiING.AddRange(newRows);

        // ✅ Marchează originalul ca procesat, indiferent dacă îl ștergem sau nu
        original.EsteProcesata = true;

        if (string.IsNullOrEmpty(original.Detalii))
            original.Detalii = "🔒 locked";
        else if (!original.Detalii.Contains("🔒"))
            original.Detalii += " | 🔒 locked";


        if (totalSplit == origSum)
        {
            // 🔹 dacă split-ul acoperă toată suma, îl ștergem complet
            _context.TranzactiiING.Remove(original);
        }
        else
        {
            // 🔹 altfel îi scădem diferența rămasă
            original.Suma = origSum - totalSplit;
        }

        _context.SaveChanges();
        tx.Commit();

        return Ok(new
        {
            newIds = newRows.Select(r => r.Id).ToList(),
            message = "✅ Split efectuat, tranzacția originală marcată ca procesată."
        });
    }

    [HttpGet("totale-sursa")]
    public IActionResult GetTotalePeSurse()
    {
        // 🔹 Luăm tranzacțiile filtrate (excludem doar ce nu vrem)
        var tranzactii = _context.TranzactiiING
            .Where(t => t.TipTranzactie != null)
            .ToList();

        // 🔹 Grupăm pe sursă (ING / PLUXEE etc.)
        var rezultat = tranzactii
            .GroupBy(t => t.SursaCard?.ToUpper() ?? "NECUNOSCUT")
            .Select(g => new
            {
                sursa = g.Key,
                totalCheltuieli = g.Where(x =>
                    !x.EsteCredit &&
                    x.TipTranzactie != null &&
                    !x.TipTranzactie.Contains("TopUp") &&
                    !x.TipTranzactie.Contains("Incasare"))
                    .Sum(x => x.Suma ?? 0),

                totalVenituri = g.Where(x => x.EsteCredit)
                    .Sum(x => x.Suma ?? 0)
            })
            .ToList();

        return Ok(rezultat);
    }



    // ======================================================
    // 🔹 Adaugă copil individual (ex: diferență ambalaje/garanții)
    // ======================================================
    [HttpPost("adauga-copil")]
    public IActionResult AdaugaCopil([FromBody] TranzactiiCommon.Models.TranzactieING copil)
    {
        if (copil == null)
            return BadRequest("Obiectul copil este null.");

        // 🔹 Verificăm dacă parentId există
        if (copil.Referinta == null && copil.Merchant == null)
            return BadRequest("Lipsește identificarea părintelui (Referinta sau Merchant).");

        // 🔹 Dacă ai un câmp ParentId în tabel (îl poți adăuga ulterior)
        // var parent = _context.TranzactiiING.FirstOrDefault(t => t.Id == copil.ParentId);
        // if (parent == null) return NotFound($"Părintele {copil.ParentId} nu există");

        copil.Id = 0; // siguranță: lăsăm EF să-l genereze
        copil.Detalii = copil.Detalii ?? "(diferență automată ambalaje)";
        copil.Categorie ??= "ALTE (ambalaje/garantii)";
        copil.DataTranzactie ??= DateTime.Now;

        _context.TranzactiiING.Add(copil);
        _context.SaveChanges();

        Console.WriteLine($"➕ Copil adăugat: #{copil.Id} – {copil.Categorie} ({copil.Suma} lei)");

        return Ok(new
        {
            success = true,
            id = copil.Id,
            categorie = copil.Categorie,
            suma = copil.Suma
        });
    }



    public class ConfirmOcrDto
    {
        public int ParentId { get; set; }
        public List<OcrGroup> Grupuri { get; set; } = new();
    }

    public class OcrGroup
    {
        public string Categorie { get; set; } = "";
        public decimal Total { get; set; }

        // ✅ nou:
        public List<string>? Produse { get; set; } = new();
    }

    // ======================================================
    // 🔹 Ștergere în masă
    // ======================================================
    [HttpPost("bulk-delete")]
    public IActionResult BulkDelete([FromBody] List<int> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest("Nu au fost selectate tranzacții pentru ștergere.");

        var tranzactii = _context.TranzactiiING.Where(t => ids.Contains(t.Id)).ToList();
        if (!tranzactii.Any())
            return NotFound("Nu s-au găsit tranzacțiile specificate.");

        _context.TranzactiiING.RemoveRange(tranzactii);
        _context.SaveChanges();

        return Ok(new { deleted = tranzactii.Count });
    }
    [HttpPost]
    public IActionResult CreateTranzactie([FromBody] TranzactiiCommon.Models.TranzactieING tranzactie)
    {
        if (tranzactie == null)
            return BadRequest("Tranzacția este null.");

        tranzactie.Id = 0; // EF va genera ID-ul
        _context.TranzactiiING.Add(tranzactie);
        _context.SaveChanges();

        return Ok(tranzactie);
    }


    public class UpdateNrBeriDto
    {
        public int? NrBeri { get; set; }
    }

    [HttpPut("update-nrberi/{id:int}")]
    public IActionResult UpdateNrBeri(int id, [FromBody] UpdateNrBeriDto dto)
    {
        var tranz = _context.TranzactiiING.FirstOrDefault(t => t.Id == id);
        if (tranz == null)
            return NotFound($"Tranzacția {id} nu există");

        tranz.NrBeri = dto.NrBeri;
        _context.SaveChanges();

        return Ok(new { message = "✅ NrBeri actualizat" });
    }

    public class UpdateNrTigariDto
    {
        public int? NrTigari { get; set; }
    }



    [HttpPut("update-nrtigari/{id:int}")]
    public IActionResult UpdateNrTigari(int id, [FromBody] UpdateNrTigariDto dto)
    {
        var tranz = _context.TranzactiiING.FirstOrDefault(t => t.Id == id);
        if (tranz == null)
            return NotFound($"Tranzacția cu ID {id} nu există");

        tranz.NrTigari = dto.NrTigari;
        _context.SaveChanges();

        return Ok(new { message = "✅ NrTigari actualizat" });
    }


    [HttpPost("salveaza-pnl")]
    public IActionResult SalveazaPnl([FromBody] PnlModel model)
    {
        // 🔹 Căutăm dacă există deja P&L pentru acea lună, an și sursă
        var existing = _context.PnlLunar
            .FirstOrDefault(p => p.Luna == model.Luna && p.An == model.An && p.Sursa == model.Sursa);

        if (existing != null)
        {
            // 🔄 Actualizăm valorile existente
            existing.Venituri = model.Venituri;
            existing.Cheltuieli = model.Cheltuieli;
            existing.Profit = model.Profit;
            _context.PnlLunar.Update(existing);
        }
        else
        {
            // ➕ Creăm o înregistrare nouă
            _context.PnlLunar.Add(new PnlLunar
            {
                Luna = model.Luna,
                An = model.An,
                Sursa = model.Sursa,
                Venituri = model.Venituri,
                Cheltuieli = model.Cheltuieli,
                Profit = model.Profit
            });
        }

        _context.SaveChanges();
        return Ok(new { success = true });
    }

    [HttpGet("pnl/{an}")]
    public IActionResult GetPnlPeAn(int an)
    {
        // 🔹 Grupăm toate sursele (ING + PLUXEE + ALL)
        var data = _context.PnlLunar
            .Where(p => p.An == an)
            .GroupBy(p => p.Luna)
            .Select(g => new {
                Luna = g.Key,
                ProfitTotal = g.Sum(x => x.Profit),
                VenituriTotal = g.Sum(x => x.Venituri),
                CheltuieliTotal = g.Sum(x => x.Cheltuieli)
            })
            .OrderBy(x => x.Luna)
            .ToList();

        return Ok(data);
    }



    [HttpGet("pnl/{an:int}/{luna:int}")]
    public IActionResult GetPnlLunar(int an, int luna)
    {
        var lista = _context.PnlLunar
            .Where(p => p.An == an && p.Luna == luna)
            .Select(p => new {
                p.Id,
                p.Luna,
                p.An,
                p.Sursa,
                p.Venituri,
                p.Cheltuieli,
                p.Profit
            })
            .ToList();

        if (!lista.Any())
            return NotFound();

        return Ok(lista);
    }





}
