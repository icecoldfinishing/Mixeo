using Microsoft.EntityFrameworkCore;
using SoundFlow.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql("Host=localhost;Database=pg4;Username=postgres;Password=postgres"));

var app = builder.Build();

app.MapControllers();

app.Run();