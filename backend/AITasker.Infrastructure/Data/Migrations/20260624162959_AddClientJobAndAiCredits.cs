using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddClientJobAndAiCredits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PostingChargeType",
                table: "JobPostings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "NONE");

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                table: "JobPostings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FreeAiGenerationCredits",
                table: "ClientProfiles",
                type: "int",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<int>(
                name: "FreeJobPostCredits",
                table: "ClientProfiles",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "PaidAiGenerationCredits",
                table: "ClientProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PaidJobPostCredits",
                table: "ClientProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PostingChargeType",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "FreeAiGenerationCredits",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "FreeJobPostCredits",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "PaidAiGenerationCredits",
                table: "ClientProfiles");

            migrationBuilder.DropColumn(
                name: "PaidJobPostCredits",
                table: "ClientProfiles");
        }
    }
}
