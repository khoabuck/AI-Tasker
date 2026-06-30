using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RefactorAiAdminDbModelCatalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UsedFallback",
                table: "AiUsageLogs");

            migrationBuilder.DropColumn(
                name: "FallbackModel",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "PrimaryModel",
                table: "AiSettings");

            migrationBuilder.AddColumn<int>(
                name: "ExpertSkillMaxTokens",
                table: "AiSettings",
                type: "int",
                nullable: false,
                defaultValue: 1500);

            migrationBuilder.AddColumn<int>(
                name: "JobAssistantMaxTokens",
                table: "AiSettings",
                type: "int",
                nullable: false,
                defaultValue: 3000);

            migrationBuilder.AddColumn<bool>(
                name: "JsonObjectResponse",
                table: "AiSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Model",
                table: "AiSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "openai/gpt-oss-120b");

            migrationBuilder.AddColumn<int>(
                name: "ProfileReviewMaxTokens",
                table: "AiSettings",
                type: "int",
                nullable: false,
                defaultValue: 2000);

            migrationBuilder.AddColumn<int>(
                name: "SkillValidatorMaxTokens",
                table: "AiSettings",
                type: "int",
                nullable: false,
                defaultValue: 1200);

            migrationBuilder.AddColumn<double>(
                name: "Temperature",
                table: "AiSettings",
                type: "float",
                nullable: false,
                defaultValue: 0.10000000000000001);

            migrationBuilder.CreateTable(
                name: "AiAllowedModels",
                columns: table => new
                {
                    AiAllowedModelId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Groq"),
                    Model = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    SupportsJsonObjectResponse = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    MaxOutputTokens = table.Column<int>(type: "int", nullable: false, defaultValue: 4096),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiAllowedModels", x => x.AiAllowedModelId);
                    table.ForeignKey(
                        name: "FK_AiAllowedModels_Users_UpdatedByAdminId",
                        column: x => x.UpdatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiAllowedModels_IsEnabled",
                table: "AiAllowedModels",
                column: "IsEnabled");

            migrationBuilder.CreateIndex(
                name: "IX_AiAllowedModels_Provider_Model",
                table: "AiAllowedModels",
                columns: new[] { "Provider", "Model" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AiAllowedModels_UpdatedByAdminId",
                table: "AiAllowedModels",
                column: "UpdatedByAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiAllowedModels");

            migrationBuilder.DropColumn(
                name: "ExpertSkillMaxTokens",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "JobAssistantMaxTokens",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "JsonObjectResponse",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "Model",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "ProfileReviewMaxTokens",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "SkillValidatorMaxTokens",
                table: "AiSettings");

            migrationBuilder.DropColumn(
                name: "Temperature",
                table: "AiSettings");

            migrationBuilder.AddColumn<bool>(
                name: "UsedFallback",
                table: "AiUsageLogs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FallbackModel",
                table: "AiSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryModel",
                table: "AiSettings",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }
    }
}
