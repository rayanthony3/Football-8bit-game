# GridIron 8-Bit 🏈

An 8-bit American football game inspired by classic arcade sports titles.

## Features
- Two full teams (52-player rosters each)
- Full game cycle: coin toss → kickoff → 4 quarters → halftime → game over
- Offense: 14 plays (runs, passes, kick plays)
- Defense: 8 schemes (coverage, blitz, front)
- Choose any position to control (QB, RB, WR, TE, OL, DE, DT, LB, CB, Safety, K, P)
- CPU handles all other players automatically
- Auto player rotations based on fatigue
- Individual player stats (Speed, Strength, Awareness, Agility, Stamina + position-specific)
- 8-bit pixel art style field and players
- Mobile touch controls (D-pad + action buttons)
- Scoring: TDs (6+1), Field Goals (3), Safeties (2)

## Tech Stack
- [Phaser 3](https://phaser.io/) — HTML5 game framework
- [Vite](https://vitejs.dev/) — Build tool
- [Capacitor](https://capacitorjs.com/) — iOS/Android wrapper

## Getting Started

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

## Deploy to iOS

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

Then build and submit via Xcode following Apple App Store guidelines.

## App Store Compliance
- No in-app purchases or external payment links
- No advertising or tracking SDKs
- No network requests (fully offline)
- Supports all iOS screen sizes via responsive scaling
- Safe for all ages (4+)
- Privacy policy included (see PRIVACY.md)

## Gameplay Controls

**Offense (your turn to possess the ball):**
- Tap `PLAY CALL` to open the playbook
- Select a run, pass, or kick play
- Press `● SNAP` to hike the ball
- Use D-pad to move your player
- Press `●` to throw (passing plays) or burst (running plays)

**Defense:**
- Select a defensive scheme from the playbook
- Control your chosen position player with the D-pad
- Press `●` to dive/tackle

## Project Structure

```
src/
├── main.js           — Phaser game config & entry
├── config.js         — All constants, colors, play definitions
├── data/
│   └── teams.js      — Team/roster/player generation (52 players × 2 teams)
├── scenes/
│   ├── BootScene.js      — Asset generation & loading
│   ├── MenuScene.js      — Title screen
│   ├── SetupScene.js     — Team + position selection
│   ├── GameScene.js      — Main gameplay loop
│   ├── PlayCallScene.js  — Play selection overlay
│   ├── HalfTimeScene.js  — Halftime stats
│   └── GameOverScene.js  — Final score & MVP
├── systems/
│   ├── GameState.js      — Game state (score, down, clock, possession)
│   ├── RosterSystem.js   — Fatigue, rotations, effective ratings
│   └── AISystem.js       — CPU play calling & play resolution
└── graphics/
    └── Sprites.js        — Procedural pixel art textures
```
