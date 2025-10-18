using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TranzactiiBancare.Migrations
{
    /// <inheritdoc />
    public partial class AddOcrKnowledgeTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OcrKnowledge",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Keyword = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Categorie = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Confidence = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OcrKnowledge", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TranzactiiING",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DataTranzactie = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TipTranzactie = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Suma = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    EsteCredit = table.Column<bool>(type: "bit", nullable: false),
                    SoldFinal = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    DataDecontarii = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NumarCard = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Merchant = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DataAutorizarii = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NumarAutorizare = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Referinta = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Categorie = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Detalii = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SursaCard = table.Column<string>(type: "nvarchar(max)", nullable: true)
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
                name: "OcrKnowledge");

            migrationBuilder.DropTable(
                name: "TranzactiiING");
        }
    }
}
