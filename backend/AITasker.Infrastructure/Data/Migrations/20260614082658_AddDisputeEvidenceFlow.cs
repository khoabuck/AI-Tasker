using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDisputeEvidenceFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DisputeEvidences",
                columns: table => new
                {
                    EvidenceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DisputeId = table.Column<int>(type: "int", nullable: false),
                    UploadedByUserId = table.Column<int>(type: "int", nullable: false),
                    EvidenceText = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DisputeEvidences", x => x.EvidenceId);

                    table.ForeignKey(
                        name: "FK_DisputeEvidences_Disputes_DisputeId",
                        column: x => x.DisputeId,
                        principalTable: "Disputes",
                        principalColumn: "DisputeId",
                        onDelete: ReferentialAction.Cascade);

                    table.ForeignKey(
                        name: "FK_DisputeEvidences_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_MilestoneId",
                table: "Disputes",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_ProjectId",
                table: "Disputes",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_Status",
                table: "Disputes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DisputeEvidences_DisputeId",
                table: "DisputeEvidences",
                column: "DisputeId");

            migrationBuilder.CreateIndex(
                name: "IX_DisputeEvidences_UploadedByUserId",
                table: "DisputeEvidences",
                column: "UploadedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Disputes_Milestones_MilestoneId",
                table: "Disputes",
                column: "MilestoneId",
                principalTable: "Milestones",
                principalColumn: "MilestoneId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Disputes_Projects_ProjectId",
                table: "Disputes",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "ProjectId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Disputes_Milestones_MilestoneId",
                table: "Disputes");

            migrationBuilder.DropForeignKey(
                name: "FK_Disputes_Projects_ProjectId",
                table: "Disputes");

            migrationBuilder.DropTable(
                name: "DisputeEvidences");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_MilestoneId",
                table: "Disputes");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_ProjectId",
                table: "Disputes");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_Status",
                table: "Disputes");
        }
    }
}