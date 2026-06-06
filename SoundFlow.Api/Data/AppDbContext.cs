using Microsoft.EntityFrameworkCore;
using SoundFlow.Api.Models;

namespace SoundFlow.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Mp3File> Mp3Files => Set<Mp3File>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Mp3File>(entity =>
        {
            entity.ToTable("mp3_files");

            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id)
                  .HasColumnName("id")
                  .ValueGeneratedOnAdd();

            entity.Property(x => x.Title).HasColumnName("title");
            entity.Property(x => x.Artist).HasColumnName("artist");
            entity.Property(x => x.Album).HasColumnName("album");
            entity.Property(x => x.Genre).HasColumnName("genre");
            entity.Property(x => x.Year).HasColumnName("year");
            entity.Property(x => x.Duration).HasColumnName("duration");
            entity.Property(x => x.FilePath).HasColumnName("file_path");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        });
    }
}