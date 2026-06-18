using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations;

public partial class StandardizeVerificationStatuses : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "ExperienceVerificationStatus",
            table: "ExpertProfiles",
            type: "nvarchar(30)",
            maxLength: 30,
            nullable: false,
            defaultValue: "NEEDS_EVIDENCE",
            oldClrType: typeof(string),
            oldType: "nvarchar(30)",
            oldMaxLength: 30,
            oldDefaultValue: "UNVERIFIED");

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
            oldDefaultValue: "UNVERIFIED");

        migrationBuilder.Sql(
            "UPDATE ExpertProfiles " +
            "SET ExperienceVerificationStatus = 'NEEDS_EVIDENCE' " +
            "WHERE ExperienceVerificationStatus = 'UNVERIFIED';"
        );

        migrationBuilder.Sql(
            "UPDATE ExpertCertificates " +
            "SET VerificationStatus = 'NEEDS_EVIDENCE' " +
            "WHERE VerificationStatus IN ('UNVERIFIED', 'NEEDS_REVIEW');"
        );

        migrationBuilder.Sql(
            "UPDATE ExpertProfiles " +
            "SET ProfileReviewStatus = 'NEEDS_CORRECTION' " +
            "WHERE ProfileReviewStatus IN ('REJECTED', 'PENDING_REVIEW', 'PENDING_AI_REVIEW');"
        );

        migrationBuilder.Sql(
            "UPDATE BusinessProfiles " +
            "SET VerificationStatus = 'NEEDS_CORRECTION' " +
            "WHERE VerificationStatus IN ('REJECTED', 'PENDING_REVIEW', 'PENDING', 'NOT_REQUIRED');"
        );

        migrationBuilder.Sql(
            "UPDATE Users " +
            "SET Status = 'PENDING_PROFILE' " +
            "WHERE Status = 'PENDING_AI_REVIEW';"
        );

        migrationBuilder.Sql(
            "UPDATE Users " +
            "SET Status = 'BUSINESS_NEEDS_CORRECTION' " +
            "WHERE Status = 'BUSINESS_REJECTED';"
        );
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "ExperienceVerificationStatus",
            table: "ExpertProfiles",
            type: "nvarchar(30)",
            maxLength: 30,
            nullable: false,
            defaultValue: "UNVERIFIED",
            oldClrType: typeof(string),
            oldType: "nvarchar(30)",
            oldMaxLength: 30,
            oldDefaultValue: "NEEDS_EVIDENCE");

        migrationBuilder.AlterColumn<string>(
            name: "VerificationStatus",
            table: "ExpertCertificates",
            type: "nvarchar(30)",
            maxLength: 30,
            nullable: false,
            defaultValue: "UNVERIFIED",
            oldClrType: typeof(string),
            oldType: "nvarchar(30)",
            oldMaxLength: 30,
            oldDefaultValue: "NEEDS_EVIDENCE");
    }
}