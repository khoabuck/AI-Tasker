using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProposalMilestoneDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MilestonePlanJson",
                table: "ProposalVersions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProposalMilestoneDrafts",
                columns: table => new
                {
                    ProposalMilestoneDraftId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProposalId = table.Column<int>(type: "int", nullable: false),
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
                    table.PrimaryKey("PK_ProposalMilestoneDrafts", x => x.ProposalMilestoneDraftId);
                    table.CheckConstraint("CK_ProposalMilestoneDrafts_Amount", "[Amount] > 0");
                    table.CheckConstraint("CK_ProposalMilestoneDrafts_DeadlineOffsetDays", "[DeadlineOffsetDays] > 0");
                    table.CheckConstraint("CK_ProposalMilestoneDrafts_OrderIndex", "[OrderIndex] > 0");
                    table.CheckConstraint("CK_ProposalMilestoneDrafts_RevisionLimit", "[RevisionLimit] >= 0");
                    table.ForeignKey(
                        name: "FK_ProposalMilestoneDrafts_Proposals_ProposalId",
                        column: x => x.ProposalId,
                        principalTable: "Proposals",
                        principalColumn: "ProposalId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProposalMilestoneDrafts_ProposalId",
                table: "ProposalMilestoneDrafts",
                column: "ProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalMilestoneDrafts_ProposalId_OrderIndex",
                table: "ProposalMilestoneDrafts",
                columns: new[] { "ProposalId", "OrderIndex" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProposalMilestoneDrafts");

            migrationBuilder.DropColumn(
                name: "MilestonePlanJson",
                table: "ProposalVersions");
        }
    }
}
