# CrazyGames Portal QA Checklist — Tic Tac Toe Arena v3.2

> Use this while testing the game **inside the CrazyGames QA environment**
> (developer portal preview or staging URL). Local tests cannot execute
> the real SDK bundle, so everything marked [PORTAL] below can only be
> confirmed there.

---

## 1. SDK lifecycle [PORTAL]

Open the browser console with SDK debug logging enabled and verify the
exact call order:

- [ ] `init()` — fires once at page load, before the loading screen ends
- [ ] `game.settings.muteAudio` — read at init (no console error)
- [ ] `addSettingsChangeListener` — registered exactly once
- [ ] `sdkGameLoadingStop()` — fires when the loading screen dismisses
      (~1s after load), NOT before the game is actually playable
- [ ] `gameplayStart()` — fires when a match begins (Play Now, mode card,
      or rematch) — **exactly once per game start, no duplicates**
- [ ] `gameplayStop()` — fires when a game ends (banner appears) and when
      leaving to the lobby — **no duplicate on double-click**
- [ ] Order invariant: every `gameplayStop` is preceded by a
      `gameplayStart`; consecutive game sessions produce
      start→stop→start→stop with no interleaving errors
- [ ] No calls to `happytime()` in the normal flow (reserved for future
      milestone celebrations)
- [ ] A full session produces NO unhandled promise rejections from the SDK

## 2. Advertisements [PORTAL]

- [ ] NO midgame ad fires while the result banner is visible
- [ ] Ad is requested only after the banner is dismissed via Home or
      Change Mode
- [ ] Clicking Home twice quickly does NOT request two ads
      (deduplication — the gate allows one request per dismissal)
- [ ] If the ad fails/times out, the lobby still appears and the player
      can start a new game (navigation never blocks)
- [ ] Rewarded-ad streak save (Endless Streak mode): the streak is
      restored ONLY after `adFinished`; if `adError` fires, the streak
      ends normally and no reward is granted
- [ ] Ad break does not desync game audio (audio resumes per the SDK's
      mute handling)

## 3. Audio muting [PORTAL]

- [ ] With the portal's global mute OFF, game SFX and optional music
      play normally
- [ ] Toggling the portal mute ON silences everything immediately
- [ ] Toggling the portal mute OFF restores exactly the user's previous
      in-game audio settings (volumes unchanged, manual mute state
      respected)
- [ ] In-game sound toggle (🔊 button) works independently of the portal
      mute; the two layers don't fight each other
- [ ] Audio state survives a rematch (no stuck silence or double audio)

## 4. Loading & first impression [PORTAL]

- [ ] Loading screen shows the logo with the glow backdrop, then
      dismisses within ~2s on portal hosting
- [ ] First-time players see the 3-step onboarding over the lobby
      (Tap a cell → Three in a row → Try the modes) with working
      Skip/Continue and progress dots
- [ ] `localStorage` persistence: after skipping or completing,
      reloading the page does NOT re-show the tutorial
- [ ] Lobby renders at 1920×1080, 1366×768 and 1280×800 with the PLAY
      button above the fold

## 5. Gameplay spot-check [PORTAL]

- [ ] Play Now (one click) → board with turn indicator "Your Turn"
- [ ] Each of the four difficulties launches and shows its label
      (MEDIUM/HARD/IMPOSSIBLE) in the match strip
- [ ] All seven modes launch: Local, vs AI, Endless Streak, Timed,
      Challenge, Tournament, Daily
- [ ] Win: animated stroke draws across the three winning cells and the
      cells highlight; banner shows "You Win!" with board visible below
- [ ] Draw: no win line; banner says "Draw!"
- [ ] Loss vs AI: banner says "AI Wins"; status shows MATCH OVER
- [ ] Rematch alternates who moves first
- [ ] Restart and Home buttons work from every state; controls hide
      while the banner is open
- [ ] Stats panel shows accurate games/wins/streaks; achievements unlock
- [ ] Settings: volume sliders, sound/music toggles, four board themes
      and three mark styles unlock by level and apply visually

## 6. Mobile / responsive [PORTAL]

- [ ] 390×844 (iPhone-class): no horizontal scrolling, board fits the
      viewport, all buttons reachable, lobby PLAY button visible without
      scrolling
- [ ] 844×390 (landscape): playable; board scales down
- [ ] 768×1024 (tablet): layout stays centered; no stretched elements
- [ ] Touch targets ≥ 48px on all interactive elements
- [ ] Double-tap on the board doesn't zoom the page
- [ ] Safe-area insets respected on notched devices

## 7. Robustness [PORTAL]

- [ ] Block the SDK (devtools → block request): game still loads, plays,
      and completes a match (graceful degradation)
- [ ] Refresh mid-game: no stuck loading screen, no broken state
- [ ] Open in a second tab: no cross-tab audio conflicts
- [ ] Console is clean (zero errors, zero failed requests) on the happy
      path with the real SDK

## 8. Local-only checks (already verified — repeat only if changed)

- [x] 1,034 assertions, 7 suites, reproducible across runs (seeded)
- [x] Win-line geometry for all 8 combinations (unit)
- [x] Ad-gate dedup/timeout/failure paths (unit)
- [x] Adapter lifecycle call order + dedup (unit)
- [x] Adapter isolation (each dist contains only its own SDK)
- [x] Build outputs byte-verified for the redesigned lobby HTML

---

**Sign-off rule:** every [PORTAL] box must be checked on the real portal
environment before resubmission. Local/unit checks do not substitute for
them.
