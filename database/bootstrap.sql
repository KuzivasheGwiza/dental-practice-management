/*
  Optional SQL Server bootstrap.
  The application itself creates its tables in Development using EF Core EnsureCreatedAsync().
*/
IF DB_ID(N'DentalPracticeDb') IS NULL
BEGIN
    CREATE DATABASE DentalPracticeDb;
END;
GO

USE DentalPracticeDb;
GO

SELECT DB_NAME() AS DatabaseName, GETDATE() AS ServerLocalTime;
GO
