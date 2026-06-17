export interface PlaylistCriteria {
    totalDuration: number | null;
    genres: string[];
    languages: string[];
    artists: string[];
    albums: string[];
    excludeGenres: string[];
    excludeArtists: string[];
    excludeAlbums: string[];
}

export interface PlaylistTrack {
    id: number;
    playlistId: number;
    mp3Id: number;
    mp3File: import('./mp3').Mp3File | null;
}

export interface Playlist {
    id: number;
    name: string;
    totalDuration: number;
    userId: number | null;
    createdAt: string;
    tracks: PlaylistTrack[];
}

export const EMPTY_CRITERIA: PlaylistCriteria = {
    totalDuration: null,
    genres: [],
    languages: [],
    artists: [],
    albums: [],
    excludeGenres: [],
    excludeArtists: [],
    excludeAlbums: [],
};

export const GENRE_SUGGESTIONS = [
    'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Jazz', 'Classical',
    'Electronic', 'Soul', 'Reggae', 'Metal', 'Folk', 'Blues',
    'Country', 'Funk', 'Latin', 'Ambient',
];

export const LANGUAGE_SUGGESTIONS = [
    'Français', 'English', 'Español', 'Portugais', 'Arabe',
    'Mandarin', 'Allemand', 'Italien', 'Japonais', 'Coréen',
];