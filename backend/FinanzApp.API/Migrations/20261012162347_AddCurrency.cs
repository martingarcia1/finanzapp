using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinanzApp.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Wallets",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "ARS");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Transactions",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "ARS");

            migrationBuilder.AddColumn<decimal>(
                name: "ExchangeRate",
                table: "Transactions",
                type: "numeric(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "SavingsGoals",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "ARS");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Debts",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "ARS");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Wallets");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "ExchangeRate",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "SavingsGoals");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Debts");
        }
    }
}
