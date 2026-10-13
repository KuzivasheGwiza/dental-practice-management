namespace DentalPractice.API.Constants;

public static class PaymentMethods
{
    public const string PayFast = "PAYFAST";
    public const string CashAtPractice = "CASH_AT_PRACTICE";

    public static readonly string[] All = [PayFast, CashAtPractice];
}

public static class PaymentStatuses
{
    public const string Pending = "PENDING";
    public const string Paid = "PAID";
    public const string CashDue = "CASH_DUE";
    public const string Failed = "FAILED";
    public const string Cancelled = "CANCELLED";
    public const string Expired = "EXPIRED";
    public const string PaidReviewRequired = "PAID_REVIEW_REQUIRED";
}
