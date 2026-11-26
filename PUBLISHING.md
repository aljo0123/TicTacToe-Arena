# Publishing Checklists

> **Important:** completing these checklists makes the game *ready for
> submission*. It does **not** mean the game has been approved or accepted
> by any portal — every portal runs its own review process.

---

## A. Normal Web (GitHub Pages / personal site)

The repository root **is** the web version — no build step required.

- [x] No platform SDK loaded (`index.html` has no Poki/CrazyGames scripts)
- [x] Works from `file://` and any static host
- [x] `favicon.svg` present and referenced
- [x] Meta description + Open Graph tags set
- [x] Responsive: 320 px → desktop verified
- [x] No analytics or network calls (privacy by default)
- [x] All features functional without any account

**Deploy (GitHub Pages):**
1. Push the repository to GitHub.
2. Settings → Pages → deploy from the main branch root.
3. Done — `https://<user>.github.io/<repo>/`.

Optional: deploy the built `dist/web` instead for a trimmed package.

---

## B. Poki

**Before submitting:**
1. Run `node build.js poki` and test `dist/poki/index.html`.
2. Read the current developer docs: https://developer.poki.com/documentation

- [ ] Upload the contents of `dist/poki` as a zip
- [x] Loads the official Poki SDK v2 (`game-cdn.poki.com/scripts/v2/poki-sdk.js`)
- [x] `PokiSDK.init()` awaited before gameplay; failure is non-fatal
- [x] `gameLoadingFinished()` called after the loading screen
- [x] `gameplayStart()` when a match begins; `gameplayStop()` when it ends
- [x] `commercialBreak()` only at natural breaks (game over / menu return),
      never mid-move
- [x] `rewardedBreak()` used for the streak-save; reward granted only on
      a `true` response
- [x] Game runs even if every SDK call fails (verified in tests)
- [ ] Add the Poki-provided site key to `PokiSDK.init()` if required at
      submission time
- [ ] Poki playtest pass on their QA staging environment

**Notes for reviewers:** the game pauses audio during ad breaks; the ad
calls always follow `gameplayStop()` as required by Poki's lifecycle rules.

---

## C. CrazyGames

**Before submitting:**
1. Run `node build.js crazygames` and test `dist/crazygames/index.html`.
2. Read the current SDK docs: https://docs.crazygames.com/sdk/html5-v3/

- [ ] Upload the contents of `dist/crazygames` via the CrazyGames
      developer portal
- [x] Loads the official CrazyGames SDK v3
      (`sdk.crazygames.com/crazygames-sdk-v3.js`)
- [x] `await CrazyGames.SDK.init()` at boot; failure is non-fatal
- [x] `sdkGameLoadingStop()` after loading completes
- [x] `gameplayStart()` / `gameplayStop()` around active gameplay
- [x] `requestAd("midgame", …)` only between games, with
      `adFinished` / `adError` both resolving the promise
- [x] `requestAd("rewarded", …)` for streak-save; reward granted ONLY
      inside the `adFinished` callback
- [x] SDK mute handling respected (the SDK controls audio during ads)
- [x] Game runs even if every SDK call fails (verified in tests)
- [ ] Set the game's category/description in the developer portal
- [ ] CrazyGames QA review pass

---

## General quality gates (all targets)

- [x] `npm test` passes (~1,800 assertions)
- [x] All three builds verified in headless Chromium with 0 console errors
- [x] No memory leaks (single subscription model, timers cleaned up)
- [x] `prefers-reduced-motion` respected
- [x] Safe-area insets honored for notched devices
- [x] No external asset requests beyond the platform SDK script

## Store listing content

- **Title:** Tic Tac Toe Arena
- **Short description:** Seven game modes. Four AI levels. One arena.
  Can you beat Impossible?
- **Long description:** A modern take on the classic — pass-and-play with
  a friend, or face an AI that ranges from friendly to literally
  unbeatable. Earn XP, unlock themes and mark styles, chase achievements,
  and keep a daily streak alive. No account. No downloads. Just play.
- **Controls:** Click/tap a cell to place your mark. `R` restarts,
  `Esc` navigates back. That's the whole manual.
- **Screenshots to capture:** main menu, mid-game vs AI, game-over
  overlay, stats panel with achievements (1920×1080 and 1024×500 banner).
