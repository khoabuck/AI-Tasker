using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReworkExpertProfilesWithCertificates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "VerificationStatus",
                table: "ExpertProfiles",
                newName: "ProfileReviewStatus");

            migrationBuilder.RenameColumn(
                name: "HourlyRate",
                table: "ExpertProfiles",
                newName: "ExpectedProjectBudgetMin");

            migrationBuilder.AddColumn<bool>(
                name: "AvailableForWork",
                table: "ExpertProfiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedProjectBudgetMax",
                table: "ExpertProfiles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ExpertCategory",
                table: "ExpertProfiles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "ExpertProfiles",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MissingInformation",
                table: "ExpertProfiles",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PreferredProjectDurationDays",
                table: "ExpertProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ProfileReviewNote",
                table: "ExpertProfiles",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ProfileScore",
                table: "ExpertProfiles",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerifiedAt",
                table: "ExpertProfiles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ExpertCertificates",
                columns: table => new
                {
                    ExpertCertificateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExpertProfileId = table.Column<int>(type: "int", nullable: false),
                    CertificateName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CertificateIssuer = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CertificateUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpertCertificates", x => x.ExpertCertificateId);
                    table.ForeignKey(
                        name: "FK_ExpertCertificates_ExpertProfiles_ExpertProfileId",
                        column: x => x.ExpertProfileId,
                        principalTable: "ExpertProfiles",
                        principalColumn: "ExpertProfileId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExpertCertificates_ExpertProfileId_CertificateUrl",
                table: "ExpertCertificates",
                columns: new[] { "ExpertProfileId", "CertificateUrl" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "AvailableForWork",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ExpectedProjectBudgetMax",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ExpertCategory",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "MissingInformation",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "PreferredProjectDurationDays",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ProfileReviewNote",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ProfileScore",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "VerifiedAt",
                table: "ExpertProfiles");

            migrationBuilder.RenameColumn(
                name: "ProfileReviewStatus",
                table: "ExpertProfiles",
                newName: "VerificationStatus");

            migrationBuilder.RenameColumn(
                name: "ExpectedProjectBudgetMin",
                table: "ExpertProfiles",
                newName: "HourlyRate");
        }
    }
}
