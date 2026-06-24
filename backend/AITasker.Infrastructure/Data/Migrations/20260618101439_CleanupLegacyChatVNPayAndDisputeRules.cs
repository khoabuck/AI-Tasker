using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class CleanupLegacyChatVNPayAndDisputeRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProposalMessages");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_PaymentStatus",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Disputes_ResolutionType",
                table: "Disputes");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_PaymentStatus",
                table: "Milestones",
                sql: "[PaymentStatus] IN ('PENDING','LOCKED','FROZEN','RELEASED','REFUNDED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Disputes_ResolutionType",
                table: "Disputes",
                sql: "[ResolutionType] IS NULL OR [ResolutionType] IN ('RELEASE_TO_EXPERT','REFUND_TO_CLIENT')");

            migrationBuilder.Sql(@"
                UPDATE [Milestones]
                SET [PaymentStatus] = 'REFUNDED'
                WHERE [PaymentStatus] = 'PARTIAL_REFUND';
            ");

            migrationBuilder.Sql(@"
                UPDATE [Disputes]
                SET [ResolutionType] = 'REFUND_TO_CLIENT'
                WHERE [ResolutionType] = 'PARTIAL_SPLIT';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_PaymentStatus",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Disputes_ResolutionType",
                table: "Disputes");

            migrationBuilder.CreateTable(
                name: "ProposalMessages",
                columns: table => new
                {
                    ProposalMessageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProposalId = table.Column<int>(type: "int", nullable: false),
                    SenderUserId = table.Column<int>(type: "int", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsAgreementMarked = table.Column<bool>(type: "bit", nullable: false),
                    MessageType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProposalMessages", x => x.ProposalMessageId);
                    table.CheckConstraint("CK_ProposalMessages_MessageType", "[MessageType] IN ('TEXT','SYSTEM','AGREEMENT')");
                    table.ForeignKey(
                        name: "FK_ProposalMessages_Proposals_ProposalId",
                        column: x => x.ProposalId,
                        principalTable: "Proposals",
                        principalColumn: "ProposalId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProposalMessages_Users_SenderUserId",
                        column: x => x.SenderUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_PaymentStatus",
                table: "Milestones",
                sql: "[PaymentStatus] IN ('PENDING','LOCKED','FROZEN','RELEASED','REFUNDED','PARTIAL_REFUND')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Disputes_ResolutionType",
                table: "Disputes",
                sql: "[ResolutionType] IS NULL OR [ResolutionType] IN ('RELEASE_TO_EXPERT','REFUND_TO_CLIENT','PARTIAL_SPLIT')");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalMessages_ProposalId",
                table: "ProposalMessages",
                column: "ProposalId");

            migrationBuilder.CreateIndex(
                name: "IX_ProposalMessages_ProposalId_SenderUserId_IsAgreementMarked",
                table: "ProposalMessages",
                columns: new[] { "ProposalId", "SenderUserId", "IsAgreementMarked" });

            migrationBuilder.CreateIndex(
                name: "IX_ProposalMessages_SenderUserId",
                table: "ProposalMessages",
                column: "SenderUserId");
        }
    }
}
