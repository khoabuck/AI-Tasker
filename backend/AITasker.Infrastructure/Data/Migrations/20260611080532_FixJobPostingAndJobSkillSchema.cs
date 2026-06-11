using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixJobPostingAndJobSkillSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JobPostings_ClientProfileId",
                table: "JobPostings");

            migrationBuilder.DropIndex(
                name: "IX_JobPostings_Status",
                table: "JobPostings");

            migrationBuilder.AlterColumn<string>(
                name: "SkillLevelRequired",
                table: "JobSkills",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsRequired",
                table: "JobSkills",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_ClientProfileId_Status",
                table: "JobPostings",
                columns: new[] { "ClientProfileId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_Status_Deadline",
                table: "JobPostings",
                columns: new[] { "Status", "Deadline" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JobPostings_ClientProfileId_Status",
                table: "JobPostings");

            migrationBuilder.DropIndex(
                name: "IX_JobPostings_Status_Deadline",
                table: "JobPostings");

            migrationBuilder.AlterColumn<string>(
                name: "SkillLevelRequired",
                table: "JobSkills",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "IsRequired",
                table: "JobSkills",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_ClientProfileId",
                table: "JobPostings",
                column: "ClientProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_Status",
                table: "JobPostings",
                column: "Status");
        }
    }
}
