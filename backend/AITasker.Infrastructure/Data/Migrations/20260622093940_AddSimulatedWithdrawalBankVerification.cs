using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSimulatedWithdrawalBankVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankCode",
                table: "WithdrawalRequests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BankVerificationMessage",
                table: "WithdrawalRequests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankVerificationStatus",
                table: "WithdrawalRequests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "NOT_VERIFIED");

            migrationBuilder.AddColumn<decimal>(
                name: "FeeAmount",
                table: "WithdrawalRequests",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "NetAmount",
                table: "WithdrawalRequests",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PayoutReferenceCode",
                table: "WithdrawalRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WithdrawalRequests_BankVerificationStatus",
                table: "WithdrawalRequests",
                column: "BankVerificationStatus");

            migrationBuilder.CreateIndex(
                name: "IX_WithdrawalRequests_PayoutReferenceCode",
                table: "WithdrawalRequests",
                column: "PayoutReferenceCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WithdrawalRequests_BankVerificationStatus",
                table: "WithdrawalRequests");

            migrationBuilder.DropIndex(
                name: "IX_WithdrawalRequests_PayoutReferenceCode",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "BankCode",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "BankVerificationMessage",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "BankVerificationStatus",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "FeeAmount",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "NetAmount",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayoutReferenceCode",
                table: "WithdrawalRequests");
        }
    }
}
