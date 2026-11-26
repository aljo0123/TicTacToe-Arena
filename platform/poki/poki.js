/* =========================================================
   POKI PLATFORM ADAPTER
   Official Poki SDK v2 integration. Contains Poki-specific
   code ONLY. Never imported by other builds.
   Docs: https://developer.poki.com/documentation
   ========================================================= */

import { createPlatformAdapter } from "../interface.js";

/* ---------------------------------------------------------
   Poki lifecycle contract (SDK v2):
     PokiSDK.init()               — Promise
     PokiSDK.gameLoadingStarted() — optional, before loading
     PokiSDK.gameLoadingFinished()— loading complete
     PokiSDK.gameplayStart()      — gameplay began
     PokiSDK.gameplayStop()       — gameplay ended / paused
     PokiSDK.commercialBreak()    — Promise; midgame ad
     PokiSDK.rewardedBreak()      — Promise<boolean>; rewarded ad
     PokiSDK.setDebug(true)       — verbose logging
   ========================================================= */

export function createPokiPlatform() {
    const sdk = window.PokiSDK || null;

    let isPlaying = false;

    const adapter = createPlatformAdapter({
        id: "poki",
        name: "Poki",
        supportsFullscreen: false, // Poki wraps the game; no fullscreen
        supportsRewardedAds: true,

        async init() {
            if (!sdk) {
                console.warn("Poki SDK not present — running standalone.");
                return;
            }

            try {
                // `key` is optional in dev; Poki injects the site key.
                await sdk.init();
                if (typeof sdk.setDebug === "function") {
                    // Enable when testing, disable for production builds.
                    // sdk.setDebug(true);
                }
            } catch (error) {
                // Per Poki docs: if init() rejects, the game should
                // still run — ads simply won't show.
                console.warn("Poki SDK init failed:", error);
            }
        },

        gameLoadingFinished() {
            safe(() => {
                if (sdk && typeof sdk.gameLoadingFinished === "function") {
                    sdk.gameLoadingFinished();
                }
            });
        },

        gameplayStart() {
            safe(() => {
                if (isPlaying) return;
                isPlaying = true;
                if (sdk && typeof sdk.gameplayStart === "function") {
                    sdk.gameplayStart();
                }
            });
        },

        gameplayStop() {
            safe(() => {
                if (!isPlaying) return;
                isPlaying = false;
                if (sdk && typeof sdk.gameplayStop === "function") {
                    sdk.gameplayStop();
                }
            });
        },

        /**
         * Midgame ad — only called at natural breaks (game over,
         * returning to menu). Resolves when the ad is finished.
         */
        async showMidgameAd() {
            if (!sdk || typeof sdk.commercialBreak !== "function") return;

            // Poki requires gameplayStop before commercialBreak.
            adapter.gameplayStop();

            try {
                await sdk.commercialBreak();
            } catch (error) {
                console.warn("commercialBreak unavailable:", error);
            }
        },

        /**
         * Rewarded ad — resolves { rewarded: boolean }.
         * Poki's rewardedBreak() returns true when the player
         * completed the ad and the reward should be granted.
         */
        async showRewardedAd() {
            if (!sdk || typeof sdk.rewardedBreak !== "function") {
                return { rewarded: false };
            }

            adapter.gameplayStop();

            try {
                const result = await sdk.rewardedBreak();
                // Reward is granted ONLY on a true response.
                return { rewarded: result === true };
            } catch (error) {
                console.warn("rewardedBreak unavailable:", error);
                return { rewarded: false };
            }
        },

        getPlatformInfo() {
            return {
                id: "poki",
                name: "Poki",
                supportsFullscreen: false,
                supportsRewardedAds: !!sdk
            };
        }
    });

    /* -----------------------------------------------------
       Poki drives pause via document visibility; the SDK
       pauses audio itself, we only notify our listeners.
       ----------------------------------------------------- */

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            adapter._pauseCallbacks.forEach((cb) => safe(cb));
        } else {
            adapter._resumeCallbacks.forEach((cb) => safe(cb));
        }
    });

    return adapter;
}

function safe(fn) {
    try {
        fn();
    } catch (error) {
        console.warn("Poki adapter error:", error);
    }
}
