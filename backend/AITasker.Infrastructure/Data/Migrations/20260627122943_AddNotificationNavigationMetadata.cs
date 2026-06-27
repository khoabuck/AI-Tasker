using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationNavigationMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RelatedContractId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedConversationId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedDeliverableId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedDisputeId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedEntityId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RelatedEntityType",
                table: "Notifications",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedJobId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedMilestoneId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedProjectId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RelatedProposalId",
                table: "Notifications",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RelatedConversationId",
                table: "Notifications",
                column: "RelatedConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RelatedDeliverableId",
                table: "Notifications",
                column: "RelatedDeliverableId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RelatedDisputeId",
                table: "Notifications",
                column: "RelatedDisputeId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RelatedEntityType_RelatedEntityId",
                table: "Notifications",
                columns: new[] { "RelatedEntityType", "RelatedEntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RelatedMilestoneId",
                table: "Notifications",
                column: "RelatedMilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RelatedProjectId",
                table: "Notifications",
                column: "RelatedProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RelatedProposalId",
                table: "Notifications",
                column: "RelatedProposalId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_RelatedConversationId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RelatedDeliverableId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RelatedDisputeId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RelatedEntityType_RelatedEntityId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RelatedMilestoneId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RelatedProjectId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RelatedProposalId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedContractId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedConversationId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedDeliverableId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedDisputeId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedEntityId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedEntityType",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedJobId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedMilestoneId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedProjectId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RelatedProposalId",
                table: "Notifications");
        }
    }
}
