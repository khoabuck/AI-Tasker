using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformWalletLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlatformWallets",
                columns: table => new
                {
                    PlatformWalletId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WalletCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AvailableBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalRevenue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PlatformFeeRevenue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    WithdrawalFeeRevenue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AdjustmentBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformWallets", x => x.PlatformWalletId);
                    table.CheckConstraint("CK_PlatformWallets_Balances", "[AvailableBalance] >= 0 AND [TotalRevenue] >= 0 AND [PlatformFeeRevenue] >= 0 AND [WithdrawalFeeRevenue] >= 0");
                });

            migrationBuilder.CreateTable(
                name: "PlatformTransactions",
                columns: table => new
                {
                    PlatformTransactionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlatformWalletId = table.Column<int>(type: "int", nullable: false),
                    ProjectId = table.Column<int>(type: "int", nullable: true),
                    ContractId = table.Column<int>(type: "int", nullable: true),
                    WithdrawalRequestId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ReferenceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformTransactions", x => x.PlatformTransactionId);
                    table.CheckConstraint("CK_PlatformTransactions_Amount", "[Amount] > 0");
                    table.ForeignKey(
                        name: "FK_PlatformTransactions_PlatformWallets_PlatformWalletId",
                        column: x => x.PlatformWalletId,
                        principalTable: "PlatformWallets",
                        principalColumn: "PlatformWalletId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "PlatformWallets",
                columns: new[] { "PlatformWalletId", "AdjustmentBalance", "AvailableBalance", "CreatedAt", "PlatformFeeRevenue", "TotalRevenue", "UpdatedAt", "WalletCode", "WithdrawalFeeRevenue" },
                values: new object[] { 1, 0m, 0m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 0m, 0m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "MAIN", 0m });

            migrationBuilder.CreateIndex(
                name: "IX_PlatformTransactions_ContractId",
                table: "PlatformTransactions",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformTransactions_PlatformWalletId",
                table: "PlatformTransactions",
                column: "PlatformWalletId");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformTransactions_ProjectId",
                table: "PlatformTransactions",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformTransactions_ReferenceId",
                table: "PlatformTransactions",
                column: "ReferenceId");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformTransactions_Status",
                table: "PlatformTransactions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformTransactions_Type",
                table: "PlatformTransactions",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformTransactions_WithdrawalRequestId",
                table: "PlatformTransactions",
                column: "WithdrawalRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformWallets_WalletCode",
                table: "PlatformWallets",
                column: "WalletCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlatformTransactions");

            migrationBuilder.DropTable(
                name: "PlatformWallets");
        }
    }
}
