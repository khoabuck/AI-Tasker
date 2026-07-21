using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RefineContractSigningAndDisputeContinuation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_StatusReason",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_ProjectContracts_ProposalId",
                table: "ProjectContracts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones");

            migrationBuilder.AddColumn<int>(
                name: "ClientMissSignCount",
                table: "Proposals",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ExpertMissSignCount",
                table: "Proposals",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CancelledReason",
                table: "ProjectContracts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClientSignDeadlineAt",
                table: "ProjectContracts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClientSignedAt",
                table: "ProjectContracts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpertSignDeadlineAt",
                table: "ProjectContracts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpertSignedAt",
                table: "ProjectContracts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ContractSignMissLimit",
                table: "MarketplaceWorkflowPolicies",
                type: "int",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<string>(
                name: "PostResolutionDecision",
                table: "Disputes",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PostResolutionDecisionAt",
                table: "Disputes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PostResolutionDecisionByUserId",
                table: "Disputes",
                type: "int",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_StatusReason",
                table: "Proposals",
                sql: "[StatusReason] IS NULL OR [StatusReason] IN ('CLIENT_ACCEPTED','CLIENT_REJECTED','AUTO_NOT_SELECTED','EXPERT_WITHDRAWN','CONTRACT_CANCELLED','CONTRACT_EXPIRED','CLIENT_SIGN_TIMEOUT_LIMIT_EXCEEDED','EXPERT_SIGN_TIMEOUT_LIMIT_EXCEEDED')");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectContracts_ProposalId",
                table: "ProjectContracts",
                column: "ProposalId",
                unique: true,
                filter: "[Status] IN ('DRAFT','CONFIRMED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones",
                sql: "[Status] IN ('PENDING','FUNDED','IN_PROGRESS','OVERDUE','SUBMITTED','REVISION_REQUESTED','APPROVED','DISPUTED','RESOLVED','DISPUTE_RESOLVED','RELEASED','REFUNDED','CANCELLED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Disputes_PostResolutionDecision",
                table: "Disputes",
                sql: "[PostResolutionDecision] IS NULL OR [PostResolutionDecision] IN ('CONTINUE','END')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_StatusReason",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_ProjectContracts_ProposalId",
                table: "ProjectContracts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Disputes_PostResolutionDecision",
                table: "Disputes");

            migrationBuilder.DropColumn(
                name: "ClientMissSignCount",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "ExpertMissSignCount",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "CancelledReason",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "ClientSignDeadlineAt",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "ClientSignedAt",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "ExpertSignDeadlineAt",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "ExpertSignedAt",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "ContractSignMissLimit",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.DropColumn(
                name: "PostResolutionDecision",
                table: "Disputes");

            migrationBuilder.DropColumn(
                name: "PostResolutionDecisionAt",
                table: "Disputes");

            migrationBuilder.DropColumn(
                name: "PostResolutionDecisionByUserId",
                table: "Disputes");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_StatusReason",
                table: "Proposals",
                sql: "[StatusReason] IS NULL OR [StatusReason] IN ('CLIENT_ACCEPTED','CLIENT_REJECTED','AUTO_NOT_SELECTED','EXPERT_WITHDRAWN','CONTRACT_CANCELLED','CONTRACT_EXPIRED')");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectContracts_ProposalId",
                table: "ProjectContracts",
                column: "ProposalId",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones",
                sql: "[Status] IN ('PENDING','FUNDED','IN_PROGRESS','OVERDUE','SUBMITTED','REVISION_REQUESTED','APPROVED','DISPUTED','RESOLVED','DISPUTE_RESOLVED','RELEASED','REFUNDED')");
        }
    }
}
