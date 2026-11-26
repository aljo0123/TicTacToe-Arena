/* =========================================================
   PLATFORM BRIDGE — the single point where the app obtains
   its platform adapter. The build system rewrites this file
   per target so each build loads ONLY its own adapter.
   ========================================================= */

let adapter = null;

/**
 * Resolved by the platform-specific boot file. During dev the
 * web adapter is the default.
 */
export function setPlatform(instance) {
    adapter = instance;
}

export function getPlatform() {
    if (adapter === null) {
        // Dev fallback — web adapter.
        import("../../platform/web/web.js").then((module) => {
            adapter = module.createWebPlatform();
            adapter.init();
        });
        // Return a temporary minimal shim so calls never crash.
        return {
            init: () => { },
            gameLoadingFinished: () => { },
            gameplayStart: () => { },
            gameplayStop: () => { },
            showMidgameAd: async () => { },
            showRewardedAd: async () => ({ rewarded: false }),
            getPlatformInfo: () => ({
                id: "web",
                name: "Web",
                supportsFullscreen: true,
                supportsRewardedAds: false
            }),
            onPause: () => { },
            onResume: () => { }
        };
    }
    return adapter;
}
