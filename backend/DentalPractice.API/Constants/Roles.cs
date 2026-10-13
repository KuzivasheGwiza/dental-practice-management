namespace DentalPractice.API.Constants;

public static class Roles
{
    public const string Patient = "Patient";
    public const string Receptionist = "Receptionist";
    public const string Dentist = "Dentist";
    public const string Administrator = "Administrator";

    public static readonly string[] All = [Patient, Receptionist, Dentist, Administrator];
}
