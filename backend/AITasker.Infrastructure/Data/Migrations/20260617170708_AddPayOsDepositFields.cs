using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPayOsDepositFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CancelUrl",
                table: "DepositOrders",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckoutUrl",
                table: "DepositOrders",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "PayOsOrderCode",
                table: "DepositOrders",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentLinkId",
                table: "DepositOrders",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnUrl",
                table: "DepositOrders",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DepositOrders_PaymentLinkId",
                table: "DepositOrders",
                column: "PaymentLinkId",
                filter: "[PaymentLinkId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DepositOrders_PayOsOrderCode",
                table: "DepositOrders",
                column: "PayOsOrderCode",
                unique: true,
                filter: "[PayOsOrderCode] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DepositOrders_PaymentLinkId",
                table: "DepositOrders");

            migrationBuilder.DropIndex(
                name: "IX_DepositOrders_PayOsOrderCode",
                table: "DepositOrders");

            migrationBuilder.DropColumn(
                name: "CancelUrl",
                table: "DepositOrders");

            migrationBuilder.DropColumn(
                name: "CheckoutUrl",
                table: "DepositOrders");

            migrationBuilder.DropColumn(
                name: "PayOsOrderCode",
                table: "DepositOrders");

            migrationBuilder.DropColumn(
                name: "PaymentLinkId",
                table: "DepositOrders");

            migrationBuilder.DropColumn(
                name: "ReturnUrl",
                table: "DepositOrders");
        }
    }
}
