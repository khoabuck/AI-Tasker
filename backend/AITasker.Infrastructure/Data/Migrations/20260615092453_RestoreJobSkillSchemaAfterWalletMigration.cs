using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RestoreJobSkillSchemaAfterWalletMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.JobSkills')
      AND name = 'SkillLevelRequired'
      AND max_length = -1
)
BEGIN
    UPDATE dbo.JobSkills
    SET SkillLevelRequired = LEFT(SkillLevelRequired, 30)
    WHERE SkillLevelRequired IS NOT NULL
      AND LEN(SkillLevelRequired) > 30;

    ALTER TABLE dbo.JobSkills
    ALTER COLUMN SkillLevelRequired nvarchar(30) NULL;
END
");

            migrationBuilder.Sql(@"
DECLARE @constraintName NVARCHAR(200);

SELECT @constraintName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c 
    ON dc.parent_object_id = c.object_id
   AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.JobSkills')
  AND c.name = 'IsRequired';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.JobSkills DROP CONSTRAINT [' + @constraintName + ']');
END

ALTER TABLE dbo.JobSkills
ADD CONSTRAINT DF_JobSkills_IsRequired
DEFAULT CONVERT(bit, (1)) FOR IsRequired;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DECLARE @constraintName NVARCHAR(200);

SELECT @constraintName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c 
    ON dc.parent_object_id = c.object_id
   AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('dbo.JobSkills')
  AND c.name = 'IsRequired';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.JobSkills DROP CONSTRAINT [' + @constraintName + ']');
END
");

            migrationBuilder.Sql(@"
ALTER TABLE dbo.JobSkills
ALTER COLUMN SkillLevelRequired nvarchar(max) NULL;
");
        }
    }
}