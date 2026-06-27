using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveNotSelectedProposalStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
        UPDATE Proposals
        SET Status = 'REJECTED'
        WHERE Status = 'NOT_SELECTED'
    """);

    migrationBuilder.DropCheckConstraint(
        name: "CK_Proposals_Status",
        table: "Proposals");

    migrationBuilder.AddCheckConstraint(
        name: "CK_Proposals_Status",
        table: "Proposals",
        sql: "[Status] IN ('SUBMITTED','ACCEPTED','REJECTED','WITHDRAWN')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Proposals_Status",
                table: "Proposals",
                sql: "[Status] IN ('SUBMITTED','ACCEPTED','REJECTED','WITHDRAWN','NOT_SELECTED')");
        }
    }
}
