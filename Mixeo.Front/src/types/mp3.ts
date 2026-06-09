// src/types/mp3.ts
export interface Mp3File {
    id: number;
    title: string | null;
    artist: string | null;
    album: string | null;
    genre: string | null;
    language: string | null;
    year: number | null;
    duration: number | null;
    filePath: string | null;
}