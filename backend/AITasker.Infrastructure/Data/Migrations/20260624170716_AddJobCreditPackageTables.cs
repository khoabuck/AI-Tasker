using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobCreditPackageTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JobCreditPackages",
                columns: table => new
                {
                    JobCreditPackageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PackageName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    JobPostCredits = table.Column<int>(type: "int", nullable: false),
                    AiGenerationCredits = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false, defaultValue: "VND"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobCreditPackages", x => x.JobCreditPackageId);
                    table.CheckConstraint("CK_JobCreditPackages_CreditsAndPrice", "[JobPostCredits] > 0 AND [AiGenerationCredits] >= 0 AND [Price] >= 0");
                    table.ForeignKey(
                        name: "FK_JobCreditPackages_Users_UpdatedByAdminId",
                        column: x => x.UpdatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JobCreditPackagePurchases",
                columns: table => new
                {
                    JobCreditPackagePurchaseId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientProfileId = table.Column<int>(type: "int", nullable: false),
                    JobCreditPackageId = table.Column<int>(type: "int", nullable: false),
                    PackageNameSnapshot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DescriptionSnapshot = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    JobPostCreditsAdded = table.Column<int>(type: "int", nullable: false),
                    AiGenerationCreditsAdded = table.Column<int>(type: "int", nullable: false),
                    PricePaid = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TransactionReferenceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PurchasedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobCreditPackagePurchases", x => x.JobCreditPackagePurchaseId);
                    table.CheckConstraint("CK_JobCreditPackagePurchases_CreditsAndPrice", "[JobPostCreditsAdded] > 0 AND [AiGenerationCreditsAdded] >= 0 AND [PricePaid] >= 0");
                    table.CheckConstraint("CK_JobCreditPackagePurchases_Status", "[Status] IN ('SUCCESS','FAILED','CANCELLED')");
                    table.ForeignKey(
                        name: "FK_JobCreditPackagePurchases_ClientProfiles_ClientProfileId",
                        column: x => x.ClientProfileId,
                        principalTable: "ClientProfiles",
                        principalColumn: "ClientProfileId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JobCreditPackagePurchases_JobCreditPackages_JobCreditPackageId",
                        column: x => x.JobCreditPackageId,
                        principalTable: "JobCreditPackages",
                        principalColumn: "JobCreditPackageId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "JobCreditPackages",
                columns: new[] { "JobCreditPackageId", "AiGenerationCredits", "CreatedAt", "Currency", "Description", "DisplayOrder", "IsActive", "JobPostCredits", "PackageName", "Price", "UpdatedAt", "UpdatedByAdminId" },
                values: new object[,]
                {
                    { 1, 10, new DateTime(2026, 6, 24, 0, 0, 0, 0, DateTimeKind.Utc), "VND", "3 job posting credits and 10 AI generation credits.", 1, true, 3, "Basic", 49000m, null, null },
                    { 2, 35, new DateTime(2026, 6, 24, 0, 0, 0, 0, DateTimeKind.Utc), "VND", "10 job posting credits and 35 AI generation credits.", 2, true, 10, "Pro", 149000m, null, null },
                    { 3, 120, new DateTime(2026, 6, 24, 0, 0, 0, 0, DateTimeKind.Utc), "VND", "30 job posting credits and 120 AI generation credits.", 3, true, 30, "Business", 399000m, null, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobCreditPackagePurchases_ClientProfileId",
                table: "JobCreditPackagePurchases",
                column: "ClientProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_JobCreditPackagePurchases_JobCreditPackageId",
                table: "JobCreditPackagePurchases",
                column: "JobCreditPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_JobCreditPackagePurchases_PurchasedAt",
                table: "JobCreditPackagePurchases",
                column: "PurchasedAt");

            migrationBuilder.CreateIndex(
                name: "IX_JobCreditPackagePurchases_TransactionReferenceId",
                table: "JobCreditPackagePurchases",
                column: "TransactionReferenceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobCreditPackages_DisplayOrder",
                table: "JobCreditPackages",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_JobCreditPackages_IsActive",
                table: "JobCreditPackages",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_JobCreditPackages_PackageName",
                table: "JobCreditPackages",
                column: "PackageName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobCreditPackages_UpdatedByAdminId",
                table: "JobCreditPackages",
                column: "UpdatedByAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JobCreditPackagePurchases");

            migrationBuilder.DropTable(
                name: "JobCreditPackages");
        }
    }
}
