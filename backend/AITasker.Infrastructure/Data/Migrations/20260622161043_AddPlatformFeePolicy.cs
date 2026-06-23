using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformFeePolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlatformFeePolicies",
                columns: table => new
                {
                    PlatformFeePolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IndividualClientFeeRate = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    BusinessClientFeeRate = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformFeePolicies", x => x.PlatformFeePolicyId);
                    table.ForeignKey(
                        name: "FK_PlatformFeePolicies_Users_UpdatedByAdminId",
                        column: x => x.UpdatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlatformFeePolicies_IsActive",
                table: "PlatformFeePolicies",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformFeePolicies_UpdatedByAdminId",
                table: "PlatformFeePolicies",
                column: "UpdatedByAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlatformFeePolicies");
        }
    }
}
