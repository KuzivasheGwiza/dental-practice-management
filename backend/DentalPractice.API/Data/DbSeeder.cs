using DentalPractice.API.Constants;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Data;

public static class DbSeeder
{
    public static async Task InitializeAsync(IServiceProvider services, IConfiguration configuration)
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        await db.Database.EnsureCreatedAsync();
        if (!await db.PortalContents.AnyAsync())
        {
            db.PortalContents.Add(new PortalContent());
            await db.SaveChangesAsync();
        }

        foreach (var role in Roles.All)
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));

        var practice = await db.Practices.OrderBy(x => x.PracticeId).FirstOrDefaultAsync();
        if (practice is null)
        {
            practice = new Practice
            {
                Name = configuration["SeedData:PracticeName"] ?? "Dental Practice",
                Email = "info@dental.local",
                Phone = "+27 00 000 0000",
                WhatsAppNumber = "+27 00 000 0000",
                City = "Johannesburg",
                Province = "Gauteng"
            };
            db.Practices.Add(practice);
            await db.SaveChangesAsync();
        }

        if (!await db.AppointmentStatuses.AnyAsync())
        {
            db.AppointmentStatuses.AddRange(
                new AppointmentStatus { Code = AppointmentStatusCodes.Pending, Name = "Pending", DisplayOrder = 1 },
                new AppointmentStatus { Code = AppointmentStatusCodes.Confirmed, Name = "Confirmed", DisplayOrder = 2 },
                new AppointmentStatus { Code = AppointmentStatusCodes.CheckedIn, Name = "Checked In", DisplayOrder = 3 },
                new AppointmentStatus { Code = AppointmentStatusCodes.InProgress, Name = "In Progress", DisplayOrder = 4 },
                new AppointmentStatus { Code = AppointmentStatusCodes.Completed, Name = "Completed", DisplayOrder = 5 },
                new AppointmentStatus { Code = AppointmentStatusCodes.Cancelled, Name = "Cancelled", DisplayOrder = 6 },
                new AppointmentStatus { Code = AppointmentStatusCodes.NoShow, Name = "No Show", DisplayOrder = 7 });
            await db.SaveChangesAsync();
        }

        if (!await db.Services.AnyAsync(x => x.PracticeId == practice.PracticeId))
        {
            db.Services.AddRange(
                new Service { PracticeId = practice.PracticeId, Name = "General Check-up", Description = "Routine dental examination and oral health assessment.", DefaultDurationMinutes = 30, DisplayOrder = 1 },
                new Service { PracticeId = practice.PracticeId, Name = "Dental Cleaning", Description = "Professional scale and clean appointment.", DefaultDurationMinutes = 45, DisplayOrder = 2 },
                new Service { PracticeId = practice.PracticeId, Name = "Teeth Whitening", Description = "Cosmetic whitening consultation and treatment.", DefaultDurationMinutes = 60, DisplayOrder = 3 },
                new Service { PracticeId = practice.PracticeId, Name = "Root Canal", Description = "Root canal consultation or treatment session.", DefaultDurationMinutes = 90, DisplayOrder = 4 },
                new Service { PracticeId = practice.PracticeId, Name = "Tooth Extraction", Description = "Assessment and extraction appointment.", DefaultDurationMinutes = 60, DisplayOrder = 5 },
                new Service { PracticeId = practice.PracticeId, Name = "Mouthguard", Description = "Custom mouthguard consultation and fitting.", DefaultDurationMinutes = 30, DisplayOrder = 6 },
                new Service { PracticeId = practice.PracticeId, Name = "Emergency Consultation", Description = "Urgent dental assessment. Availability is subject to confirmation.", DefaultDurationMinutes = 30, IsEmergencyService = true, DisplayOrder = 7 });
            await db.SaveChangesAsync();
        }

        if (!await db.PracticeHours.AnyAsync(x => x.PracticeId == practice.PracticeId))
        {
            var hours = new List<PracticeHours>();
            foreach (var day in Enum.GetValues<DayOfWeek>())
            {
                if (day == DayOfWeek.Sunday)
                    hours.Add(new PracticeHours { PracticeId = practice.PracticeId, DayOfWeek = day, IsClosed = true });
                else if (day == DayOfWeek.Saturday)
                    hours.Add(new PracticeHours { PracticeId = practice.PracticeId, DayOfWeek = day, OpeningTime = new TimeOnly(8, 0), ClosingTime = new TimeOnly(13, 0) });
                else
                    hours.Add(new PracticeHours { PracticeId = practice.PracticeId, DayOfWeek = day, OpeningTime = new TimeOnly(8, 30), ClosingTime = new TimeOnly(17, 0) });
            }
            db.PracticeHours.AddRange(hours);
            await db.SaveChangesAsync();
        }

        await db.SaveChangesAsync();

        var hostEnvironment = services.GetRequiredService<IHostEnvironment>();
        var seedDemoUsers = hostEnvironment.IsDevelopment() || configuration.GetValue<bool>("SeedData:EnableDemoUsers");
        if (!seedDemoUsers)
            return;

        var admin = await SeedUserAsync(userManager,
            configuration["SeedData:AdminEmail"] ?? "admin@dental.local",
            configuration["SeedData:AdminPassword"] ?? "ChangeMe123!",
            "+27000000001", Roles.Administrator);
        await SeedStaffProfileAsync(db, practice.PracticeId, admin, "System", "Administrator", "Administrator");

        var receptionist = await SeedUserAsync(userManager,
            configuration["SeedData:ReceptionistEmail"] ?? "reception@dental.local",
            configuration["SeedData:ReceptionistPassword"] ?? "ChangeMe123!",
            "+27000000002", Roles.Receptionist);
        await SeedStaffProfileAsync(db, practice.PracticeId, receptionist, "Practice", "Receptionist", "Receptionist");

        var dentistUser = await SeedUserAsync(userManager,
            configuration["SeedData:DentistEmail"] ?? "dentist@dental.local",
            configuration["SeedData:DentistPassword"] ?? "ChangeMe123!",
            "+27000000003", Roles.Dentist);
        var dentistStaff = await SeedStaffProfileAsync(db, practice.PracticeId, dentistUser, "Demo", "Dentist", "Dentist");

        var dentist = await db.Dentists.SingleOrDefaultAsync(x => x.StaffId == dentistStaff.StaffId);
        if (dentist is null)
        {
            dentist = new Dentist
            {
                StaffId = dentistStaff.StaffId,
                Qualifications = "BDS",
                Bio = "Replace this demo biography with the dentist's approved professional profile.",
                IsActive = true
            };
            db.Dentists.Add(dentist);
            await db.SaveChangesAsync();
        }

        var servicesList = await db.Services.Where(x => x.PracticeId == practice.PracticeId).ToListAsync();
        foreach (var service in servicesList)
            if (!await db.DentistServices.AnyAsync(x => x.DentistId == dentist.DentistId && x.ServiceId == service.ServiceId))
                db.DentistServices.Add(new DentistService { DentistId = dentist.DentistId, ServiceId = service.ServiceId, IsActive = true });

        await db.SaveChangesAsync();

        if (!await db.DentistAvailabilities.AnyAsync(x => x.DentistId == dentist.DentistId))
        {
            var effectiveFrom = DateOnly.FromDateTime(DateTime.Today);
            foreach (var day in new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday })
            {
                db.DentistAvailabilities.Add(new DentistAvailability { DentistId = dentist.DentistId, DayOfWeek = day, StartTime = new TimeOnly(8, 30), EndTime = new TimeOnly(12, 30), EffectiveFrom = effectiveFrom });
                db.DentistAvailabilities.Add(new DentistAvailability { DentistId = dentist.DentistId, DayOfWeek = day, StartTime = new TimeOnly(13, 30), EndTime = new TimeOnly(17, 0), EffectiveFrom = effectiveFrom });
            }
            db.DentistAvailabilities.Add(new DentistAvailability { DentistId = dentist.DentistId, DayOfWeek = DayOfWeek.Saturday, StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(13, 0), EffectiveFrom = effectiveFrom });
        }

        await db.SaveChangesAsync();
    }

    private static async Task<ApplicationUser> SeedUserAsync(UserManager<ApplicationUser> userManager, string email, string password, string phone, string role)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser { UserName = email, Email = email, PhoneNumber = phone, EmailConfirmed = true, IsActive = true, LockoutEnabled = true };
            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        if (!user.LockoutEnabled)
        {
            user.LockoutEnabled = true;
            await userManager.UpdateAsync(user);
        }

        if (!await userManager.IsInRoleAsync(user, role))
            await userManager.AddToRoleAsync(user, role);

        return user;
    }

    private static async Task<Staff> SeedStaffProfileAsync(ApplicationDbContext db, int practiceId, ApplicationUser user, string firstName, string lastName, string jobTitle)
    {
        var staff = await db.Staff.SingleOrDefaultAsync(x => x.UserId == user.Id);
        if (staff is not null) return staff;

        staff = new Staff
        {
            PracticeId = practiceId,
            UserId = user.Id,
            FirstName = firstName,
            LastName = lastName,
            JobTitle = jobTitle,
            IsActive = true
        };
        db.Staff.Add(staff);
        await db.SaveChangesAsync();
        return staff;
    }
}
