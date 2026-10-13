using System.Text;
using DentalPractice.API.Data;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Middleware;
using DentalPractice.API.Models;
using DentalPractice.API.Options;
using DentalPractice.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.");

builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));

builder.Services.AddIdentityCore<ApplicationUser>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.User.RequireUniqueEmail = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is missing.");
if (!builder.Environment.IsDevelopment() && jwtKey.Contains("REPLACE_THIS", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("A production JWT signing key must be configured outside source control before the API can start.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var manager = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
                var user = await manager.FindByIdAsync(context.Principal!.FindFirstValue(ClaimTypes.NameIdentifier)!);
                if (user is null || !user.IsActive || context.Principal!.FindFirstValue("security_stamp") != user.SecurityStamp)
                    context.Fail("This session is no longer valid. Sign in again.");
            }
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<PortalEmailService>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.Configure<PayFastOptions>(builder.Configuration.GetSection("PayFast"));
builder.Services.AddHttpClient<IPayFastService, PayFastService>(client => client.Timeout = TimeSpan.FromSeconds(20));
builder.Services.AddHostedService<PendingPaymentExpiryWorker>();
builder.Services.AddHostedService<NotificationDeliveryWorker>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Dental Practice API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200", "https://localhost:4200"];

builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
    policy.WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseRateLimiter();
app.Use(async (context, next) =>
{
    var requireMfa = app.Configuration.GetValue<bool?>("Security:RequireStaffMfa") ?? !app.Environment.IsDevelopment();
    if (requireMfa && context.User.Identity?.IsAuthenticated == true &&
        (context.User.IsInRole("Administrator") || context.User.IsInRole("Receptionist") || context.User.IsInRole("Dentist")))
    {
        var user = await context.RequestServices.GetRequiredService<UserManager<ApplicationUser>>()
            .FindByIdAsync(context.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var path = context.Request.Path.Value ?? "";
        var enrollmentPath = path is "/api/auth/security" or "/api/auth/mfa/setup" or "/api/auth/mfa/enable";
        if (user is { TwoFactorEnabled: false } && !enrollmentPath)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new { message = "Enable authenticator protection on the Security page before using the staff portal." });
            return;
        }
    }
    await next();
});
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
    await DbSeeder.InitializeAsync(scope.ServiceProvider, app.Configuration);

app.Run();
