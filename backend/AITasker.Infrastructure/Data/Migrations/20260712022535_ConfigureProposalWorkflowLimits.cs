using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConfigureProposalWorkflowLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DeliverableArtifactLimit",
                table: "MarketplaceWorkflowPolicies",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<int>(
                name: "ProposalCreditLowWarningThreshold",
                table: "MarketplaceWorkflowPolicies",
                type: "int",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<int>(
                name: "ProposalResubmitLimit",
                table: "MarketplaceWorkflowPolicies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ProposalResubmitWindowHours",
                table: "MarketplaceWorkflowPolicies",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeliverableArtifactLimit",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.DropColumn(
                name: "ProposalCreditLowWarningThreshold",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.DropColumn(
                name: "ProposalResubmitLimit",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.DropColumn(
                name: "ProposalResubmitWindowHours",
                table: "MarketplaceWorkflowPolicies");
        }
    }
}
