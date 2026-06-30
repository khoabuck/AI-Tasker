using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProposalCreditReservationFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.AddColumn<int>(
        name: "FreeProposalSubmitUsedCount",
        table: "ExpertProfiles",
        type: "int",
        nullable: false,
        defaultValue: 0);

    migrationBuilder.Sql(@"
        UPDATE ExpertProfiles
        SET FreeProposalSubmitUsedCount =
            CASE WHEN FreeProposalSubmitUsed = 1 THEN 1 ELSE 0 END
    ");

    migrationBuilder.DropColumn(
        name: "FreeProposalSubmitUsed",
        table: "ExpertProfiles");

    migrationBuilder.AddColumn<string>(
        name: "ProposalCreditChargeStatus",
        table: "Proposals",
        type: "nvarchar(20)",
        maxLength: 20,
        nullable: false,
        defaultValue: "NONE");

    migrationBuilder.AddColumn<string>(
        name: "ProposalCreditChargeType",
        table: "Proposals",
        type: "nvarchar(20)",
        maxLength: 20,
        nullable: false,
        defaultValue: "NONE");

    migrationBuilder.AddColumn<DateTime>(
        name: "ProposalCreditConsumedAt",
        table: "Proposals",
        type: "datetime2",
        nullable: true);

    migrationBuilder.AddColumn<DateTime>(
        name: "ProposalCreditRefundedAt",
        table: "Proposals",
        type: "datetime2",
        nullable: true);

    migrationBuilder.AddColumn<DateTime>(
        name: "ProposalCreditReservedAt",
        table: "Proposals",
        type: "datetime2",
        nullable: true);

    migrationBuilder.Sql(@"
        UPDATE MarketplaceWorkflowPolicies
        SET FreeProposalSubmitCount = 5
        WHERE FreeProposalSubmitCount < 5;

        UPDATE ProposalCreditPackages
        SET ProposalSubmitCredits = 20,
            Description = '20 proposal submit credits.'
        WHERE PackageName = 'Basic';

        UPDATE ProposalCreditPackages
        SET ProposalSubmitCredits = 50,
            Description = '50 proposal submit credits.'
        WHERE PackageName = 'Pro';

        UPDATE ProposalCreditPackages
        SET ProposalSubmitCredits = 100,
            Description = '100 proposal submit credits.'
        WHERE PackageName = 'Business';
    ");

    migrationBuilder.AddCheckConstraint(
        name: "CK_Proposals_CreditChargeStatus",
        table: "Proposals",
        sql: "[ProposalCreditChargeStatus] IN ('NONE','RESERVED','CONSUMED','REFUNDED')");

    migrationBuilder.AddCheckConstraint(
        name: "CK_Proposals_CreditChargeType",
        table: "Proposals",
        sql: "[ProposalCreditChargeType] IN ('NONE','FREE','PAID')");
}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropCheckConstraint(
        name: "CK_Proposals_CreditChargeStatus",
        table: "Proposals");

    migrationBuilder.DropCheckConstraint(
        name: "CK_Proposals_CreditChargeType",
        table: "Proposals");

    migrationBuilder.AddColumn<bool>(
        name: "FreeProposalSubmitUsed",
        table: "ExpertProfiles",
        type: "bit",
        nullable: false,
        defaultValue: false);

    migrationBuilder.Sql(@"
        UPDATE ExpertProfiles
        SET FreeProposalSubmitUsed =
            CASE WHEN FreeProposalSubmitUsedCount > 0 THEN 1 ELSE 0 END
    ");

    migrationBuilder.DropColumn(
        name: "FreeProposalSubmitUsedCount",
        table: "ExpertProfiles");

    migrationBuilder.DropColumn(
        name: "ProposalCreditChargeStatus",
        table: "Proposals");

    migrationBuilder.DropColumn(
        name: "ProposalCreditChargeType",
        table: "Proposals");

    migrationBuilder.DropColumn(
        name: "ProposalCreditConsumedAt",
        table: "Proposals");

    migrationBuilder.DropColumn(
        name: "ProposalCreditRefundedAt",
        table: "Proposals");

    migrationBuilder.DropColumn(
        name: "ProposalCreditReservedAt",
        table: "Proposals");

    migrationBuilder.Sql(@"
        UPDATE MarketplaceWorkflowPolicies
        SET FreeProposalSubmitCount = 1
        WHERE FreeProposalSubmitCount = 5;

        UPDATE ProposalCreditPackages
        SET ProposalSubmitCredits = 5,
            Description = '5 proposal submit credits.'
        WHERE PackageName = 'Basic';

        UPDATE ProposalCreditPackages
        SET ProposalSubmitCredits = 20,
            Description = '20 proposal submit credits.'
        WHERE PackageName = 'Pro';

        UPDATE ProposalCreditPackages
        SET ProposalSubmitCredits = 60,
            Description = '60 proposal submit credits.'
        WHERE PackageName = 'Business';
    ");
}
    }
}
