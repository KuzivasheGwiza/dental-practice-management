using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace DentalPractice.API.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled API error");
            context.Response.ContentType = "application/json";
            var sqlError = ex;
            while (sqlError.InnerException is not null) sqlError = sqlError.InnerException;
            var concurrentConflict = sqlError is SqlException { Number: 1205 or 2601 or 2627 };
            context.Response.StatusCode = concurrentConflict ? (int)HttpStatusCode.Conflict : ex switch
            {
                InvalidOperationException => (int)HttpStatusCode.BadRequest,
                DbUpdateException => (int)HttpStatusCode.Conflict,
                _ => (int)HttpStatusCode.InternalServerError
            };

            var message = concurrentConflict ? "Another booking or update competed for this slot. Refresh availability and try again." : context.Response.StatusCode == 500
                ? "An unexpected server error occurred."
                : ex.Message;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message }));
        }
    }
}
