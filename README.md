# All-in-One Tracker (PWA) v2

What's in v2: a wallet (deposits plus a live "Amount Left" bar), a library of 89 exercises with search and custom ones, and a game layer (Koin the coin mascot, XP and levels, 13 trophies, daily quests, PR celebrations).

An installable web app for spending, gym sets and habits. It needs no build step and no external libraries, and it works offline.
Data is stored on the device (IndexedDB). Use **Settings → Download backup** to back it up or move it to another device.

## Files
- `index.html`, `styles.css`: the app shell and design
- `app.js`: all screens (Spend, Gym, Habits, History, Insights, Settings)
- `charts.js`: hand-made SVG charts (bars, line, donut, ring)
- `art.js`: Koin the mascot (SVG) and confetti
- `db.js`: IndexedDB storage
- `defaults.js`: starting categories/budgets/colors, the exercise library, habits and deposit sources
- `sw.js` + `manifest.webmanifest` + `icons/`: offline support and install

## Run locally
    python3 -m http.server 8000      # then open http://localhost:8000

## Host free on GitHub Pages
1. Create a new GitHub repo and upload these files (keep the folder structure).
2. Go to Settings → Pages → "Deploy from a branch" → `main` / root.
3. Open `https://<you>.github.io/<repo>/` on your phone, then use Add to Home Screen.

Netlify Drop (drag the folder onto app.netlify.com/drop) or Cloudflare Pages work the same way.

## Updating an existing site
Upload the new files to the same site (GitHub: Add file → Upload files; Netlify: drag the folder onto the Deploys tab). Your logged data stays, because it lives on the phone under the same link.
After changing files, bump `VERSION` in `sw.js` so phones pick up the new version. Close and reopen the app once to see it.
