using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class FinalizeMainProposalFlowConsistency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PlatformFeePolicies_IsActive",
                table: "PlatformFeePolicies");

            migrationBuilder.DropIndex(
                name: "IX_MarketplaceWorkflowPolicies_IsActive",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.DropColumn(
                name: "AcceptanceCriteria",
                table: "ProposalMilestoneDrafts");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "ProposalMilestoneDrafts");

            migrationBuilder.DropColumn(
                name: "ExpectedDeliverable",
                table: "ProposalMilestoneDrafts");

            migrationBuilder.DropColumn(
                name: "AcceptanceCriteria",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "ExpectedDeliverable",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "AcceptanceCriteria",
                table: "ContractMilestoneDrafts");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "ContractMilestoneDrafts");

            migrationBuilder.DropColumn(
                name: "ExpectedDeliverable",
                table: "ContractMilestoneDrafts");

            migrationBuilder.AddColumn<string>(
                name: "StatusReason",
                table: "Proposals",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobId_Status_StatusReason",
                table: "Proposals",
                columns: new[] { "JobId", "Status", "StatusReason" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_StatusReason",
                table: "Proposals",
                sql: "[StatusReason] IS NULL OR [StatusReason] IN ('CLIENT_ACCEPTED','CLIENT_REJECTED','AUTO_NOT_SELECTED','EXPERT_WITHDRAWN','CONTRACT_CANCELLED','CONTRACT_EXPIRED')");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformFeePolicies_IsActive",
                table: "PlatformFeePolicies",
                column: "IsActive",
                unique: true,
                filter: "[IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_MarketplaceWorkflowPolicies_IsActive",
                table: "MarketplaceWorkflowPolicies",
                column: "IsActive",
                unique: true,
                filter: "[IsActive] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Proposals_JobId_Status_StatusReason",
                table: "Proposals");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_StatusReason",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_PlatformFeePolicies_IsActive",
                table: "PlatformFeePolicies");

            migrationBuilder.DropIndex(
                name: "IX_MarketplaceWorkflowPolicies_IsActive",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.DropColumn(
                name: "StatusReason",
                table: "Proposals");

            migrationBuilder.AddColumn<string>(
                name: "AcceptanceCriteria",
                table: "ProposalMilestoneDrafts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "ProposalMilestoneDrafts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExpectedDeliverable",
                table: "ProposalMilestoneDrafts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AcceptanceCriteria",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExpectedDeliverable",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AcceptanceCriteria",
                table: "ContractMilestoneDrafts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "ContractMilestoneDrafts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExpectedDeliverable",
                table: "ContractMilestoneDrafts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_PlatformFeePolicies_IsActive",
                table: "PlatformFeePolicies",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MarketplaceWorkflowPolicies_IsActive",
                table: "MarketplaceWorkflowPolicies",
                column: "IsActive");
        }
    }
}
