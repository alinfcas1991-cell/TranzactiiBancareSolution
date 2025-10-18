using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using TranzactiiCommon.Models;
using System.Collections.Generic;
using CITIREPDFPLUXEE;


namespace CITIREPDFPLUXEE
{
    public class PluxeePdfParser_OLD
    {
        private readonly AppDbContextTranzactiiFinanciare _context;

        public PluxeePdfParser_OLD(AppDbContextTranzactiiFinanciare context)
        {
            _context = context;
        }

        public void ImportFromPdf(string filePath, string sursa)
        {
            var tranzactii = PluxeePdfReader.Parse(filePath); // 👈 parserul PDF existent
            if (tranzactii == null || tranzactii.Count == 0)
            {
                Console.WriteLine($"⚠️ Nicio tranzacție detectată în {filePath}");
                return;
            }

            // =====================================================
            // 🔹 Extragem cheile istorice din ImportHistory
            // =====================================================
            var historyKeys = new HashSet<string>(
                _context.ImportHistory.Select(h => h.UniqueKey).ToList()
            );

            int adaugate = 0;

            foreach (var t in tranzactii)
            {
                // 🔹 Construim cheia unică globală (la fel ca ING)
                string key = $"{sursa}-{t.DataTranzactie:yyyyMMdd}-{t.TipTranzactie}-{t.Suma:0.00}-{t.Merchant}".ToUpper();

                // 🔹 Verificăm dacă există în istoric
                if (historyKeys.Contains(key))
                {
                    Console.WriteLine($"🧱 Dublură ignorată: {key}");
                    continue;
                }

                // ✅ Creăm obiectul tranzacției
                var tx = new TranzactiiCommon.Models.TranzactieING
                {
                    DataTranzactie = t.DataTranzactie,
                    TipTranzactie = t.TipTranzactie,
                    Merchant = t.Merchant,
                    Suma = t.Suma,
                    EsteCredit = t.EsteCredit,
                    SursaCard = sursa,
                    Categorie = t.EsteCredit ? "VENIT" : "CHELTUIALĂ",
                    Detalii = $"Importat automat din PDF {sursa}"
                };

                _context.TranzactiiING.Add(tx);

                // ✅ Adăugăm în istoric
                _context.ImportHistory.Add(new ImportHistory
                {
                    Sursa = sursa,
                    UniqueKey = key,
                    CreatedAt = DateTime.Now
                });

                historyKeys.Add(key);
                adaugate++;
            }

            _context.SaveChanges();
            Console.WriteLine($"✅ Import PDF {sursa} complet — {adaugate} tranzacții adăugate.");
        }
    }
}
