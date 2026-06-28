using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExpertProfileScoringPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExpertProfileScoringPolicies",
                columns: table => new
                {
                    ExpertProfileScoringPolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PassThreshold = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    MaxReviewSubmissions = table.Column<int>(type: "int", nullable: false),
                    ReviewLockDurationHours = table.Column<int>(type: "int", nullable: false),
                    ProfileCompletenessMaxScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    AiSkillMaxScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    ExperienceMaxScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    PortfolioMaxScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    GitHubMaxScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    LinkedInMaxScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    CertificateMaxScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    RiskMaxPenalty = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    CertificateUnverifiedMaxProfileScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    BioMinimumLength = table.Column<int>(type: "int", nullable: false),
                    SkillsMinimumLength = table.Column<int>(type: "int", nullable: false),
                    MaxCertificates = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpertProfileScoringPolicies", x => x.ExpertProfileScoringPolicyId);
                    table.ForeignKey(
                        name: "FK_ExpertProfileScoringPolicies_Users_UpdatedByAdminId",
                        column: x => x.UpdatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExpertProfileScoringPolicies_IsActive",
                table: "ExpertProfileScoringPolicies",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ExpertProfileScoringPolicies_UpdatedByAdminId",
                table: "ExpertProfileScoringPolicies",
                column: "UpdatedByAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExpertProfileScoringPolicies");
        }
    }
}
