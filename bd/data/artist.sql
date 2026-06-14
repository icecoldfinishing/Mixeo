TRUNCATE TABLE mp3_files CASCADE;

INSERT INTO mp3_files (title, artist, album, genre, language, year, duration) VALUES
-- ==========================================
-- ARTISTE 1 : Akon (4 morceaux)
-- ==========================================
('Lonely (Official Video)', 'Akon', 'Trouble', 'R&B', 'en', 2004, 235),
('Smack That ft. Eminem', 'Akon', 'Konvicted', 'R&B', 'en', 2006, 212),
('Locked Up [Clean Version]', 'Akon', 'Trouble', 'R&B', 'en', 2004, 236),
('Right Now (Na Na Na)', 'Akon', 'Freedom', 'Pop', 'en', 2008, 241),

-- ==========================================
-- ARTISTE 2 : Stromae (4 morceaux)
-- ==========================================
('Papaoutai (Clip Officiel)', 'Stromae', 'Racine Carree', 'Pop', 'fr', 2013, 232),
('Alors on danse', 'Stromae', 'Cheese', 'Dance', 'fr', 2010, 206),
('Formidable', 'Stromae', 'Racine Carree', 'Pop', 'fr', 2013, 213),
('Sante [Audio]', 'Stromae', 'Multitude', 'Pop', 'fr', 2021, 191),

-- ==========================================
-- ARTISTE 3 : The Weeknd (4 morceaux)
-- ==========================================
('Blinding Lights (Lyrics)', 'The Weeknd', 'After Hours', 'Pop', 'en', 2020, 200),
('Save Your Tears', 'The Weeknd', 'After Hours', 'Pop', 'en', 2020, 215),
('Starboy [GGcHf7bkt2U]', 'The Weeknd', 'Starboy', 'R&B', 'en', 2016, 230),
('The Hills (Official)', 'The Weeknd', 'Beauty Behind the Madness', 'R&B', 'en', 2015, 242),

-- ==========================================
-- ARTISTE 4 : Gims (4 morceaux)
-- ==========================================
('Sapes comme jamais (feat. Niska)', 'Gims', 'Mon coeur avait raison', 'Rap', 'fr', 2015, 206),
('Bella', 'Gims', 'Subliminal', 'Pop', 'fr', 2013, 252),
('Est-ce que tu m''aimes ?', 'Gims', 'Mon coeur avait raison', 'Pop', 'fr', 2015, 237),
('Tout donner [Clip]', 'Gims', 'Mon coeur avait raison', 'Pop', 'fr', 2016, 203),

-- ==========================================
-- ARTISTE 5 : Burna Boy (4 morceaux)
-- ==========================================
('Last Last [Official Audio]', 'Burna Boy', 'Love, Damini', 'Afrobeat', 'en', 2022, 172),
('On the Low', 'Burna Boy', 'African Giant', 'Afrobeat', 'en', 2019, 185),
('Ye', 'Burna Boy', 'Outside', 'Afrobeat', 'en', 2018, 231),
('City Boys (Lyrics Video)', 'Burna Boy', 'I Told Them...', 'Afrobeat', 'en', 2023, 153);

select*from mp3_files;