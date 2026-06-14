using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMilestoneFlowFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AcceptanceCriteria",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ExpectedDeliverable",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "OrderIndex",
                table: "Milestones",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PaymentStatus",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AddColumn<int>(
                name: "RevisionLimit",
                table: "Milestones",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RevisionUsed",
                table: "Milestones",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AcceptanceCriteria",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "ExpectedDeliverable",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "OrderIndex",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "PaymentStatus",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "RevisionLimit",
                table: "Milestones");

            migrationBuilder.DropColumn(
                name: "RevisionUsed",
                table: "Milestones");
        }
    }
}