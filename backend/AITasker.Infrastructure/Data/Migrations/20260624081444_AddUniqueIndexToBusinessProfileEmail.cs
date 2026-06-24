using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexToBusinessProfileEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_BusinessProfiles_BusinessEmail",
                table: "BusinessProfiles",
                column: "BusinessEmail",
                unique: true,
                filter: "[BusinessEmail] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BusinessProfiles_BusinessEmail",
                table: "BusinessProfiles");
        }
    }
}
