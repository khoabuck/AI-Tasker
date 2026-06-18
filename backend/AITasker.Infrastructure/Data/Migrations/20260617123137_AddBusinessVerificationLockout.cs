using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessVerificationLockout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.AddColumn<int>(
        name: "VerificationSubmissionCount",
        table: "BusinessProfiles",
        type: "int",
        nullable: false,
        defaultValue: 0);

    migrationBuilder.AddColumn<DateTime>(
        name: "VerificationLockedUntil",
        table: "BusinessProfiles",
        type: "datetime2",
        nullable: true);
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropColumn(
        name: "VerificationLockedUntil",
        table: "BusinessProfiles");

    migrationBuilder.DropColumn(
        name: "VerificationSubmissionCount",
        table: "BusinessProfiles");
}
    }
}
