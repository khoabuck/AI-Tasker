using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateExpertCertificateOwnershipRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "VerificationStatus",
                table: "ExpertCertificates",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "NEEDS_REVIEW",
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldDefaultValue: "NEEDS_EVIDENCE");

            migrationBuilder.CreateIndex(
                name: "IX_ExpertCertificates_CertificateUrl",
                table: "ExpertCertificates",
                column: "CertificateUrl");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExpertCertificates_CertificateUrl",
                table: "ExpertCertificates");

            migrationBuilder.AlterColumn<string>(
                name: "VerificationStatus",
                table: "ExpertCertificates",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "NEEDS_EVIDENCE",
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldDefaultValue: "NEEDS_REVIEW");
        }
    }
}
