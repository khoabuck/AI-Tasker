using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProposalCreditPackages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProposalCreditPackages",
                columns: table => new
                {
                    ProposalCreditPackageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PackageName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ProposalSubmitCredits = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false, defaultValue: "VND"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    UpdatedByAdminId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProposalCreditPackages", x => x.ProposalCreditPackageId);
                    table.CheckConstraint("CK_ProposalCreditPackages_CreditsAndPrice", "[ProposalSubmitCredits] > 0 AND [Price] >= 0");
                    table.ForeignKey(
                        name: "FK_ProposalCreditPackages_Users_UpdatedByAdminId",
                        column: x => x.UpdatedByAdminId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProposalCreditPackagePurchases",
                columns: table => new
                {
                    ProposalCreditPackagePurchaseId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExpertProfileId = table.Column<int>(type: "int", nullable: false),
                    ProposalCreditPackageId = table.Column<int>(type: "int", nullable: false),
                    PackageNameSnapshot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DescriptionSnapshot = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    ProposalSubmitCreditsAdded = table.Column<int>(type: "int", nullable: false),
                    PricePaid = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    TransactionReferenceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PurchasedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProposalCreditPackagePurchases", x => x.ProposalCreditPackagePurchaseId);
                    table.CheckConstraint("CK_ProposalCreditPackagePurchases_CreditsAndPrice", "[ProposalSubmitCreditsAdded] > 0 AND [PricePaid] >= 0");
                    table.CheckConstraint("CK_ProposalCreditPackagePurchases_Status", "[Status] IN ('SUCCESS','FAILED','CANCELLED')");
                    table.ForeignKey(
                        name: "FK_ProposalCreditPackagePurchases_ExpertProfiles_ExpertProfileId",
                        column: x => x.ExpertProfileId,
                        principalTable: "ExpertProfiles",
                        principalColumn: "ExpertProfileId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProposalCreditPackagePurchases_ProposalCreditPackages_ProposalCreditPackageId",
                        column: x => x.ProposalCreditPackageId,
                        principalTable: "ProposalCreditPackages",
                        principalColumn: "ProposalCreditPackageId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "ProposalCreditPackages",
                columns: new[] { "ProposalCreditPackageId", "CreatedAt", "Currency", "Description", "DisplayOrder", "IsActive", "PackageName", "Price", "ProposalSubmitCredits", "UpdatedAt", "UpdatedByAdminId" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 6, 28, 0, 0, 0, 0, DateTimeKind.Utc), "VND", "5 proposal submit credits.", 1, true, "Basic", 49000m, 5, null, null },
                    { 2, new DateTime(2026, 6, 28, 0, 0, 0, 0, DateTimeKind.Utc), "VND", "20 proposal submit credits.", 2, true, "Pro", 149000m, 20, null, null },
                    { 3, new DateTime(2026, 6, 28, 0, 0, 0, 0, DateTimeKind.Utc), "VND", "60 proposal submit credits.", 3, true, "Business", 399000m, 60, null, null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProposalCreditPackagePurchases_ExpertProfileId",
                table: "ProposalCreditPackagePurchases",
                column: "ExpertProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalCreditPackagePurchases_ProposalCreditPackageId",
                table: "ProposalCreditPackagePurchases",
                column: "ProposalCreditPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalCreditPackagePurchases_PurchasedAt",
                table: "ProposalCreditPackagePurchases",
                column: "PurchasedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalCreditPackagePurchases_TransactionReferenceId",
                table: "ProposalCreditPackagePurchases",
                column: "TransactionReferenceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProposalCreditPackages_DisplayOrder",
                table: "ProposalCreditPackages",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalCreditPackages_IsActive",
                table: "ProposalCreditPackages",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalCreditPackages_PackageName",
                table: "ProposalCreditPackages",
                column: "PackageName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProposalCreditPackages_UpdatedByAdminId",
                table: "ProposalCreditPackages",
                column: "UpdatedByAdminId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProposalCreditPackagePurchases");

            migrationBuilder.DropTable(
                name: "ProposalCreditPackages");
        }
    }
}
