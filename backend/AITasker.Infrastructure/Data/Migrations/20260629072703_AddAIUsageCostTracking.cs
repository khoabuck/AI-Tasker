using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAIUsageCostTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AIModelPricingPolicies",
                columns: table => new
                {
                    AIModelPricingPolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ModelName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    InputPricePerMillionTokensUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    OutputPricePerMillionTokensUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    ExchangeRateToVnd = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    IsFreeTier = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true),
                    UpdateReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIModelPricingPolicies", x => x.AIModelPricingPolicyId);
                    table.CheckConstraint("CK_AIModelPricingPolicies_ExchangeRate", "[ExchangeRateToVnd] > 0");
                    table.CheckConstraint("CK_AIModelPricingPolicies_Prices", "[InputPricePerMillionTokensUsd] >= 0 AND [OutputPricePerMillionTokensUsd] >= 0");
                });

            migrationBuilder.CreateTable(
                name: "AIUsageLogs",
                columns: table => new
                {
                    AIUsageLogId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    ModuleName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ModelName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    InputTokens = table.Column<int>(type: "int", nullable: false),
                    OutputTokens = table.Column<int>(type: "int", nullable: false),
                    TotalTokens = table.Column<int>(type: "int", nullable: false),
                    InputPricePerMillionTokensUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    OutputPricePerMillionTokensUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    EstimatedInputCostUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    EstimatedOutputCostUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    EstimatedTotalCostUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    ActualInputCostUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    ActualOutputCostUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    ActualTotalCostUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    ExchangeRateToVnd = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    EstimatedTotalCostVnd = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ActualTotalCostVnd = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    FreeTierSavingsUsd = table.Column<decimal>(type: "decimal(18,8)", nullable: false),
                    FreeTierSavingsVnd = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsFreeTier = table.Column<bool>(type: "bit", nullable: false),
                    IsChargedToPlatform = table.Column<bool>(type: "bit", nullable: false),
                    IsChargedToUser = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ErrorMessage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RequestPreview = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ResponsePreview = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIUsageLogs", x => x.AIUsageLogId);
                    table.ForeignKey(
                        name: "FK_AIUsageLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AIModelPricingPolicies_Provider_ModelName_IsActive_EffectiveFrom",
                table: "AIModelPricingPolicies",
                columns: new[] { "Provider", "ModelName", "IsActive", "EffectiveFrom" });

            migrationBuilder.CreateIndex(
                name: "IX_AIUsageLogs_CreatedAt",
                table: "AIUsageLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AIUsageLogs_ModelName",
                table: "AIUsageLogs",
                column: "ModelName");

            migrationBuilder.CreateIndex(
                name: "IX_AIUsageLogs_ModuleName",
                table: "AIUsageLogs",
                column: "ModuleName");

            migrationBuilder.CreateIndex(
                name: "IX_AIUsageLogs_Provider",
                table: "AIUsageLogs",
                column: "Provider");

            migrationBuilder.CreateIndex(
                name: "IX_AIUsageLogs_Status",
                table: "AIUsageLogs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AIUsageLogs_UserId",
                table: "AIUsageLogs",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIModelPricingPolicies");

            migrationBuilder.DropTable(
                name: "AIUsageLogs");
        }
    }
}
