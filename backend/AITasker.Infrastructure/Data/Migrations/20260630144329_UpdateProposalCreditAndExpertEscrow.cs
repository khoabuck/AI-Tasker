using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProposalCreditAndExpertEscrow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropCheckConstraint(
        name: "CK_Wallets_Balances",
        table: "Wallets");

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

    migrationBuilder.AddColumn<decimal>(
        name: "PendingEarningsBalance",
        table: "Wallets",
        type: "decimal(18,2)",
        nullable: false,
        defaultValue: 0m);

    migrationBuilder.Sql(@"
        UPDATE MarketplaceWorkflowPolicies
        SET FreeProposalSubmitCount = 5
        WHERE FreeProposalSubmitCount <> 5;

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
        name: "CK_Wallets_Balances",
        table: "Wallets",
        sql: "[AvailableBalance] >= 0 AND [LockedBalance] >= 0 AND [PendingEarningsBalance] >= 0 AND [TotalEarning] >= 0");
}

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropCheckConstraint(
        name: "CK_Wallets_Balances",
        table: "Wallets");

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
        name: "PendingEarningsBalance",
        table: "Wallets");

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

    migrationBuilder.AddCheckConstraint(
        name: "CK_Wallets_Balances",
        table: "Wallets",
        sql: "[AvailableBalance] >= 0 AND [LockedBalance] >= 0 AND [TotalEarning] >= 0 AND [AvailableBalance] + [LockedBalance] >= 0");
}
    }
}
