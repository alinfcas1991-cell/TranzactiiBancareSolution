using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TranzactiiBancare.Migrations
{
    public partial class AddOnlyOcrKnowledgeTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OcrKnowledge",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Keyword = table.Column<string>(nullable: false),
                    Categorie = table.Column<string>(nullable: false),
                    Confidence = table.Column<int>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OcrKnowledge", x => x.Id);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OcrKnowledge");
        }
    }
}
