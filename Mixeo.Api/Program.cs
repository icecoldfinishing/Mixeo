using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using Mixeo.Api.Data;

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

// Configuration du CORS pour que ton Front React puisse interroger l'API sans blocage
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();

app.MapControllers();

app.Run();