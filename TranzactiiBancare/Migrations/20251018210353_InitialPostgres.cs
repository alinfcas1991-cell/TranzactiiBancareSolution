using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TranzactiiBancare.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImportHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Sursa = table.Column<string>(type: "text", nullable: false),
                    UniqueKey = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportHistory", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OcrKnowledge",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Keyword = table.Column<string>(type: "text", nullable: false),
                    Categorie = table.Column<string>(type: "text", nullable: false),
                    Confidence = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OcrKnowledge", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TranzactiiING",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DataTranzactie = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TipTranzactie = table.Column<string>(type: "text", nullable: true),
                    Suma = table.Column<decimal>(type: "numeric", nullable: true),
                    EsteCredit = table.Column<bool>(type: "boolean", nullable: false),
                    SoldFinal = table.Column<decimal>(type: "numeric", nullable: true),
                    DataDecontarii = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NumarCard = table.Column<string>(type: "text", nullable: true),
                    Merchant = table.Column<string>(type: "text", nullable: true),
                    DataAutorizarii = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NumarAutorizare = table.Column<string>(type: "text", nullable: true),
                    Referinta = table.Column<string>(type: "text", nullable: true),
                    Categorie = table.Column<string>(type: "text", nullable: true),
                    Detalii = table.Column<string>(type: "text", nullable: true),
                    SursaCard = table.Column<string>(type: "text", nullable: true),
                    ParentId = table.Column<int>(type: "integer", nullable: true),
                    NrBeri = table.Column<int>(type: "integer", nullable: true),
                    NrTigari = table.Column<int>(type: "integer", nullable: true),
                    EsteProcesata = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TranzactiiING", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportHistory");

            migrationBuilder.DropTable(
                name: "OcrKnowledge");

            migrationBuilder.DropTable(
                name: "TranzactiiING");
        }
    }
}
