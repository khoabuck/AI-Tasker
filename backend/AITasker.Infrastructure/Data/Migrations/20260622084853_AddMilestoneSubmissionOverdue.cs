using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMilestoneSubmissionOverdue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones");

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmissionOverdueNotifiedAt",
                table: "Milestones",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_Deadline",
                table: "Milestones",
                column: "Deadline");

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_Status_Deadline_SubmissionOverdueNotifiedAt",
                table: "Milestones",
                columns: new[] { "Status", "Deadline", "SubmissionOverdueNotifiedAt" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones",
                sql: "[Status] IN ('PENDING','FUNDED','IN_PROGRESS','OVERDUE','SUBMITTED','REVISION_REQUESTED','APPROVED','DISPUTED','RESOLVED','DISPUTE_RESOLVED','RELEASED','REFUNDED')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Milestones_Deadline",
                table: "Milestones");

            migrationBuilder.DropIndex(
                name: "IX_Milestones_Status_Deadline_SubmissionOverdueNotifiedAt",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "SubmissionOverdueNotifiedAt",
                table: "Milestones");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones",
                sql: "[Status] IN ('PENDING','FUNDED','IN_PROGRESS','SUBMITTED','REVISION_REQUESTED','APPROVED','DISPUTED','RESOLVED','DISPUTE_RESOLVED','RELEASED','REFUNDED')");
        }
    }
}
