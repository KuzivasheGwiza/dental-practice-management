using System.Net;
using DentalPractice.API.DTOs.Payments;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Http;

namespace DentalPractice.API.Interfaces;

public interface IPayFastService
{
    bool IsConfigured(out string reason);
    PayFastCheckoutDto CreateCheckout(Appointment appointment, AppointmentPayment payment, Patient patient, Service service);
    Task<bool> ValidateItnAsync(IFormCollection form, string rawParameterString, IPAddress? remoteIpAddress, CancellationToken cancellationToken = default);
    string BuildParameterString(IEnumerable<KeyValuePair<string, string>> values, bool includePassphrase);
}
