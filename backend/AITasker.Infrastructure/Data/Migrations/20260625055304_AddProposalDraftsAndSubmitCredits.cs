using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProposalDraftsAndSubmitCredits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals");

            migrationBuilder.AddColumn<bool>(
                name: "FreeProposalSubmitUsed",
                table: "ExpertProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ProposalSubmitCredits",
                table: "ExpertProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals",
                sql: "[Status] IN ('DRAFT','SUBMITTED','ACCEPTED','REJECTED','WITHDRAWN')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "FreeProposalSubmitUsed",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ProposalSubmitCredits",
                table: "ExpertProfiles");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals",
                sql: "[Status] IN ('SUBMITTED','ACCEPTED','REJECTED','WITHDRAWN')");
        }
    }
}
