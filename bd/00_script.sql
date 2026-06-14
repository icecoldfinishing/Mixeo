DROP DATABASE IF EXISTS pg4;
CREATE DATABASE pg4;

\c pg4;

SET CLIENT_ENCODING TO 'UTF8';

CREATE TABLE users (
    id SERIAL PRIMARY KEY NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mp3_files (
    id SERIAL PRIMARY KEY NOT NULL,

    title VARCHAR(255),
    artist VARCHAR(255),
    album VARCHAR(255),
    genre VARCHAR(100),
    language VARCHAR(100), -- Column added

    year INT,
    duration INT,

    file_path TEXT UNIQUE,
    lyrics TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,

    name VARCHAR(255),
    total_duration INT DEFAULT 0,
    user_id INT REFERENCES users(id) ON DELETE CASCADE, -- Column added

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