using Microsoft.Extensions.FileProviders;
using Microsoft.EntityFrameworkCore;
using TranzactiiBancare;

var builder = WebApplication.CreateBuilder(args);

// ✅ CORS pentru Angular (local + Render)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "https://localhost:4200",
                "http://192.168.1.6:4200",
                "https://192.168.1.6:4200",
                "https://tranzactiibancaresolution.onrender.com"
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

// ✅ Rulează automat migrațiile la startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContextTranzactiiFinanciare>();
    db.Database.Migrate();
}


// ✅ Swagger doar în development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ✅ HTTPS + CORS
app.UseHttpsRedirection();
app.UseCors("AllowAngular");

app.UseAuthorization();
app.MapControllers();

// ✅ Servire Angular din wwwroot/app
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "app")
    ),
    RequestPath = ""
});

// ✅ Fallback Angular
app.MapFallbackToFile("app/index.html");

// ✅ Pornim aplicația
Console.WriteLine("🚀 Aplicația pornește...");

// 🔹 Test minimal — afișăm doar ID-ul de folder pentru verificare
var folderId = Environment.GetEnvironmentVariable("GOOGLE_DRIVE_FOLDER_ID");
if (string.IsNullOrEmpty(folderId))
    Console.WriteLine("⚠️ GOOGLE_DRIVE_FOLDER_ID nu este setat în Environment!");
else
    Console.WriteLine($"✅ GOOGLE_DRIVE_FOLDER_ID detectat: {folderId}");

// 🔹 Nu mai apelăm GoogleDriveService aici — importul se face automat din Controller
Console.WriteLine("✅ API online. Importurile CSV/PDF se fac din endpointul /api/Tranzactii/import-csv");

app.Run();
