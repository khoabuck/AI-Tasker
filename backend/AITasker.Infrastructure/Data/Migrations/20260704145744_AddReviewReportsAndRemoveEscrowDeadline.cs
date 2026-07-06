using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewReportsAndRemoveEscrowDeadline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "EscrowExpiredAt",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "EscrowLockDeadlineAt",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "EscrowLockWindowHours",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.AddColumn<DateTime>(
                name: "HiddenAt",
                table: "Reviews",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HiddenByAdminId",
                table: "Reviews",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HiddenReason",
                table: "Reviews",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Reviews",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "VISIBLE");

            migrationBuilder.AddColumn<decimal>(
                name: "ExpertFeeAmount",
                table: "ProjectContracts",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpertFeeRate",
                table: "ProjectContracts",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 15.00m);

            migrationBuilder.AddColumn<decimal>(
                name: "ExpertReceivableAmount",
                table: "ProjectContracts",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

                migrationBuilder.Sql(@"
    UPDATE ProjectContracts
    SET
        ExpertFeeAmount = ROUND(FinalPrice * ExpertFeeRate / 100.0, 0),
        ExpertReceivableAmount = FinalPrice - ROUND(FinalPrice * ExpertFeeRate / 100.0, 0)
");

            migrationBuilder.AlterColumn<decimal>(
                name: "WithdrawalFeeRate",
                table: "MarketplaceWorkflowPolicies",
                type: "decimal(18,4)",
                nullable: false,
                defaultValue: 0m,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)");

            migrationBuilder.CreateTable(
                name: "ReviewReports",
                columns: table => new
                {
                    ReviewReportId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ReviewId = table.Column<int>(type: "int", nullable: false),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    ExpertUserId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "OPEN"),
                    AdminDecision = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ResolvedByAdminId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReviewReports", x => x.ReviewReportId);
                    table.ForeignKey(
                        name: "FK_ReviewReports_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReviewReports_Reviews_ReviewId",
                        column: x => x.ReviewId,
                        principalTable: "Reviews",
                        principalColumn: "ReviewId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReviewReports_Users_ExpertUserId",
                        column: x => x.ExpertUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReviewReports_Users_ResolvedByAdminId",
                        column: x => x.ResolvedByAdminId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_HiddenByAdminId",
                table: "Reviews",
                column: "HiddenByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_Status",
                table: "Reviews",
                column: "Status");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts",
                sql: "[FinalPrice] > 0 AND [PlatformFeeRate] >= 0 AND [PlatformFeeAmount] >= 0 AND [TotalClientPayment] = [FinalPrice] + [PlatformFeeAmount] AND [ExpertFeeRate] >= 0 AND [ExpertFeeAmount] >= 0 AND [ExpertReceivableAmount] = [FinalPrice] - [ExpertFeeAmount] AND [FinalTimelineDays] > 0");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewReports_ExpertUserId",
                table: "ReviewReports",
                column: "ExpertUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewReports_ProjectId",
                table: "ReviewReports",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewReports_ResolvedByAdminId",
                table: "ReviewReports",
                column: "ResolvedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewReports_ReviewId",
                table: "ReviewReports",
                column: "ReviewId");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewReports_ReviewId_Status",
                table: "ReviewReports",
                columns: new[] { "ReviewId", "Status" },
                unique: true,
                filter: "[Status] = 'OPEN'");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewReports_Status",
                table: "ReviewReports",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Users_HiddenByAdminId",
                table: "Reviews",
                column: "HiddenByAdminId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Users_HiddenByAdminId",
                table: "Reviews");

            migrationBuilder.DropTable(
                name: "ReviewReports");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_HiddenByAdminId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_Status",
                table: "Reviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "HiddenAt",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "HiddenByAdminId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "HiddenReason",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ExpertFeeAmount",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "ExpertFeeRate",
                table: "ProjectContracts");

            migrationBuilder.DropColumn(
                name: "ExpertReceivableAmount",
                table: "ProjectContracts");

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

            migrationBuilder.AlterColumn<decimal>(
                name: "WithdrawalFeeRate",
                table: "MarketplaceWorkflowPolicies",
                type: "decimal(18,4)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,4)",
                oldDefaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "EscrowLockWindowHours",
                table: "MarketplaceWorkflowPolicies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts",
                sql: "[FinalPrice] > 0 AND [PlatformFeeRate] >= 0 AND [PlatformFeeAmount] >= 0 AND [TotalClientPayment] = [FinalPrice] + [PlatformFeeAmount] AND [FinalTimelineDays] > 0");
        }
    }
}
