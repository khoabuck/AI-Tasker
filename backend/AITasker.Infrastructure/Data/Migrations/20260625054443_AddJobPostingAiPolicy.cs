using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobPostingAiPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JobPostingAiPolicies",
                columns: table => new
                {
                    JobPostingAiPolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InitialFreeJobPostCredits = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    InitialFreeAiGenerationCredits = table.Column<int>(type: "int", nullable: false, defaultValue: 3),
                    MaxDraftJobsPerClient = table.Column<int>(type: "int", nullable: false, defaultValue: 10),
                    MaxSkillsPerJob = table.Column<int>(type: "int", nullable: false, defaultValue: 8),
                    MaxSuggestedSkills = table.Column<int>(type: "int", nullable: false, defaultValue: 8),
                    MinimumSkillRelevanceScore = table.Column<int>(type: "int", nullable: false, defaultValue: 60),
                    MaxRecommendationResults = table.Column<int>(type: "int", nullable: false, defaultValue: 50),
                    MinimumRecommendationMatchScore = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPostingAiPolicies", x => x.JobPostingAiPolicyId);
                    table.CheckConstraint("CK_JobPostingAiPolicies_Credits", "[InitialFreeJobPostCredits] >= 0 AND [InitialFreeAiGenerationCredits] >= 0");
                    table.CheckConstraint("CK_JobPostingAiPolicies_Limits", "[MaxDraftJobsPerClient] BETWEEN 1 AND 100 AND [MaxSkillsPerJob] BETWEEN 1 AND 30 AND [MaxSuggestedSkills] BETWEEN 1 AND 30 AND [MaxSuggestedSkills] <= [MaxSkillsPerJob]");
                    table.CheckConstraint("CK_JobPostingAiPolicies_RecommendationResults", "[MaxRecommendationResults] BETWEEN 1 AND 100");
                    table.CheckConstraint("CK_JobPostingAiPolicies_Scores", "[MinimumSkillRelevanceScore] BETWEEN 0 AND 100 AND [MinimumRecommendationMatchScore] BETWEEN 0 AND 100");
                    table.ForeignKey(
                        name: "FK_JobPostingAiPolicies_Users_UpdatedByAdminId",
                        column: x => x.UpdatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobPostingAiPolicies_IsActive",
                table: "JobPostingAiPolicies",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostingAiPolicies_UpdatedByAdminId",
                table: "JobPostingAiPolicies",
                column: "UpdatedByAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JobPostingAiPolicies");
        }
    }
}
