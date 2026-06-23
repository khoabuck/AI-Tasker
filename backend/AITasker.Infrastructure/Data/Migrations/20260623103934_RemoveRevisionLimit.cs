using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRevisionLimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ProposalMilestoneDrafts_RevisionLimit",
                table: "ProposalMilestoneDrafts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Revision",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ContractMilestoneDrafts_RevisionLimit",
                table: "ContractMilestoneDrafts");

            migrationBuilder.DropColumn(
                name: "RevisionLimit",
                table: "ProposalMilestoneDrafts");

            migrationBuilder.DropColumn(
                name: "RevisionLimit",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "RevisionLimit",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "RevisionLimit",
                table: "ContractMilestoneDrafts");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts",
                sql: "[FinalPrice] > 0 AND [PlatformFeeRate] >= 0 AND [PlatformFeeAmount] >= 0 AND [TotalClientPayment] = [FinalPrice] + [PlatformFeeAmount] AND [FinalTimelineDays] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Revision",
                table: "Milestones",
                sql: "[RevisionUsed] >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Revision",
                table: "Milestones");

            migrationBuilder.AddColumn<int>(
                name: "RevisionLimit",
                table: "ProposalMilestoneDrafts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RevisionLimit",
                table: "ProjectContracts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            

            migrationBuilder.AddColumn<int>(
                name: "RevisionLimit",
                table: "Milestones",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("UPDATE Milestones SET RevisionLimit = RevisionUsed WHERE RevisionUsed > RevisionLimit");

            migrationBuilder.AddColumn<int>(
                name: "RevisionLimit",
                table: "ContractMilestoneDrafts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProposalMilestoneDrafts_RevisionLimit",
                table: "ProposalMilestoneDrafts",
                sql: "[RevisionLimit] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts",
                sql: "[FinalPrice] > 0 AND [PlatformFeeRate] >= 0 AND [PlatformFeeAmount] >= 0 AND [TotalClientPayment] = [FinalPrice] + [PlatformFeeAmount] AND [FinalTimelineDays] > 0 AND [RevisionLimit] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Revision",
                table: "Milestones",
                sql: "[RevisionLimit] >= 0 AND [RevisionUsed] >= 0 AND [RevisionUsed] <= [RevisionLimit]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ContractMilestoneDrafts_RevisionLimit",
                table: "ContractMilestoneDrafts",
                sql: "[RevisionLimit] >= 0");
        }
    }
}
