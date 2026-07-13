using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLoginSecurityPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FailedLoginAttempts",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LoginBlockedUntil",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LoginSecurityPolicies",
                columns: table => new
                {
                    LoginSecurityPolicyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaxFailedLoginAttempts = table.Column<int>(type: "int", nullable: false, defaultValue: 5),
                    LockoutDurationMinutes = table.Column<int>(type: "int", nullable: false, defaultValue: 15),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoginSecurityPolicies", x => x.LoginSecurityPolicyId);
                    table.CheckConstraint("CK_LoginSecurityPolicies_LockoutDurationMinutes", "[LockoutDurationMinutes] BETWEEN 1 AND 1440");
                    table.CheckConstraint("CK_LoginSecurityPolicies_MaxFailedLoginAttempts", "[MaxFailedLoginAttempts] BETWEEN 1 AND 20");
                    table.ForeignKey(
                        name: "FK_LoginSecurityPolicies_Users_UpdatedByAdminId",
                        column: x => x.UpdatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_LoginBlockedUntil",
                table: "Users",
                column: "LoginBlockedUntil");

            migrationBuilder.CreateIndex(
                name: "IX_LoginSecurityPolicies_IsActive",
                table: "LoginSecurityPolicies",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_LoginSecurityPolicies_UpdatedByAdminId",
                table: "LoginSecurityPolicies",
                column: "UpdatedByAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LoginSecurityPolicies");

            migrationBuilder.DropIndex(
                name: "IX_Users_LoginBlockedUntil",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FailedLoginAttempts",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LoginBlockedUntil",
                table: "Users");
        }
    }
}
