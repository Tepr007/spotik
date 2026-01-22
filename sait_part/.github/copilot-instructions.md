### Purpose
This repository is a lightweight Node + static frontend music server that delegates heavy lifting to Python scripts. The instructions below highlight project structure, runtime expectations, important conventions, and common developer workflows so an AI coding agent can be productive immediately.

### Big-picture architecture
- **Server:** `server/server.js` — Express app that serves `public/` and exposes JSON endpoints. It also spawns Python scripts for playlist/track operations and recommendations.
- **Frontend:** `public/` — static single-page UI (`index.html`) built from small modular scripts: `script.js`, `player.js`, `track-logic.js`, `playlist-list.js`, `track-list.js`, `playback-order.js`, `add-playlist.js`, `add-track.js`, `settings.js`.
- **Data & Python:** Several JSON files and the `python_part` scripts live outside this folder (parent directory). The server expects `passwords.json`, `playlists.json`, `tracks.json`, `tracks_without_cover.json`, and a `music/` directory adjacent to the repo root (see “Paths”).

### Important paths and runtime expectations
- **Static root:** `public/` is served by `server/server.js`.
- **Config/data files:** expected in the parent directory of the repo root:
  - `../passwords.json`
  - `../playlists.json`
  - `../tracks.json`
  - `../tracks_without_cover.json`
  - `../music/` (static music files served on `/music`)
- **Python integration:** server calls Python scripts from `../python_part/*` and expects a Python interpreter at `../.venv/Scripts/python.exe` (this is a relative path used by `runPython()` in `server/server.js`). If your Python environment is elsewhere, update `runPython()` or create the expected virtualenv.

### How the frontend and server communicate
- Frontend lists playlists and tracks by calling `/playlists` and `/tracks` (optionally `?playlist=NAME`).
- Adding operations: POST `/add_playlist`, POST `/add_track`, POST `/add_track_to_playlist` — these calls require a password validated against `passwords.json` (see `checkPassword()` in `server/server.js`).
- Recommendation flow: POST `/next_neuro_track` calls `python_part/neuro_rec.py` and expects a numeric track id in the script output.

### Developer workflows and commands
- Install node deps: run `npm install` in the repo root to populate `node_modules`.
- Start server (developer pattern used in workspace):
  - Prefer: `node server/server.js` or `npx nodemon server/server.js` for auto-restart.
  - Note: `package.json` currently defines `start` as `node server.js` (which will fail because `server.js` is in `server/`). Use the explicit command above or update `package.json`.
- Python: ensure the Python virtualenv path used by `runPython()` exists or change the path. Run Python scripts manually from the `python_part` folder if needed.

### Conventions & data shapes (discoverable from code)
- **Track object (in `tracks.json`)**: expected fields include `id` (numeric), `file` (filepath relative to `music/`), `name`, `author`, `album`.
- **Playlists (`playlists.json`)**: map from playlist name -> array of track ids (numbers). Server code filters and orders tracks according to that array.
- **Authentication:** `passwords.json` maps action names to passwords. All write or destructive endpoints call `checkPassword(action, password)`.

### Common gotchas & troubleshooting
- Port is set to `80` in `server/server.js`. Running on port 80 may require admin rights on some OSes — change `port` or run with appropriate permissions.
- The server uses absolute-relative paths that point to files outside the repo. If tests or local dev don't find `tracks.json`/`playlists.json`, check the parent directory of the repo root.
- If recommendation Python scripts output non-numeric lines, `next_neuro_track` will fail — the server parses the penultimate output line into a Number.

### Where to look first when making changes
- Edit UI behavior in `public/track-logic.js` and `public/player.js` (audio flow and UI state).
- API routing logic and integrations: `server/server.js` (endpoints, file I/O, Python calls).
- Playlist/track data expectations: `tracks.json` and `playlists.json` in the parent directory.

### Testing and debugging tips for agents
- Use `curl` or `httpie` to query HTTP endpoints (examples):
  - `curl http://localhost:PORT/playlists`
  - `curl 'http://localhost:PORT/tracks?playlist=MyList'`
- To debug Python integration, run the Python scripts directly from `python_part` with the same args the server passes (inspect `server/server.js` to see arguments).

### When to ask for human guidance
- If the parent-folder data files or the Python virtualenv are missing, ask the human to provide them or indicate a different path.
- If you need to change the port to something <>80 for local testing, confirm the preferred port.

If anything above is unclear or you want the instructions expanded (examples of API payloads, suggested package.json fix, or a short README), tell me which section to expand.
