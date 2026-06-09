using Microsoft.EntityFrameworkCore;
using Mixeo.Api.Models;

namespace Mixeo.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Mp3File> Mp3Files => Set<Mp3File>();
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<PlaylistTrack> PlaylistTracks => Set<PlaylistTrack>();
    public DbSet<PlaylistRule> PlaylistRules => Set<PlaylistRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 0. Table users
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(x => x.Username).HasColumnName("username");
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        // 1. Table mp3_files
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
            entity.Property(x => x.Language).HasColumnName("language");
            entity.Property(x => x.Year).HasColumnName("year");
            entity.Property(x => x.Duration).HasColumnName("duration");
            entity.Property(x => x.FilePath).HasColumnName("file_path");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        // 2. Table playlists
        modelBuilder.Entity<Playlist>(entity =>
        {
            entity.ToTable("playlists");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(x => x.Name).HasColumnName("name");
            entity.Property(x => x.TotalDuration).HasColumnName("total_duration");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            // Relation 1-N vers User
            entity.HasOne(p => p.User)
                  .WithMany(u => u.Playlists)
                  .HasForeignKey(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // 3. Table de liaison : playlist_tracks
        modelBuilder.Entity<PlaylistTrack>(entity =>
        {
            entity.ToTable("playlist_tracks");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(x => x.PlaylistId).HasColumnName("playlist_id");
            entity.Property(x => x.Mp3Id).HasColumnName("mp3_id");

            // Relation N-1 vers Playlist
            entity.HasOne(pt => pt.Playlist)
                  .WithMany(p => p.Tracks)
                  .HasForeignKey(pt => pt.PlaylistId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relation 1-1/N-1 vers Mp3File
            entity.HasOne(pt => pt.Mp3File)
                  .WithMany()
                  .HasForeignKey(pt => pt.Mp3Id)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // 4. Table playlist_rules
        modelBuilder.Entity<PlaylistRule>(entity =>
        {
            entity.ToTable("playlist_rules");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(x => x.PlaylistId).HasColumnName("playlist_id");
            entity.Property(x => x.MaxDuration).HasColumnName("max_duration");
            entity.Property(x => x.Genre).HasColumnName("genre");
            entity.Property(x => x.Artist).HasColumnName("artist");
            entity.Property(x => x.Language).HasColumnName("language");
            entity.Property(x => x.ExcludeArtist).HasColumnName("exclude_artist");
            entity.Property(x => x.ExcludeGenre).HasColumnName("exclude_genre");

            // Relation 1-1 avec la Playlist (Une playlist a une règle optionnelle)
            entity.HasOne(pr => pr.Playlist)
                  .WithOne(p => p.Rule)
                  .HasForeignKey<PlaylistRule>(pr => pr.PlaylistId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}