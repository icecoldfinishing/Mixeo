DROP DATABASE IF EXISTS pg4;
CREATE DATABASE pg4;

\c pg4;

CREATE TABLE mp3_files (
    id SERIAL PRIMARY KEY NOT NULL,

    title VARCHAR(255),
    artist VARCHAR(255),
    album VARCHAR(255),
    genre VARCHAR(100),

    year INT,
    duration INT,

    file_path TEXT UNIQUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,

    name VARCHAR(255),
    total_duration INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist_tracks (
    id SERIAL PRIMARY KEY,

    playlist_id INT REFERENCES playlists(id) ON DELETE CASCADE,
    mp3_id INT REFERENCES mp3_files(id) ON DELETE CASCADE
);

CREATE TABLE playlist_rules (
    id SERIAL PRIMARY KEY,

    playlist_id INT REFERENCES playlists(id) ON DELETE CASCADE,

    max_duration INT,
    genre VARCHAR(100),
    artist VARCHAR(255),
    language VARCHAR(50),

    exclude_artist TEXT,
    exclude_genre TEXT
);

select*from mp3_files;