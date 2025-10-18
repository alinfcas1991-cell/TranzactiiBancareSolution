using System;

namespace CITIREPDFPLUXEE
{
    internal class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== Test parser PDF Pluxee ===");

            string folderPath = @"G:\My Drive\DriveSyncFiles";
            string? lastPdf = Directory.GetFiles(folderPath, "*.pdf")
                                       .OrderByDescending(File.GetCreationTime)
                                       .FirstOrDefault();

            if (lastPdf == null)
            {
                Console.WriteLine("❌ Niciun fișier PDF găsit!");
                return;
            }

            Console.WriteLine($"📂 Fișier: {Path.GetFileName(lastPdf)}\n");

            var tranzactii = PluxeePdfReader.Parse(lastPdf);

            foreach (var t in tranzactii)
                Console.WriteLine($"{t.DataTranzactie:dd/MM/yyyy HH:mm:ss} | {t.Merchant} | {t.TipTranzactie} | {t.Suma:0.00}");

            Console.WriteLine($"\n✅ Total tranzacții: {tranzactii.Count}");
        }
    }
}
