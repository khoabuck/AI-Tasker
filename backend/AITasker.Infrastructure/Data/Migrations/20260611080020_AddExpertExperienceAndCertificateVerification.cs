using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExpertExperienceAndCertificateVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobPostings_ClientProfiles_ClientProfileId",
                table: "JobPostings");

            migrationBuilder.DropIndex(
                name: "IX_JobPostings_ClientProfileId_Status",
                table: "JobPostings");

            migrationBuilder.DropIndex(
                name: "IX_JobPostings_Status_Deadline",
                table: "JobPostings");

            migrationBuilder.AlterColumn<string>(
                name: "SkillLevelRequired",
                table: "JobSkills",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsRequired",
                table: "JobSkills",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExpectedDeliverables",
                table: "JobPostings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "JobPostings",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<decimal>(
                name: "ExperienceConfidenceScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ExperienceVerificationNote",
                table: "ExpertProfiles",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExperienceVerificationStatus",
                table: "ExpertProfiles",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "UNVERIFIED");

            migrationBuilder.AddColumn<int>(
                name: "VerifiedYearsOfExperience",
                table: "ExpertProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedAt",
                table: "ExpertCertificates",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DetectedCertificateName",
                table: "ExpertCertificates",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DetectedIssuer",
                table: "ExpertCertificates",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerificationNote",
                table: "ExpertCertificates",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "VerificationScore",
                table: "ExpertCertificates",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "VerificationStatus",
                table: "ExpertCertificates",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "UNVERIFIED");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_ClientProfileId",
                table: "JobPostings",
                column: "ClientProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_Status",
                table: "JobPostings",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_JobPostings_ClientProfiles_ClientProfileId",
                table: "JobPostings",
                column: "ClientProfileId",
                principalTable: "ClientProfiles",
                principalColumn: "ClientProfileId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobPostings_ClientProfiles_ClientProfileId",
                table: "JobPostings");

            migrationBuilder.DropIndex(
                name: "IX_JobPostings_ClientProfileId",
                table: "JobPostings");

            migrationBuilder.DropIndex(
                name: "IX_JobPostings_Status",
                table: "JobPostings");

            migrationBuilder.DropColumn(
                name: "ExperienceConfidenceScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ExperienceVerificationNote",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ExperienceVerificationStatus",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "VerifiedYearsOfExperience",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "CheckedAt",
                table: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "DetectedCertificateName",
                table: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "DetectedIssuer",
                table: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "VerificationNote",
                table: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "VerificationScore",
                table: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "VerificationStatus",
                table: "ExpertCertificates");

            migrationBuilder.AlterColumn<string>(
                name: "SkillLevelRequired",
                table: "JobSkills",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsRequired",
                table: "JobSkills",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<string>(
                name: "ExpectedDeliverables",
                table: "JobPostings",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "JobPostings",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000);

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_ClientProfileId_Status",
                table: "JobPostings",
                columns: new[] { "ClientProfileId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_Status_Deadline",
                table: "JobPostings",
                columns: new[] { "Status", "Deadline" });

            migrationBuilder.AddForeignKey(
                name: "FK_JobPostings_ClientProfiles_ClientProfileId",
                table: "JobPostings",
                column: "ClientProfileId",
                principalTable: "ClientProfiles",
                principalColumn: "ClientProfileId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
