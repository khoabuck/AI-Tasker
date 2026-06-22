using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliverableReviewDeadline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Deliverables_Status",
                table: "Deliverables");

            migrationBuilder.AddColumn<DateTime>(
                name: "OverdueNotifiedAt",
                table: "Deliverables",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewDeadlineAt",
                table: "Deliverables",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "Deliverables",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Deliverables_ReviewDeadlineAt",
                table: "Deliverables",
                column: "ReviewDeadlineAt");

            migrationBuilder.CreateIndex(
                name: "IX_Deliverables_Status_ReviewDeadlineAt_ReviewedAt",
                table: "Deliverables",
                columns: new[] { "Status", "ReviewDeadlineAt", "ReviewedAt" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Deliverables_Status",
                table: "Deliverables",
                sql: "[Status] IN ('SUBMITTED','APPROVED','AUTO_APPROVED','REVISION_REQUESTED')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Deliverables_ReviewDeadlineAt",
                table: "Deliverables");

            migrationBuilder.DropIndex(
                name: "IX_Deliverables_Status_ReviewDeadlineAt_ReviewedAt",
                table: "Deliverables");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Deliverables_Status",
                table: "Deliverables");

            migrationBuilder.DropColumn(
                name: "OverdueNotifiedAt",
                table: "Deliverables");

            migrationBuilder.DropColumn(
                name: "ReviewDeadlineAt",
                table: "Deliverables");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "Deliverables");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Deliverables_Status",
                table: "Deliverables",
                sql: "[Status] IN ('SUBMITTED','APPROVED','REVISION_REQUESTED')");
        }
    }
}
