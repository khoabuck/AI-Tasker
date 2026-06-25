using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExpertFeeRateToPlatformFeePolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ExpertFeeRate",
                table: "PlatformFeePolicies",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 15.00m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExpertFeeRate",
                table: "PlatformFeePolicies");
        }
    }
}
