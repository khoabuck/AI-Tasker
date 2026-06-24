using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectContractProposalRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Proposals",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ProjectContracts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ContractSource",
                table: "ProjectContracts",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_ExpertId",
                table: "Proposals",
                column: "ExpertId");

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobId",
                table: "Proposals",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_Status",
                table: "Proposals",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectContracts_ClientId",
                table: "ProjectContracts",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectContracts_ExpertId",
                table: "ProjectContracts",
                column: "ExpertId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectContracts_Status",
                table: "ProjectContracts",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectContracts_Proposals_ProposalId",
                table: "ProjectContracts",
                column: "ProposalId",
                principalTable: "Proposals",
                principalColumn: "ProposalId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectContracts_Proposals_ProposalId",
                table: "ProjectContracts");

            migrationBuilder.DropIndex(
                name: "IX_Proposals_ExpertId",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_Proposals_JobId",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_Proposals_Status",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_ProjectContracts_ClientId",
                table: "ProjectContracts");

            migrationBuilder.DropIndex(
                name: "IX_ProjectContracts_ExpertId",
                table: "ProjectContracts");

            migrationBuilder.DropIndex(
                name: "IX_ProjectContracts_Status",
                table: "ProjectContracts");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Proposals",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ProjectContracts",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "ContractSource",
                table: "ProjectContracts",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);
        }
    }
}
