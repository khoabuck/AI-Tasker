using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUnusedExpertProfileBudgetFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExpectedProjectBudgetMax",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "ExpectedProjectBudgetMin",
                table: "ExpertProfiles");

            migrationBuilder.DropColumn(
                name: "PreferredProjectDurationDays",
                table: "ExpertProfiles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedProjectBudgetMax",
                table: "ExpertProfiles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpectedProjectBudgetMin",
                table: "ExpertProfiles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PreferredProjectDurationDays",
                table: "ExpertProfiles",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
