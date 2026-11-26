# Tic Tac Toe Arena

A professional, zero-dependency browser Tic Tac Toe game: seven game
modes, four AI difficulty levels (including a provably unbeatable
"Impossible" AI), full progression, achievements, synthesized audio —
built in vanilla JavaScript with three isolated production builds for
Web, Poki and CrazyGames.

> **Demo:** <!-- TODO: add live demo URL after GitHub Pages deployment -->
> **Video walkthrough:** <!-- TODO: add video link -->
> **Screenshots:** <!-- TODO: add screenshot links -->

---

## Quick start

```bash
# Run the game (dev/web version) — no install step required
python -m http.server 8000
# → open http://localhost:8000

# Run the zero-dependency test suite
npm test

# Build a production target
node build.js web        # → dist/web        (GitHub Pages)
node build.js poki       # → dist/poki       (Poki submission)
node build.js crazygames # → dist/crazygames (CrazyGames submission)
node build.js all        # → all three
```

**Requirements:** any modern browser to play; Node.js ≥ 18 only for tests
and builds. The game itself has **zero runtime dependencies**.

---

## Main technologies

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES modules), no frameworks |
| Rendering | DOM + SVG (no canvas), CSS custom properties |
| Audio | WebAudio API — all sound effects and music are synthesized at runtime; no audio files ship |
| Persistence | `localStorage` behind a versioned, corruption-safe wrapper |
| AI | Minimax with alpha-beta pruning (pure JS) |
| Testing | Custom zero-dependency Node test runner |
| Build | Plain Node script producing three isolated `dist/` targets |

---

## Game modes

| Mode | Rules |
|---|---|
| **Local Multiplayer** | Two players, one device. Loser starts next round. |
| **Play vs AI** | Classic match, four difficulties: Easy → Medium → Hard → Impossible. |
| **Endless Streak** | One loss or draw ends the run; difficulty ramps every 3 wins; rewarded-ad streak save on supported platforms. |
| **Timed Challenge** | 5 seconds per move; hesitation forfeits the turn. |
| **Challenge Mode** | 10 hand-crafted tactical puzzles with legal starting positions. |
| **Tournament** | Best-of-five; first to three wins takes the cup. |
| **Daily Challenge** | A seeded puzzle per day (deterministic from the date); build a completion streak. |

---

## AI architecture

`src/ai/engine.js` implements the search core and four personalities on
top of it.

### Minimax

Minimax explores every possible continuation of a position and scores
terminal states:

```
win  = +10 - depth   (prefer faster wins)
loss = depth - 10    (prefer slower losses)
draw = 0
```

The `depth` term is what makes the AI "smart" rather than merely legal:
given two lines that both win, it prefers the shorter one; given two
lines that both lose, it delays the loss — punishing opponents who
blunder.

### Alpha-beta pruning

Plain minimax evaluates the entire game tree. Alpha-beta pruning skips
subtrees that provably cannot influence the root decision:

- **alpha** — the best score the maximizing player already has
- **beta**  — the best score the minimizing player already has
- whenever `alpha >= beta`, the current branch is abandoned (`engine.js:74`)

With Tic Tac Toe's ~550,000-node game tree this turns a slow search into
an instant one. Move ordering (center → corners → edges, `engine.js:30`)
maximizes early cutoffs, since strong moves first cause earlier pruning.

### Difficulty personalities

| Level | Behavior |
|---|---|
| Easy | Mostly random; takes free wins ~50% of the time, blocks ~35% |
| Medium | Win → block → fork-aware heuristic; ~15% deliberate slip rate |
| Hard | Full minimax with a ~20% slip rate — strong but beatable |
| Impossible | Full alpha-beta, no slips. **Proven never to lose** by an exhaustive game-tree simulation in the test suite (human win count = 0 across every reachable position) |

The engine exposes an injectable RNG (`setAiRng`), so the test suite
runs with a fixed seed and produces identical results on every run.

---

## Event-driven architecture

`src/core/state.js` is a pure state machine — it owns no DOM. It emits
domain events (`game:start`, `move:made`, `turn:changed`, `ai:thinking`,
`timer:arm`, `game:over`) and UI modules (`screens.js`, `board.js`)
subscribe. Rendering never mutates game logic, and game logic never
touches the DOM. This separation is what makes the exhaustive AI test,
the platform adapters, and the zero-dependency test runner possible.

```
input ──► state.js ──(events)──► board.js / screens.js ──► DOM
              │
              └── aiController (injected per session)
```

---

## Platform adapter architecture

The core never imports platform code. It talks to a single `Platform`
object contract (`platform/interface.js`):

```js
init() · gameLoadingFinished() · gameplayStart() · gameplayStop()
showMidgameAd() · showRewardedAd() · getPlatformInfo()
```

`build.js` copies shared `src/` into each target plus **exactly one**
adapter:

| Target | Output | SDK |
|---|---|---|
| web | `dist/web` | none (standalone) |
| poki | `dist/poki` | Poki SDK v2 (`game-cdn.poki.com`) |
| crazygames | `dist/crazygames` | CrazyGames SDK v3 (`sdk.crazygames.com`) |

Every SDK call is failure-guarded: missing SDK, rejected init, hanging
ads (8s timeout) and ad blockers all degrade gracefully — the game keeps
running with ads simply absent. Builds are byte-verified to contain no
cross-platform SDK leakage.

---

## Testing

```bash
npm test
```

Seven suites, **1,034 assertions, reproducible across runs** (seeded
RNG — the count is identical every time):

| Suite | Covers |
|---|---|
| `rules.test.js` | all 8 win lines × both players, draw detection, move validation, immutability |
| `ai.test.js` | legality, per-difficulty behavior, **exhaustive Impossible proof**, decisive-position correctness |
| `integration.test.js` | storage corruption/schema handling, XP curve, mode/puzzle validity, all three adapters' no-SDK fallbacks |
| `crazygames-audio.test.js` | SDK mute layer + cross-adapter isolation |
| `phase1-banner.test.js` | result banner copy, ad-gate dedup/timeout/failure |
| `phase2-winline-onboarding.test.js` | win-line geometry (8 combos), tutorial persistence |
| `lifecycle.test.js` | SDK call order, start/stop pairing, dedup |

**Not covered by automated tests:** DOM interaction and visual rendering
(verified by headless-Chromium browser QA), and live portal SDK behavior
(verified only against mocks — real portal testing is still required).

---

## Known limitations

- Progress is stored per-device in `localStorage`; clearing browser data
  or switching devices does not carry progress (no cloud saves).
- The game is local-only: Local Multiplayer is pass-and-play on one
  device; there is no online multiplayer.
- Portal-specific behaviors (ad rendering, SDK lifecycle inside the
  portal iframe) require QA on the actual platforms; local verification
  uses mocks and cannot fully substitute for portal QA.
- No audio files ship — sound is synthesized at runtime. This keeps the
  build tiny but means SFX are stylistically simple oscillator tones.

---

## License

MIT
