/* =========================================================
   PLATFORM INTERFACE — the contract every adapter fulfills.
   Core game code talks ONLY to this interface, never to a
   specific SDK. Each adapter implements what its platform
   supports and no-ops the rest.
   ========================================================= */

/**
 * The platform contract:
 *
 *   Platform.init()                     — Promise, may reject safely
 *   Platform.gameLoadingFinished()      — loading lifecycle
 *   Platform.gameplayStart()            — active gameplay began
 *   Platform.gameplayStop()             — active gameplay ended
 *   Platform.showMidgameAd()            — Promise; resolves when done
 *   Platform.showRewardedAd(placement)  — Promise<{rewarded: boolean}>
 *   Platform.getPlatformInfo()          — { id, name, supportsFullscreen }
 *   Platform.onPause(cb)                — register pause handling
 *   Platform.onResume(cb)               — register resume handling
 *
 * Adapters must NEVER throw out of lifecycle calls: SDK failures
 * must not crash the game.
 */

export function createPlatformAdapter(overrides = {}) {
    const noOp = () => { };

    return {
        id: "unknown",
        name: "Unknown",
        supportsFullscreen: false,
        supportsRewardedAds: false,

        async init() {
            /* optional async setup */
        },

        gameLoadingFinished: noOp,
        gameplayStart: noOp,
        gameplayStop: noOp,

        async showMidgameAd() {
            /* no-op in the base adapter */
        },

        async showRewardedAd() {
            return { rewarded: false };
        },

        getPlatformInfo() {
            return {
                id: this.id,
                name: this.name,
                supportsFullscreen: this.supportsFullscreen,
                supportsRewardedAds: this.supportsRewardedAds
            };
        },

        onPause: noOp,
        onResume: noOp,

        ...overrides
    };
}
