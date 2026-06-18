using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDepositOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DepositOrders",
                columns: table => new
                {
                    DepositOrderId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    OrderCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PaymentContent = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    QrContent = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ProviderReference = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepositOrders", x => x.DepositOrderId);
                    table.CheckConstraint("CK_DepositOrders_Amount", "[Amount] > 0");
                    table.CheckConstraint("CK_DepositOrders_Status", "[Status] IN ('PENDING','PAID','EXPIRED','CANCELLED')");
                    table.ForeignKey(
                        name: "FK_DepositOrders_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DepositOrders_OrderCode",
                table: "DepositOrders",
                column: "OrderCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DepositOrders_Status",
                table: "DepositOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DepositOrders_UserId",
                table: "DepositOrders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DepositOrders_UserId_Status_CreatedAt",
                table: "DepositOrders",
                columns: new[] { "UserId", "Status", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DepositOrders");
        }
    }
}
