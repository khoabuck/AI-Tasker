using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketplaceWorkflowPolicyAndAdminProposalCredits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MarketplaceWorkflowPolicies",
                columns: table => new
                {
                    MarketplaceWorkflowPolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProposalDraftLimit = table.Column<int>(type: "int", nullable: false),
                    ProposalMilestoneLimit = table.Column<int>(type: "int", nullable: false),
                    FreeProposalSubmitCount = table.Column<int>(type: "int", nullable: false),
                    ResubmitNoteMaxLength = table.Column<int>(type: "int", nullable: false),
                    EscrowLockWindowHours = table.Column<int>(type: "int", nullable: false),
                    ExpertMaxActiveProjects = table.Column<int>(type: "int", nullable: false),
                    DeliverableReviewWindowHours = table.Column<int>(type: "int", nullable: false),
                    DeliverableAutoApproveGraceHours = table.Column<int>(type: "int", nullable: false),
                    MinimumWithdrawalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    WithdrawalFeeRate = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    MinimumDepositAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MaximumDepositAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DisputeLostWarningThreshold = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true),
                    UpdateReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MarketplaceWorkflowPolicies", x => x.MarketplaceWorkflowPolicyId);
                });

            migrationBuilder.InsertData(
                table: "MarketplaceWorkflowPolicies",
                columns: new[] { "MarketplaceWorkflowPolicyId", "CreatedAt", "DeliverableAutoApproveGraceHours", "DeliverableReviewWindowHours", "DisputeLostWarningThreshold", "EscrowLockWindowHours", "ExpertMaxActiveProjects", "FreeProposalSubmitCount", "IsActive", "MaximumDepositAmount", "MinimumDepositAmount", "MinimumWithdrawalAmount", "ProposalDraftLimit", "ProposalMilestoneLimit", "ResubmitNoteMaxLength", "UpdateReason", "UpdatedAt", "UpdatedByAdminId", "WithdrawalFeeRate" },
                values: new object[] { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 6, 24, 3, 24, 3, 1, true, 500000000m, 1000m, 1000m, 10, 10, 1000, "Default marketplace workflow policy.", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, 0.10m });

            migrationBuilder.CreateIndex(
                name: "IX_MarketplaceWorkflowPolicies_IsActive",
                table: "MarketplaceWorkflowPolicies",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MarketplaceWorkflowPolicies");
        }
    }
}
