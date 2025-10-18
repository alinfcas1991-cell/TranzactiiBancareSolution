using Microsoft.Extensions.FileProviders;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL; // ✅ adăugat pentru PostgreSQL

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
                "https://tranzactiibancaresolution.onrender.com" // pentru producție (Render)
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ✅ DbContext (PostgreSQL)
builder.Services.AddDbContext<AppDbContextTranzactiiFinanciare>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

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

// ✅ (opțional, îl putem lăsa activ)
app.UseHttpsRedirection();

// ✅ Activăm CORS (pentru Angular)
app.UseCors("AllowAngular");

app.UseAuthorization();

app.MapControllers();

// ✅ Servire fișiere statice din wwwroot/app
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "app")
    ),
    RequestPath = ""
});

// ✅ Fallback către Angular index.html
app.MapFallbackToFile("app/index.html");

app.Run();
