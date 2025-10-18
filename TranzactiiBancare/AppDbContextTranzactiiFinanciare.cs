using Microsoft.EntityFrameworkCore;
using TranzactiiCommon.Models;

public class AppDbContextTranzactiiFinanciare : DbContext
{
    public AppDbContextTranzactiiFinanciare(DbContextOptions<AppDbContextTranzactiiFinanciare> options)
        : base(options)
    { }

    public DbSet<TranzactiiCommon.Models.TranzactieING> TranzactiiING { get; set; }


    // 🧠 noua tabelă care va memora ce a învățat AI-ul
    public DbSet<OcrKnowledge> OcrKnowledge { get; set; }
    public DbSet<ImportHistory> ImportHistory { get; set; }

}

public class OcrKnowledge
{
    public int Id { get; set; }

    // ex: "tymbark", "ulei", "napolitana"
    public string Keyword { get; set; } = "";

    // ex: "SUC", "MANCARE", "INGREDIENTE"
    public string Categorie { get; set; } = "";

    // cât de des a fost confirmată această asociere
    public int Confidence { get; set; } = 1;
}
