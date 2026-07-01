using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixWorkflowDbRelationsAndExpertEscrow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AIModelPricingPolicyId",
                table: "AIUsageLogs",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlatformTransactions_UserId",
                table: "PlatformTransactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MarketplaceWorkflowPolicies_UpdatedByAdminId",
                table: "MarketplaceWorkflowPolicies",
                column: "UpdatedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_AIUsageLogs_AIModelPricingPolicyId",
                table: "AIUsageLogs",
                column: "AIModelPricingPolicyId");

            migrationBuilder.CreateIndex(
                name: "IX_AIModelPricingPolicies_UpdatedByAdminId",
                table: "AIModelPricingPolicies",
                column: "UpdatedByAdminId");

            migrationBuilder.AddForeignKey(
                name: "FK_AIModelPricingPolicies_Users_UpdatedByAdminId",
                table: "AIModelPricingPolicies",
                column: "UpdatedByAdminId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AIUsageLogs_AIModelPricingPolicies_AIModelPricingPolicyId",
                table: "AIUsageLogs",
                column: "AIModelPricingPolicyId",
                principalTable: "AIModelPricingPolicies",
                principalColumn: "AIModelPricingPolicyId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_MarketplaceWorkflowPolicies_Users_UpdatedByAdminId",
                table: "MarketplaceWorkflowPolicies",
                column: "UpdatedByAdminId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PlatformTransactions_ProjectContracts_ContractId",
                table: "PlatformTransactions",
                column: "ContractId",
                principalTable: "ProjectContracts",
                principalColumn: "ContractId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PlatformTransactions_Projects_ProjectId",
                table: "PlatformTransactions",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "ProjectId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PlatformTransactions_Users_UserId",
                table: "PlatformTransactions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PlatformTransactions_WithdrawalRequests_WithdrawalRequestId",
                table: "PlatformTransactions",
                column: "WithdrawalRequestId",
                principalTable: "WithdrawalRequests",
                principalColumn: "WithdrawalRequestId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AIModelPricingPolicies_Users_UpdatedByAdminId",
                table: "AIModelPricingPolicies");

            migrationBuilder.DropForeignKey(
                name: "FK_AIUsageLogs_AIModelPricingPolicies_AIModelPricingPolicyId",
                table: "AIUsageLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_MarketplaceWorkflowPolicies_Users_UpdatedByAdminId",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.DropForeignKey(
                name: "FK_PlatformTransactions_ProjectContracts_ContractId",
                table: "PlatformTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_PlatformTransactions_Projects_ProjectId",
                table: "PlatformTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_PlatformTransactions_Users_UserId",
                table: "PlatformTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_PlatformTransactions_WithdrawalRequests_WithdrawalRequestId",
                table: "PlatformTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PlatformTransactions_UserId",
                table: "PlatformTransactions");

            migrationBuilder.DropIndex(
                name: "IX_MarketplaceWorkflowPolicies_UpdatedByAdminId",
                table: "MarketplaceWorkflowPolicies");

            migrationBuilder.DropIndex(
                name: "IX_AIUsageLogs_AIModelPricingPolicyId",
                table: "AIUsageLogs");

            migrationBuilder.DropIndex(
                name: "IX_AIModelPricingPolicies_UpdatedByAdminId",
                table: "AIModelPricingPolicies");

            migrationBuilder.DropColumn(
                name: "AIModelPricingPolicyId",
                table: "AIUsageLogs");
        }
    }
}
