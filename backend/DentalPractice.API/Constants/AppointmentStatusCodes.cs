namespace DentalPractice.API.Constants;

public static class AppointmentStatusCodes
{
    public const string Pending = "PENDING";
    public const string Confirmed = "CONFIRMED";
    public const string CheckedIn = "CHECKED_IN";
    public const string InProgress = "IN_PROGRESS";
    public const string Completed = "COMPLETED";
    public const string Cancelled = "CANCELLED";
    public const string NoShow = "NO_SHOW";

    public static readonly string[] ActiveBlocking = [Pending, Confirmed, CheckedIn, InProgress];
}
