using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPayOsPayoutWithdrawal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankBin",
                table: "WithdrawalRequests",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FailureReason",
                table: "WithdrawalRequests",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayOsApprovalState",
                table: "WithdrawalRequests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayOsIdempotencyKey",
                table: "WithdrawalRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayOsPayoutId",
                table: "WithdrawalRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayOsRawResponse",
                table: "WithdrawalRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayOsReferenceId",
                table: "WithdrawalRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayOsTransactionId",
                table: "WithdrawalRequests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayOsTransactionState",
                table: "WithdrawalRequests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PayoutConfirmedAt",
                table: "WithdrawalRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayoutProvider",
                table: "WithdrawalRequests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PayoutRequestedAt",
                table: "WithdrawalRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WithdrawalRequests_PayOsIdempotencyKey",
                table: "WithdrawalRequests",
                column: "PayOsIdempotencyKey",
                unique: true,
                filter: "[PayOsIdempotencyKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WithdrawalRequests_PayOsPayoutId",
                table: "WithdrawalRequests",
                column: "PayOsPayoutId",
                unique: true,
                filter: "[PayOsPayoutId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WithdrawalRequests_PayOsReferenceId",
                table: "WithdrawalRequests",
                column: "PayOsReferenceId",
                unique: true,
                filter: "[PayOsReferenceId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_WithdrawalRequests_PayoutProvider",
                table: "WithdrawalRequests",
                column: "PayoutProvider");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WithdrawalRequests_PayOsIdempotencyKey",
                table: "WithdrawalRequests");

            migrationBuilder.DropIndex(
                name: "IX_WithdrawalRequests_PayOsPayoutId",
                table: "WithdrawalRequests");

            migrationBuilder.DropIndex(
                name: "IX_WithdrawalRequests_PayOsReferenceId",
                table: "WithdrawalRequests");

            migrationBuilder.DropIndex(
                name: "IX_WithdrawalRequests_PayoutProvider",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "BankBin",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "FailureReason",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayOsApprovalState",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayOsIdempotencyKey",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayOsPayoutId",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayOsRawResponse",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayOsReferenceId",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayOsTransactionId",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayOsTransactionState",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayoutConfirmedAt",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayoutProvider",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayoutRequestedAt",
                table: "WithdrawalRequests");
        }
    }
}
