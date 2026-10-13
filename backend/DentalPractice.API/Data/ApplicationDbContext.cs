using DentalPractice.API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Practice> Practices => Set<Practice>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<Dentist> Dentists => Set<Dentist>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<DentistService> DentistServices => Set<DentistService>();
    public DbSet<AppointmentStatus> AppointmentStatuses => Set<AppointmentStatus>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<DentistAvailability> DentistAvailabilities => Set<DentistAvailability>();
    public DbSet<AvailabilityException> AvailabilityExceptions => Set<AvailabilityException>();
    public DbSet<PracticeHours> PracticeHours => Set<PracticeHours>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AppointmentPayment> AppointmentPayments => Set<AppointmentPayment>();
    public DbSet<PortalContent> PortalContents => Set<PortalContent>();
    public DbSet<PaymentRefund> PaymentRefunds => Set<PaymentRefund>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<PaymentRefund>(entity =>
        {
            entity.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            entity.Property(x => x.ExternalReference).HasMaxLength(200);
            entity.HasIndex(x => x.ExternalReference).IsUnique();
            entity.HasOne<Appointment>().WithMany().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(x => x.ProfileImageFileName).HasMaxLength(260);
            entity.Property(x => x.ProfileImageContentType).HasMaxLength(100);
        });

        builder.Entity<Practice>(entity =>
        {
            entity.HasKey(x => x.PracticeId);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(256);
        });

        builder.Entity<Patient>(entity =>
        {
            entity.HasKey(x => x.PatientId);
            entity.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(x => x.LastName).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(256).IsRequired();
            entity.Property(x => x.PhoneNumber).HasMaxLength(30).IsRequired();
            entity.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL");
            entity.HasIndex(x => x.PhoneNumber);
            entity.HasOne(x => x.Practice).WithMany(x => x.Patients).HasForeignKey(x => x.PracticeId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.User).WithOne(x => x.Patient).HasForeignKey<Patient>(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Staff>(entity =>
        {
            entity.HasKey(x => x.StaffId);
            entity.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(x => x.LastName).HasMaxLength(100).IsRequired();
            entity.Property(x => x.JobTitle).HasMaxLength(100).IsRequired();
            entity.HasIndex(x => x.UserId).IsUnique();
            entity.HasOne(x => x.Practice).WithMany(x => x.StaffMembers).HasForeignKey(x => x.PracticeId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.User).WithOne(x => x.Staff).HasForeignKey<Staff>(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Dentist>(entity =>
        {
            entity.HasKey(x => x.DentistId);
            entity.HasIndex(x => x.StaffId).IsUnique();
            entity.HasOne(x => x.Staff).WithOne(x => x.Dentist).HasForeignKey<Dentist>(x => x.StaffId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Service>(entity =>
        {
            entity.HasKey(x => x.ServiceId);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.StartingPrice).HasColumnType("decimal(18,2)");
            entity.Property(x => x.BookingPaymentAmount).HasColumnType("decimal(18,2)");
            entity.HasIndex(x => new { x.PracticeId, x.Name }).IsUnique();
            entity.HasOne(x => x.Practice).WithMany(x => x.Services).HasForeignKey(x => x.PracticeId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<DentistService>(entity =>
        {
            entity.HasKey(x => new { x.DentistId, x.ServiceId });
            entity.HasOne(x => x.Dentist).WithMany(x => x.DentistServices).HasForeignKey(x => x.DentistId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Service).WithMany(x => x.DentistServices).HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AppointmentStatus>(entity =>
        {
            entity.HasKey(x => x.AppointmentStatusId);
            entity.Property(x => x.Code).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(50).IsRequired();
            entity.HasIndex(x => x.Code).IsUnique();
        });

        builder.Entity<Appointment>(entity =>
        {
            entity.HasKey(x => x.AppointmentId);
            entity.Property(x => x.BookingReference).HasMaxLength(30).IsRequired();
            entity.Property(x => x.BookingSource).HasMaxLength(50).IsRequired();
            entity.Property(x => x.PaymentMethod).HasMaxLength(30).IsRequired();
            entity.Property(x => x.PaymentStatus).HasMaxLength(30).IsRequired();
            entity.Property(x => x.AmountDueAtBooking).HasColumnType("decimal(18,2)");
            entity.Property(x => x.AmountPaid).HasColumnType("decimal(18,2)");
            entity.HasIndex(x => x.BookingReference).IsUnique();
            entity.HasIndex(x => x.PatientId);
            entity.HasIndex(x => new { x.DentistId, x.StartDateTime, x.EndDateTime, x.AppointmentStatusId });
            entity.HasOne(x => x.Practice).WithMany(x => x.Appointments).HasForeignKey(x => x.PracticeId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Patient).WithMany(x => x.Appointments).HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Dentist).WithMany(x => x.Appointments).HasForeignKey(x => x.DentistId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Service).WithMany(x => x.Appointments).HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.AppointmentStatus).WithMany(x => x.Appointments).HasForeignKey(x => x.AppointmentStatusId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<DentistAvailability>(entity =>
        {
            entity.HasKey(x => x.DentistAvailabilityId);
            entity.HasIndex(x => new { x.DentistId, x.DayOfWeek, x.EffectiveFrom });
            entity.HasOne(x => x.Dentist).WithMany(x => x.Availability).HasForeignKey(x => x.DentistId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AvailabilityException>(entity =>
        {
            entity.HasKey(x => x.AvailabilityExceptionId);
            entity.HasIndex(x => new { x.DentistId, x.StartDateTime, x.EndDateTime });
            entity.HasOne(x => x.Dentist).WithMany(x => x.AvailabilityExceptions).HasForeignKey(x => x.DentistId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PracticeHours>(entity =>
        {
            entity.HasKey(x => x.PracticeHoursId);
            entity.HasIndex(x => new { x.PracticeId, x.DayOfWeek }).IsUnique();
            entity.HasOne(x => x.Practice).WithMany(x => x.PracticeHours).HasForeignKey(x => x.PracticeId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Notification>(entity =>
        {
            entity.HasKey(x => x.NotificationId);
            entity.HasOne(x => x.Patient).WithMany(x => x.Notifications).HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Appointment).WithMany(x => x.Notifications).HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.SetNull);
        });


        builder.Entity<AppointmentPayment>(entity =>
        {
            entity.HasKey(x => x.AppointmentPaymentId);
            entity.Property(x => x.Provider).HasMaxLength(50).IsRequired();
            entity.Property(x => x.PaymentMethod).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            entity.Property(x => x.MerchantPaymentId).HasMaxLength(80).IsRequired();
            entity.Property(x => x.PayFastPaymentId).HasMaxLength(80);
            entity.Property(x => x.AmountGross).HasColumnType("decimal(18,2)");
            entity.Property(x => x.AmountFee).HasColumnType("decimal(18,2)");
            entity.Property(x => x.AmountNet).HasColumnType("decimal(18,2)");
            entity.Property(x => x.FailureReason).HasMaxLength(500);
            entity.HasIndex(x => x.MerchantPaymentId).IsUnique();
            entity.HasIndex(x => x.PayFastPaymentId).IsUnique().HasFilter("[PayFastPaymentId] IS NOT NULL");
            entity.HasIndex(x => new { x.AppointmentId, x.CreatedAtUtc });
            entity.HasOne(x => x.Appointment).WithMany(x => x.Payments).HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(x => x.AuditLogId);
            entity.HasIndex(x => new { x.UserId, x.CreatedAtUtc });
            entity.HasOne(x => x.User).WithMany(x => x.AuditLogs).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
