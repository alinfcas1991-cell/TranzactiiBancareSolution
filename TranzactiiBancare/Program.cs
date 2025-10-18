using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ✅ CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:4200",
                    "https://localhost:4200",
                    "http://192.168.1.6:4200",
                    "https://192.168.1.6:4200" // acces de pe alt device din LAN
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

// ⚠️ Dezactivăm HTTPS redirection — cauzează probleme la IP-uri locale
// app.UseHttpsRedirection();

// ✅ Servire fișiere statice (dacă vrei să expui fișiere din wwwroot)
app.UseStaticFiles();

// ✅ Activare CORS înainte de Authorization
app.UseCors("AllowAngular");

app.UseAuthorization();

app.MapControllers();

app.Run();
