using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using CITIREPDFPLUXEE;

namespace CITIREPDFPLUXEE
{
    public class PluxeePdfParser
    {
        //private readonly AppDbContextTranzactiiFinanciare _context;

        // după:
        public PluxeePdfParser(dynamic context)
        {
            //_context = context;
        }


        public void ImportFromPdf(string filePath, string sursa)
        {
            var tranzactii = PluxeePdfReader.Parse(filePath); // 👈 metoda ta din programul PDF
            int adaugate = 0;

            foreach (var t in tranzactii)
            {
                var tx = new TranzactieING
                {
                    DataTranzactie = t.DataTranzactie,
                    Merchant = t.Merchant,
                    TipTranzactie = t.TipTranzactie,
                    Suma = t.Suma,
                    EsteCredit = t.EsteCredit,
                    SursaCard = sursa,
                    Categorie = t.EsteCredit ? "VENIT" : "CHELTUIALĂ"
                };

                //_context.TranzactiiING.Add(tx);
                adaugate++;
            }

            //_context.SaveChanges();
            Console.WriteLine($"✅ Import PDF {sursa} complet — {adaugate} tranzacții adăugate.");
        }
    }
}