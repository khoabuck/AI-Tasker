using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConnectProposalContractToCoreFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Projects_ContractId",
                table: "Projects",
                column: "ContractId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectContracts_ClientProfiles_ClientId",
                table: "ProjectContracts",
                column: "ClientId",
                principalTable: "ClientProfiles",
                principalColumn: "ClientProfileId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectContracts_ExpertProfiles_ExpertId",
                table: "ProjectContracts",
                column: "ExpertId",
                principalTable: "ExpertProfiles",
                principalColumn: "ExpertProfileId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_ProjectContracts_ContractId",
                table: "Projects",
                column: "ContractId",
                principalTable: "ProjectContracts",
                principalColumn: "ContractId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Proposals_ExpertProfiles_ExpertId",
                table: "Proposals",
                column: "ExpertId",
                principalTable: "ExpertProfiles",
                principalColumn: "ExpertProfileId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Proposals_JobPostings_JobId",
                table: "Proposals",
                column: "JobId",
                principalTable: "JobPostings",
                principalColumn: "JobPostingId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectContracts_ClientProfiles_ClientId",
                table: "ProjectContracts");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectContracts_ExpertProfiles_ExpertId",
                table: "ProjectContracts");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_ProjectContracts_ContractId",
                table: "Projects");

            migrationBuilder.DropForeignKey(
                name: "FK_Proposals_ExpertProfiles_ExpertId",
                table: "Proposals");

            migrationBuilder.DropForeignKey(
                name: "FK_Proposals_JobPostings_JobId",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_Projects_ContractId",
                table: "Projects");
        }
    }
}
