using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ✅ CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "https://localhost:4200",
                "http://192.168.1.6:4200",
                "https://192.168.1.6:4200",
                "https://tranzactiibancaresolution.onrender.com" // ✅ pentru producție (Render)
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ✅ DbContext
builder.Services.AddDbContext<AppDbContextTranzactiiFinanciare>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ✅ Swagger (dev only)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ✅ HTTPS redirection (opțional pe Render)
app.UseHttpsRedirection();

// ✅ Servire fișiere statice (inclusiv Angular în wwwroot/app)
app.UseStaticFiles();

// ✅ Activare CORS (pentru Angular)
app.UseCors("AllowAngular");

// ✅ Authorization
app.UseAuthorization();

// ✅ Mapare API controllers
app.MapControllers();

// ✅ Fallback pentru Angular (servește index.html din /app)
app.MapFallbackToFile("/app/index.html");

app.Run();
