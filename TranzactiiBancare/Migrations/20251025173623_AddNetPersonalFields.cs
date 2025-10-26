using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TranzactiiBancare.Migrations
{
    /// <inheritdoc />
    public partial class AddNetPersonalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EstePersonal",
                table: "TranzactiiING",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "NetPersonal",
                table: "TranzactiiING",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstePersonal",
                table: "TranzactiiING");

            migrationBuilder.DropColumn(
                name: "NetPersonal",
                table: "TranzactiiING");
        }
    }
}
