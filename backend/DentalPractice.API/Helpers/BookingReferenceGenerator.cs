namespace DentalPractice.API.Helpers;

public static class BookingReferenceGenerator
{
    public static string Create()
    {
        var suffix = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        return $"APT-{DateTime.UtcNow:yyyy}-{suffix}";
    }
}
