using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateExpertCertificateUrlAndType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "CertificateName",
                table: "ExpertCertificates",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "CertificateIssuer",
                table: "ExpertCertificates",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AddColumn<string>(
                name: "CertificateType",
                table: "ExpertCertificates",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "OTHER");

            migrationBuilder.AddColumn<string>(
                name: "DetectedHolderName",
                table: "ExpertCertificates",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DetectedIssuedAt",
                table: "ExpertCertificates",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DetectedIssuedDateText",
                table: "ExpertCertificates",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CertificateType",
                table: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "DetectedHolderName",
                table: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "DetectedIssuedAt",
                table: "ExpertCertificates");

            migrationBuilder.DropColumn(
                name: "DetectedIssuedDateText",
                table: "ExpertCertificates");

            migrationBuilder.AlterColumn<string>(
                name: "CertificateName",
                table: "ExpertCertificates",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255,
                oldDefaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "CertificateIssuer",
                table: "ExpertCertificates",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255,
                oldDefaultValue: "");
        }
    }
}
