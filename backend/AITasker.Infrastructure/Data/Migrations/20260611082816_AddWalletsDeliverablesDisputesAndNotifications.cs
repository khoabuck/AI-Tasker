using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWalletsDeliverablesDisputesAndNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobPostings_ClientProfiles_ClientProfileId",
                table: "JobPostings");

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

            migrationBuilder.AlterColumn<string>(
                name: "ExpectedDeliverables",
                table: "JobPostings",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "JobPostings",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateTable(
                name: "Deliverables",
                columns: table => new
                {
                    DeliverableId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MilestoneId = table.Column<int>(type: "int", nullable: false),
                    ExpertId = table.Column<int>(type: "int", nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DemoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HandoverNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TestResultUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ClientFeedback = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VersionNumber = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Deliverables", x => x.DeliverableId);
                    table.ForeignKey(
                        name: "FK_Deliverables_ExpertProfiles_ExpertId",
                        column: x => x.ExpertId,
                        principalTable: "ExpertProfiles",
                        principalColumn: "ExpertProfileId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Disputes",
                columns: table => new
                {
                    DisputeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    MilestoneId = table.Column<int>(type: "int", nullable: true),
                    OpenedByUserId = table.Column<int>(type: "int", nullable: false),
                    RespondentUserId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DisputedAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ResolutionType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    AdminDecision = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Disputes", x => x.DisputeId);
                    table.ForeignKey(
                        name: "FK_Disputes_Users_OpenedByUserId",
                        column: x => x.OpenedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Disputes_Users_RespondentUserId",
                        column: x => x.RespondentUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.NotificationId);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    TransactionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EscrowId = table.Column<int>(type: "int", nullable: true),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    MilestoneId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReferenceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.TransactionId);
                    table.ForeignKey(
                        name: "FK_Transactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Wallets",
                columns: table => new
                {
                    WalletId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    AvailableBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LockedBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalEarning = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Wallets", x => x.WalletId);
                    table.ForeignKey(
                        name: "FK_Wallets_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_ClientProfileId",
                table: "JobPostings",
                column: "ClientProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_Status",
                table: "JobPostings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Deliverables_ExpertId",
                table: "Deliverables",
                column: "ExpertId");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_OpenedByUserId",
                table: "Disputes",
                column: "OpenedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_RespondentUserId",
                table: "Disputes",
                column: "RespondentUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_UserId",
                table: "Transactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Wallets_UserId",
                table: "Wallets",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_JobPostings_ClientProfiles_ClientProfileId",
                table: "JobPostings",
                column: "ClientProfileId",
                principalTable: "ClientProfiles",
                principalColumn: "ClientProfileId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobPostings_ClientProfiles_ClientProfileId",
                table: "JobPostings");

            migrationBuilder.DropTable(
                name: "Deliverables");

            migrationBuilder.DropTable(
                name: "Disputes");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropTable(
                name: "Wallets");

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

            migrationBuilder.AlterColumn<string>(
                name: "ExpectedDeliverables",
                table: "JobPostings",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "JobPostings",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000);

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_ClientProfileId_Status",
                table: "JobPostings",
                columns: new[] { "ClientProfileId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_Status_Deadline",
                table: "JobPostings",
                columns: new[] { "Status", "Deadline" });

            migrationBuilder.AddForeignKey(
                name: "FK_JobPostings_ClientProfiles_ClientProfileId",
                table: "JobPostings",
                column: "ClientProfileId",
                principalTable: "ClientProfiles",
                principalColumn: "ClientProfileId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
