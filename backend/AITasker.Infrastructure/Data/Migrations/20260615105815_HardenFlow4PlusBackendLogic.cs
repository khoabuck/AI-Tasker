using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class HardenFlow4PlusBackendLogic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Escrows_Projects_ProjectId",
                table: "Escrows");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Users_UserId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Proposals_JobId",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_MilestoneId",
                table: "Disputes");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_ProjectId",
                table: "Disputes");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_Status",
                table: "Disputes");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Transactions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Projects",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Projects",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Milestones",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Milestones",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "PaymentStatus",
                table: "Milestones",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "HandoverNotes",
                table: "Deliverables",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Deliverables",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ClientFeedback",
                table: "Deliverables",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "ProposalMessages",
                columns: table => new
                {
                    ProposalMessageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProposalId = table.Column<int>(type: "int", nullable: false),
                    SenderUserId = table.Column<int>(type: "int", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    MessageType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsAgreementMarked = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
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
                name: "CK_Wallets_Balances",
                table: "Wallets",
                sql: "[AvailableBalance] >= 0 AND [LockedBalance] >= 0 AND [TotalEarning] >= 0 AND [AvailableBalance] + [LockedBalance] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_EscrowId",
                table: "Transactions",
                column: "EscrowId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_MilestoneId",
                table: "Transactions",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_ProjectId",
                table: "Transactions",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_Type_Status_CreatedAt",
                table: "Transactions",
                columns: new[] { "Type", "Status", "CreatedAt" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Transactions_Status",
                table: "Transactions",
                sql: "[Status] IN ('PENDING','SUCCESS','FAILED','CANCELLED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reviews_Rating",
                table: "Reviews",
                sql: "[Rating] BETWEEN 1 AND 5");

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobId",
                table: "Proposals",
                column: "JobId",
                unique: true,
                filter: "[Status] = 'ACCEPTED'");

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobId_ExpertId",
                table: "Proposals",
                columns: new[] { "JobId", "ExpertId" },
                unique: true,
                filter: "[Status] <> 'WITHDRAWN'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Price_Timeline",
                table: "Proposals",
                sql: "[ProposedPrice] > 0 AND [ProposedTimelineDays] > 0 AND ([CounterPrice] IS NULL OR [CounterPrice] > 0) AND ([CounterTimelineDays] IS NULL OR [CounterTimelineDays] > 0)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals",
                sql: "[Status] IN ('SUBMITTED','COUNTER_OFFERED','ACCEPTED','REJECTED','WITHDRAWN','NOT_SELECTED')");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_Status",
                table: "Projects",
                column: "Status");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_Status",
                table: "Projects",
                sql: "[Status] IN ('PENDING_ESCROW','ACTIVE','DISPUTED','COMPLETED','CANCELLED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Projects_TotalBudget",
                table: "Projects",
                sql: "[TotalBudget] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts",
                sql: "[FinalPrice] > 0 AND [PlatformFeeRate] >= 0 AND [PlatformFeeAmount] >= 0 AND [TotalClientPayment] = [FinalPrice] + [PlatformFeeAmount] AND [FinalTimelineDays] > 0 AND [RevisionLimit] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProjectContracts_Source",
                table: "ProjectContracts",
                sql: "[ContractSource] IN ('PROPOSAL','CHAT_AGREEMENT')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ProjectContracts_Status",
                table: "ProjectContracts",
                sql: "[Status] IN ('DRAFT','CONFIRMED','CANCELLED')");

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_PaymentStatus",
                table: "Milestones",
                column: "PaymentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_ProjectId_OrderIndex",
                table: "Milestones",
                columns: new[] { "ProjectId", "OrderIndex" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Milestones_Status",
                table: "Milestones",
                column: "Status");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Amount",
                table: "Milestones",
                sql: "[Amount] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_OrderIndex",
                table: "Milestones",
                sql: "[OrderIndex] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_PaymentStatus",
                table: "Milestones",
                sql: "[PaymentStatus] IN ('PENDING','LOCKED','FROZEN','RELEASED','REFUNDED','PARTIAL_REFUND')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Revision",
                table: "Milestones",
                sql: "[RevisionLimit] >= 0 AND [RevisionUsed] >= 0 AND [RevisionUsed] <= [RevisionLimit]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones",
                sql: "[Status] IN ('PENDING','FUNDED','IN_PROGRESS','SUBMITTED','REVISION_REQUESTED','APPROVED','DISPUTED','RESOLVED','DISPUTE_RESOLVED','RELEASED','REFUNDED')");

            migrationBuilder.CreateIndex(
                name: "IX_Escrows_Status",
                table: "Escrows",
                column: "Status");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Escrows_Amount",
                table: "Escrows",
                sql: "[Amount] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Escrows_Status",
                table: "Escrows",
                sql: "[Status] IN ('PENDING','LOCKED','FROZEN','RELEASED','REFUNDED','RESOLVED')");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_MilestoneId_Status",
                table: "Disputes",
                columns: new[] { "MilestoneId", "Status" },
                unique: true,
                filter: "[MilestoneId] IS NOT NULL AND [Status] = 'OPEN'");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_ProjectId_Status",
                table: "Disputes",
                columns: new[] { "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_ProjectId_Status_MilestoneId",
                table: "Disputes",
                columns: new[] { "ProjectId", "Status", "MilestoneId" },
                unique: true,
                filter: "[MilestoneId] IS NULL AND [Status] = 'OPEN'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Disputes_Amount",
                table: "Disputes",
                sql: "[DisputedAmount] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Disputes_ResolutionType",
                table: "Disputes",
                sql: "[ResolutionType] IS NULL OR [ResolutionType] IN ('RELEASE_TO_EXPERT','REFUND_TO_CLIENT','PARTIAL_SPLIT')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Disputes_Status",
                table: "Disputes",
                sql: "[Status] IN ('OPEN','RESOLVED','CANCELLED')");

            migrationBuilder.CreateIndex(
                name: "IX_Deliverables_MilestoneId",
                table: "Deliverables",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Deliverables_MilestoneId_VersionNumber",
                table: "Deliverables",
                columns: new[] { "MilestoneId", "VersionNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Deliverables_Status",
                table: "Deliverables",
                column: "Status");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Deliverables_Status",
                table: "Deliverables",
                sql: "[Status] IN ('SUBMITTED','APPROVED','REVISION_REQUESTED')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Deliverables_VersionNumber",
                table: "Deliverables",
                sql: "[VersionNumber] > 0");

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

            migrationBuilder.AddForeignKey(
                name: "FK_Deliverables_Milestones_MilestoneId",
                table: "Deliverables",
                column: "MilestoneId",
                principalTable: "Milestones",
                principalColumn: "MilestoneId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Escrows_Projects_ProjectId",
                table: "Escrows",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "ProjectId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Escrows_EscrowId",
                table: "Transactions",
                column: "EscrowId",
                principalTable: "Escrows",
                principalColumn: "EscrowId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Milestones_MilestoneId",
                table: "Transactions",
                column: "MilestoneId",
                principalTable: "Milestones",
                principalColumn: "MilestoneId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Projects_ProjectId",
                table: "Transactions",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "ProjectId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Users_UserId",
                table: "Transactions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Deliverables_Milestones_MilestoneId",
                table: "Deliverables");

            migrationBuilder.DropForeignKey(
                name: "FK_Escrows_Projects_ProjectId",
                table: "Escrows");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Escrows_EscrowId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Milestones_MilestoneId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Projects_ProjectId",
                table: "Transactions");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Users_UserId",
                table: "Transactions");

            migrationBuilder.DropTable(
                name: "ProposalMessages");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Wallets_Balances",
                table: "Wallets");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_EscrowId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_MilestoneId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_ProjectId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_Type_Status_CreatedAt",
                table: "Transactions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Transactions_Status",
                table: "Transactions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reviews_Rating",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Proposals_JobId",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_Proposals_JobId_ExpertId",
                table: "Proposals");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Price_Timeline",
                table: "Proposals");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals");

            migrationBuilder.DropIndex(
                name: "IX_Projects_Status",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_Status",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Projects_TotalBudget",
                table: "Projects");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProjectContracts_Amounts",
                table: "ProjectContracts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProjectContracts_Source",
                table: "ProjectContracts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ProjectContracts_Status",
                table: "ProjectContracts");

            migrationBuilder.DropIndex(
                name: "IX_Milestones_PaymentStatus",
                table: "Milestones");

            migrationBuilder.DropIndex(
                name: "IX_Milestones_ProjectId_OrderIndex",
                table: "Milestones");

            migrationBuilder.DropIndex(
                name: "IX_Milestones_Status",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Amount",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_OrderIndex",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_PaymentStatus",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Revision",
                table: "Milestones");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Milestones_Status",
                table: "Milestones");

            migrationBuilder.DropIndex(
                name: "IX_Escrows_Status",
                table: "Escrows");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Escrows_Amount",
                table: "Escrows");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Escrows_Status",
                table: "Escrows");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_MilestoneId_Status",
                table: "Disputes");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_ProjectId_Status",
                table: "Disputes");

            migrationBuilder.DropIndex(
                name: "IX_Disputes_ProjectId_Status_MilestoneId",
                table: "Disputes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Disputes_Amount",
                table: "Disputes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Disputes_ResolutionType",
                table: "Disputes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Disputes_Status",
                table: "Disputes");

            migrationBuilder.DropIndex(
                name: "IX_Deliverables_MilestoneId",
                table: "Deliverables");

            migrationBuilder.DropIndex(
                name: "IX_Deliverables_MilestoneId_VersionNumber",
                table: "Deliverables");

            migrationBuilder.DropIndex(
                name: "IX_Deliverables_Status",
                table: "Deliverables");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Deliverables_Status",
                table: "Deliverables");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Deliverables_VersionNumber",
                table: "Deliverables");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Transactions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Projects",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "PaymentStatus",
                table: "Milestones",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "HandoverNotes",
                table: "Deliverables",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Deliverables",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000);

            migrationBuilder.AlterColumn<string>(
                name: "ClientFeedback",
                table: "Deliverables",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobId",
                table: "Proposals",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_MilestoneId",
                table: "Disputes",
                column: "MilestoneId");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_ProjectId",
                table: "Disputes",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Disputes_Status",
                table: "Disputes",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_Escrows_Projects_ProjectId",
                table: "Escrows",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "ProjectId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Users_UserId",
                table: "Transactions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
