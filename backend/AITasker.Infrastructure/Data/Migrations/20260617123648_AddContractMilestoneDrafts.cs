using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContractMilestoneDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContractMilestoneDrafts",
                columns: table => new
                {
                    ContractMilestoneDraftId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContractId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExpectedDeliverable = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AcceptanceCriteria = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    DeadlineOffsetDays = table.Column<int>(type: "int", nullable: false),
                    RevisionLimit = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractMilestoneDrafts", x => x.ContractMilestoneDraftId);
                    table.CheckConstraint("CK_ContractMilestoneDrafts_Amount", "[Amount] > 0");
                    table.CheckConstraint("CK_ContractMilestoneDrafts_DeadlineOffsetDays", "[DeadlineOffsetDays] > 0");
                    table.CheckConstraint("CK_ContractMilestoneDrafts_OrderIndex", "[OrderIndex] > 0");
                    table.CheckConstraint("CK_ContractMilestoneDrafts_RevisionLimit", "[RevisionLimit] >= 0");
                    table.ForeignKey(
                        name: "FK_ContractMilestoneDrafts_ProjectContracts_ContractId",
                        column: x => x.ContractId,
                        principalTable: "ProjectContracts",
                        principalColumn: "ContractId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractMilestoneDrafts_ContractId",
                table: "ContractMilestoneDrafts",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractMilestoneDrafts_ContractId_OrderIndex",
                table: "ContractMilestoneDrafts",
                columns: new[] { "ContractId", "OrderIndex" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractMilestoneDrafts");
        }
    }
}
