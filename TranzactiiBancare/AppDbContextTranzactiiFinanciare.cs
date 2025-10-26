using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System;
using TranzactiiBancare.Models;
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
    public DbSet<PnlLunar> PnlLunar { get; set; }


    // ✅ Fix global pentru conversia DateTime la UTC (PostgreSQL-friendly)
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Forțăm toate câmpurile DateTime / DateTime? să fie UTC
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(
                        new ValueConverter<DateTime, DateTime>(
                            v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
                            v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
                    );
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(
                        new ValueConverter<DateTime?, DateTime?>(
                            v => v.HasValue
                                ? (v.Value.Kind == DateTimeKind.Utc ? v.Value : v.Value.ToUniversalTime())
                                : v,
                            v => v.HasValue
                                ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)
                                : v)
                    );
                }
            }
        }
    }
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
