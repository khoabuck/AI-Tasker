using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProposals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Proposals",
                columns: table => new
                {
                    ProposalId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobId = table.Column<int>(type: "int", nullable: false),
                    ExpertProfileId = table.Column<int>(type: "int", nullable: false),
                    CoverLetter = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProposedPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ProposedTimelineDays = table.Column<int>(type: "int", nullable: false),
                    ExpectedOutputs = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WorkingApproach = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PreliminaryMilestonePlan = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CounterPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    CounterTimelineDays = table.Column<int>(type: "int", nullable: true),
                    CounterMessage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Proposals", x => x.ProposalId);
                    table.ForeignKey(
                        name: "FK_Proposals_ExpertProfiles_ExpertProfileId",
                        column: x => x.ExpertProfileId,
                        principalTable: "ExpertProfiles",
                        principalColumn: "ExpertProfileId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Proposals_JobPostings_JobId",
                        column: x => x.JobId,
                        principalTable: "JobPostings",
                        principalColumn: "JobId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_ExpertProfileId",
                table: "Proposals",
                column: "ExpertProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobId_ExpertProfileId",
                table: "Proposals",
                columns: new[] { "JobId", "ExpertProfileId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobId_Status",
                table: "Proposals",
                columns: new[] { "JobId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Proposals");
        }
    }
}
