# Implementation Plan - Multi-user support, enhanced generation, playlist editing, download & playback

We will add authentication (Sign Up / Login), associate playlists to specific users, support advanced metadata filters (including languages, list of genres, list of artists, and exclusion criteria), allow post-generation edits (adding, deleting, replacing, auto-recalculating duration), enable file streaming, and zip playlist downloads.

## User Review Required

> [!IMPORTANT]
> **Database Changes**: 
> As requested, we will update `00_script.sql` with the new schema containing the `users` table and adding `user_id` foreign keys. You will apply the script manually.
> 
> **Web UI Premium Feel**:
> We will upgrade the frontend React application with a dark mode modern interface, smooth micro-animations, clean tab routing, and responsive dashboard view.

## Proposed Changes

### Database

#### [MODIFY] [00_script.sql](file:///d:/L3/GProjet/Mixeo/bd/00_script.sql)
- Create `users` table (id, username, password_hash, created_at).
- Modify `playlists` table to include `user_id INT REFERENCES users(id) ON DELETE CASCADE`.
- Add `language` column to `mp3_files` (since we need "langues autorisées" filter).

---

### Backend (C# API)

#### [NEW] [User.cs](file:///d:/L3/GProjet/Mixeo/Mixeo.Api/Models/User.cs)
Define the `User` class mapping.

#### [MODIFY] [Mp3File.cs](file:///d:/L3/GProjet/Mixeo/Mixeo.Api/Models/Mp3File.cs)
Add `Language` property to `Mp3File`.

#### [MODIFY] [Playlist.cs](file:///d:/L3/GProjet/Mixeo/Mixeo.Api/Models/Playlist.cs)
Add `UserId` and reference property.

#### [MODIFY] [AppDbContext.cs](file:///d:/L3/GProjet/Mixeo/Mixeo.Api/Data/AppDbContext.cs)
- Register `DbSet<User>`.
- Configure entity relationships for `User` to `Playlist`.

#### [NEW] [AuthController.cs](file:///d:/L3/GProjet/Mixeo/Mixeo.Api/Controllers/AuthController.cs)
Provide standard Sign-Up and Login endpoints (using password hashing or simple hash for testing, returning token or user object).

#### [MODIFY] [Mp3Controller.cs](file:///d:/L3/GProjet/Mixeo/Mixeo.Api/Controllers/Mp3Controller.cs)
Add support for the new `Language` property in Upload, Update, and Model mappings.

#### [MODIFY] [PlaylistController.cs](file:///d:/L3/GProjet/Mixeo/Mixeo.Api/Controllers/PlaylistController.cs)
- Update Generation logic to match detailed criteria (e.g. split/parse lists of genres/languages/artists).
- Update save endpoint to bind the playlist to the logged-in `userId`.
- Add playlist modifications endpoints:
  - `POST /api/playlists/{id}/tracks/add` (adds track, recalculates duration)
  - `POST /api/playlists/{id}/tracks/remove` (removes track, recalculates duration)
  - `POST /api/playlists/{id}/tracks/replace` (replaces track, recalculates duration)
- Update GET endpoint to filter playlists by `userId`.

---

### Frontend (React App)

#### [MODIFY] [mp3.ts](file:///d:/L3/GProjet/Mixeo/Mixeo.Front/src/types/mp3.ts)
Add `language` property to `Mp3File` type.

#### [MODIFY] [playlist.ts](file:///d:/L3/GProjet/Mixeo/Mixeo.Front/src/types/playlist.ts)
Update structures to reflect backend model fields and types.

#### [NEW] [Auth.tsx](file:///d:/L3/GProjet/Mixeo/Mixeo.Front/src/components/Auth.tsx)
Build a beautiful Sign In / Sign Up component using a modern glassmorphic look.

#### [MODIFY] [App.tsx](file:///d:/L3/GProjet/Mixeo/Mixeo.Front/src/App.tsx)
- Integrate authentication state context or local storage handler.
- Restrict views to logged-in users, otherwise show `Auth` screen.

#### [MODIFY] [PlaylistBuilder.tsx](file:///d:/L3/GProjet/Mixeo/Mixeo.Front/src/components/Playlistbuilder.tsx)
- Add complete controls to query the new generation fields.
- Integrate post-generation editing tools (adding track manually, removing track, replacing track with recommendations, renaming).
- Connect API integration for saving, streaming playback, and ZIP/metadata downloads.

## Verification Plan

### Automated/Manual tests
- Verify compilation of C# API.
- Test login/registration flow.
- Test playlist generation with filters.
- Test downloading ZIP package.
