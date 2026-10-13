/*
  Upgrade an existing DentalPracticeDb created before profile-picture support.
  New databases created from the current EF model already include these columns.
*/
USE DentalPracticeDb;
GO

IF COL_LENGTH('dbo.AspNetUsers', 'ProfileImageFileName') IS NULL
BEGIN
    ALTER TABLE dbo.AspNetUsers ADD ProfileImageFileName nvarchar(260) NULL;
END;
GO

IF COL_LENGTH('dbo.AspNetUsers', 'ProfileImageContentType') IS NULL
BEGIN
    ALTER TABLE dbo.AspNetUsers ADD ProfileImageContentType nvarchar(100) NULL;
END;
GO

IF COL_LENGTH('dbo.AspNetUsers', 'ProfileImageUpdatedAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.AspNetUsers ADD ProfileImageUpdatedAtUtc datetime2 NULL;
END;
GO

-- Enable Identity lockout for existing accounts so the configured failed-login protection works.
UPDATE dbo.AspNetUsers
SET LockoutEnabled = 1
WHERE LockoutEnabled = 0;
GO
