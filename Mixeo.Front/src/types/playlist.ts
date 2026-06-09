export interface PlaylistCriteria {
    totalDuration: number | null;       // en minutes
    genres: string[];                   // genres souhaités
    languages: string[];                // langues souhaitées
    artists: string[];                  // artistes souhaités
    excludedGenres: string[];           // genres exclus
    excludedArtists: string[];          // artistes exclus
}

export interface Playlist {
    id: number;
    name: string;
    criteria: PlaylistCriteria;
    trackIds: number[];
    createdAt: string;
}

export const EMPTY_CRITERIA: PlaylistCriteria = {
    totalDuration: null,
    genres: [],
    languages: [],
    artists: [],
    excludedGenres: [],
    excludedArtists: [],
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