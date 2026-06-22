using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSourceProposalVersionNumberToProjectContracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SourceProposalVersionNumber",
                table: "ProjectContracts",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectContracts_ProposalId_SourceProposalVersionNumber",
                table: "ProjectContracts",
                columns: new[] { "ProposalId", "SourceProposalVersionNumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectContracts_ProposalId_SourceProposalVersionNumber",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "SourceProposalVersionNumber",
                table: "ProjectContracts");
        }
    }
}
