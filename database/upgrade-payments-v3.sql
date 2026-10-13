/*
  Upgrade an existing DentalPracticeDb to add appointment payment tracking
  and PayFast booking support.

  This script is idempotent for the objects/columns it creates.
  Run database/upgrade-profile-v2.sql first if the database predates profile support.
*/
USE DentalPracticeDb;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO

IF COL_LENGTH('dbo.Services', 'BookingPaymentAmount') IS NULL
BEGIN
    ALTER TABLE dbo.Services ADD BookingPaymentAmount decimal(18,2) NULL;
END;
GO

IF COL_LENGTH('dbo.Appointments', 'PaymentMethod') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments
        ADD PaymentMethod nvarchar(30) NOT NULL
            CONSTRAINT DF_Appointments_PaymentMethod DEFAULT ('CASH_AT_PRACTICE');
END;
GO

IF COL_LENGTH('dbo.Appointments', 'PaymentStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments
        ADD PaymentStatus nvarchar(30) NOT NULL
            CONSTRAINT DF_Appointments_PaymentStatus DEFAULT ('CASH_DUE');
END;
GO

IF COL_LENGTH('dbo.Appointments', 'AmountDueAtBooking') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments
        ADD AmountDueAtBooking decimal(18,2) NOT NULL
            CONSTRAINT DF_Appointments_AmountDueAtBooking DEFAULT (0);
END;
GO

IF COL_LENGTH('dbo.Appointments', 'AmountPaid') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments
        ADD AmountPaid decimal(18,2) NOT NULL
            CONSTRAINT DF_Appointments_AmountPaid DEFAULT (0);
END;
GO

IF COL_LENGTH('dbo.Appointments', 'IsSecured') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments
        ADD IsSecured bit NOT NULL
            CONSTRAINT DF_Appointments_IsSecured DEFAULT (1);
END;
GO

IF COL_LENGTH('dbo.Appointments', 'PaymentExpiresAtUtc') IS NULL
BEGIN
    ALTER TABLE dbo.Appointments ADD PaymentExpiresAtUtc datetime2 NULL;
END;
GO

IF OBJECT_ID('dbo.AppointmentPayments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AppointmentPayments
    (
        AppointmentPaymentId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_AppointmentPayments PRIMARY KEY,
        AppointmentId int NOT NULL,
        Provider nvarchar(50) NOT NULL,
        PaymentMethod nvarchar(30) NOT NULL,
        Status nvarchar(30) NOT NULL,
        Amount decimal(18,2) NOT NULL,
        Currency nvarchar(3) NOT NULL,
        MerchantPaymentId nvarchar(80) NOT NULL,
        PayFastPaymentId nvarchar(80) NULL,
        AmountGross decimal(18,2) NULL,
        AmountFee decimal(18,2) NULL,
        AmountNet decimal(18,2) NULL,
        FailureReason nvarchar(500) NULL,
        ExpiresAtUtc datetime2 NULL,
        PaidAtUtc datetime2 NULL,
        CreatedAtUtc datetime2 NOT NULL,
        UpdatedAtUtc datetime2 NOT NULL,
        CONSTRAINT FK_AppointmentPayments_Appointments_AppointmentId
            FOREIGN KEY (AppointmentId) REFERENCES dbo.Appointments(AppointmentId)
    );

END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.AppointmentPayments') AND name = 'IX_AppointmentPayments_MerchantPaymentId')
BEGIN
    CREATE UNIQUE INDEX IX_AppointmentPayments_MerchantPaymentId
        ON dbo.AppointmentPayments(MerchantPaymentId);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.AppointmentPayments') AND name = 'IX_AppointmentPayments_AppointmentId_CreatedAtUtc')
BEGIN
    CREATE INDEX IX_AppointmentPayments_AppointmentId_CreatedAtUtc
        ON dbo.AppointmentPayments(AppointmentId, CreatedAtUtc);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.AppointmentPayments') AND name = 'IX_AppointmentPayments_PayFastPaymentId')
BEGIN
    CREATE UNIQUE INDEX IX_AppointmentPayments_PayFastPaymentId
        ON dbo.AppointmentPayments(PayFastPaymentId)
        WHERE PayFastPaymentId IS NOT NULL;
END;
GO

-- Existing appointments predate the payment feature. Treat them as confirmed/secured
-- cash-at-practice records unless the practice later reconciles them manually.
UPDATE dbo.Appointments
SET PaymentMethod = COALESCE(NULLIF(PaymentMethod, ''), 'CASH_AT_PRACTICE'),
    PaymentStatus = COALESCE(NULLIF(PaymentStatus, ''), 'CASH_DUE'),
    IsSecured = 1
WHERE PaymentMethod IS NULL OR PaymentMethod = '' OR PaymentStatus IS NULL OR PaymentStatus = '';
GO
