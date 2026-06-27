using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingEscrowDeadline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EscrowExpiredAt",
                table: "Projects",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EscrowLockDeadlineAt",
                table: "Projects",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EscrowLockedAt",
                table: "Projects",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationDays",
                table: "Milestones",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_DurationDays",
                table: "Milestones",
                sql: "[DurationDays] > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_DurationDays",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "EscrowExpiredAt",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "EscrowLockDeadlineAt",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "EscrowLockedAt",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "DurationDays",
                table: "Milestones");
        }
    }
}
