using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExpertProfileScoreBreakdownColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AiSkillRelevanceScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CertificateEvidenceScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ExperienceCredibilityScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "GitHubEvidenceScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LinkedInEvidenceScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PortfolioEvidenceScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ProfileCompletenessScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TrustRiskScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiSkillRelevanceScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "CertificateEvidenceScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ExperienceCredibilityScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "GitHubEvidenceScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "LinkedInEvidenceScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "PortfolioEvidenceScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ProfileCompletenessScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "TrustRiskScore",
                table: "ExpertProfiles");
        }
    }
}
