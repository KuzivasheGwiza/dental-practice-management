USE DentalPracticeDb;
GO
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.PortalContents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PortalContents (
        PortalContentId int IDENTITY PRIMARY KEY,
        ConsultationInformation nvarchar(max) NOT NULL,
        PreparationInstructions nvarchar(max) NOT NULL,
        CancellationPolicy nvarchar(max) NOT NULL,
        PrivacyNotice nvarchar(max) NOT NULL,
        Faqs nvarchar(max) NOT NULL,
        ChangeDeadlineHours int NOT NULL,
        UpdatedAtUtc datetime2 NOT NULL
    );
END;
IF OBJECT_ID('dbo.PaymentRefunds', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PaymentRefunds (
        PaymentRefundId int IDENTITY PRIMARY KEY,
        AppointmentId int NOT NULL REFERENCES dbo.Appointments(AppointmentId),
        Amount decimal(18,2) NOT NULL,
        Reason nvarchar(max) NOT NULL,
        ExternalReference nvarchar(200) NOT NULL,
        RecordedByUserId nvarchar(max) NOT NULL,
        CreatedAtUtc datetime2 NOT NULL
    );
    CREATE UNIQUE INDEX IX_PaymentRefunds_ExternalReference ON dbo.PaymentRefunds(ExternalReference);
END;
GO
