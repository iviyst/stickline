# Stickline

A stickman platformer: 15 acts, an endless Gauntlet, a 100-weapon store, a wardrobe, and Head to Head racing for up to four (people and CPU racers, offline or online). Plays on phone (touch), keyboard/mouse and game controller. Plain HTML, CSS and JavaScript: no build step is needed to play, and no server of your own.

## Run it

```
node tools/serve.mjs 8080      # then open http://localhost:8080
```

or upload the contents of `dist/site/` (made by `npm run build`) to any static host. For GitHub Pages: put the files in the repo root, then Settings → Pages → Deploy from branch → `main` / root.

## Players and PINs

The first screen asks who is playing. A player is a **name (3–12 characters) + a 4–6 digit PIN**, plus a **security question** you choose when you register. Forgot the name or PIN? **Forgot your name or PIN?** on the log in screen asks your own question (capital letters do not matter) and then lets you pick a new name and PIN. Your progress stays.

Each player has a separate save (coins, gems, store, wardrobe, options). An older single-player save is moved to the first player created on that browser.

**Important:** accounts live in this browser on this device (`localStorage`). They are not shared between devices, and clearing site data removes them. The PIN and the answer are stored only as salted PBKDF2-SHA-256 hashes and wrong guesses lock a name for a while, but a 4–6 digit PIN is a convenience lock, not server-grade security. Accounts that follow a player across devices would need a server (for example Firebase Authentication plus a database): that is a possible next step.

## Head to Head

* **Offline**: you plus 1–3 CPU racers (Easy / Normal / Hard each). CPU racers are real players in the simulation: traps and hazards hurt them and weapons knock them back.
* **Online**: Quick match (public rooms), Create room (share the 4-letter code), or Join with a code. Up to 4 people per room; the host can add CPU racers to empty slots. Needs the Firebase rules in `firebase/README.md`.

## Layout

```
index.html            page shell (script and style lists are generated: node tools/build.mjs html)
css/                  styles, one file per area
js/core, data, sim    constants, levels, the fixed 120 Hz simulation (no browser needed)
js/ai                 CPU racers (route planner + bot)
js/platform           storage, sound, input, DOM helper
js/auth               accounts (names, PINs, security questions) and the log in screens
js/render, ui, audio  drawing, store / wardrobe / lobby screens, music
js/game               race, menus, flow, loop, wiring, boot
js/net/online.js      online Head to Head (Firebase Realtime Database)
assets/               music and weapon art
firebase/             database rules for online play
tools/                manifest.json (load order), build.mjs, make-rules.mjs, serve.mjs
tests/                sim, accounts and rules tests
```

`tools/manifest.json` is the single list of files and their load order.

## Commands

```
npm start         serve on :8080
npm run build     check + index.html lists + dist/ (site folder, zip, single-file build)
npm test          sim, accounts and rules tests (rules need: npm i targaryen)
node tools/make-rules.mjs   regenerate firebase/stickline-rules.json from the protocol
```
