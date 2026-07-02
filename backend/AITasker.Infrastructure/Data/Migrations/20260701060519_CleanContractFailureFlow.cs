using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CleanContractFailureFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SignDeadlineAt",
                table: "ProjectContracts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SignExpiredAt",
                table: "ProjectContracts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ContractSignWindowHours",
                table: "MarketplaceWorkflowPolicies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectContracts_SignDeadlineAt",
                table: "ProjectContracts",
                column: "SignDeadlineAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectContracts_SignDeadlineAt",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "SignDeadlineAt",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "SignExpiredAt",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "ContractSignWindowHours",
                table: "MarketplaceWorkflowPolicies");
        }
    }
}
