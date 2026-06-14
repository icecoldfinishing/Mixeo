using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using Mixeo.Api.Data;
using Mixeo.Api.Services;
using Microsoft.Extensions.FileProviders; // Requis pour PhysicalFileProvider

var builder = WebApplication.CreateBuilder(args);

// Configuration des contrôleurs + Ignorer les cycles de relations dans le JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Configuration de la connexion PostgreSQL
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql("Host=localhost;Database=pg4;Username=postgres;Password=postgres"));

// Services
builder.Services.AddScoped<LyricsService>();

// Configuration du CORS pour que ton Front React puisse interroger l'API sans blocage
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        // Important : Autoriser aussi l'exposition des headers de Range pour le lecteur audio si nécessaire
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("Content-Range", "Accept-Ranges", "Content-Length");
    });
});

var app = builder.Build();

// Le CORS doit être appliqué au tout début du pipeline HTTP
app.UseCors();

// ─── CONFIGURATION POUR LE STREAMING DES MP3 ───
// On vérifie que le dossier "Uploads" existe à la racine pour éviter un crash au démarrage
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "Uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

// On expose le dossier Uploads au web
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/Uploads",
    OnPrepareResponse = ctx =>
    {
        // Indique au navigateur (Chrome/Firefox) que le serveur gère le streaming (octets par octets)
        ctx.Context.Response.Headers.Append("Accept-Ranges", "bytes");
        // Double sécurité CORS pour les fichiers physiques statiques
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
    }
});

app.MapControllers();

app.Run();