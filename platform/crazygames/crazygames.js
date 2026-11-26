/* =========================================================
   CRAZYGAMES PLATFORM ADAPTER
   Official CrazyGames SDK v3 integration. Contains
   CrazyGames-specific code ONLY. Never imported by other
   builds.
   Docs: https://docs.crazygames.com/sdk/html5-v3/
   ========================================================= */

import { createPlatformAdapter } from "../interface.js";

/* ---------------------------------------------------------
   CrazyGames SDK v3 contract (window.CrazyGames.SDK):
     await CrazyGames.SDK.init()
     CrazyGames.SDK.game.gameplayStart()
     CrazyGames.SDK.game.gameplayStop()
     CrazyGames.SDK.game.sdkGameLoadingStart()   (optional)
     CrazyGames.SDK.game.sdkGameLoadingStop()    (loading done)
     await CrazyGames.SDK.ad.requestAd("midgame", callbacks)
     await CrazyGames.SDK.ad.requestAd("rewarded", callbacks)
     CrazyGames.SDK.game.happytime()             (celebration)
     CrazyGames.SDK.game.settings / loadingStop etc.

   The SDK script tag is added by the build for this target:
     <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
   ========================================================= */

export function createCrazyGamesPlatform() {
    const sdkRef = () =>
        (window.CrazyGames && window.CrazyGames.SDK) || null;

    let isPlaying = false;

    const adapter = createPlatformAdapter({
        id: "crazygames",
        name: "CrazyGames",
        supportsFullscreen: false, // portal hosts the frame
        supportsRewardedAds: true,

        async init() {
            const sdk = sdkRef();
            if (!sdk) {
                console.warn("CrazyGames SDK not present — running standalone.");
                return;
            }

            // Audio muting is wired immediately — it must not depend on
            // init() resolving, which can hang outside the portal
            // environment (documented setting read + listener are
            // available as soon as the SDK object exists).
            this._wireAudioMuting();

            try {
                await sdk.init();
            } catch (error) {
                console.warn("CrazyGames SDK init failed:", error);
            }
        },

        /**
         * CrazyGames SDK v3 audio muting (documented API only):
         *   sdk.game.settings.muteAudio          — boolean flag
         *   sdk.game.addSettingsChangeListener(cb) — cb(settings)
         *   sdk.game.removeSettingsChangeListener(cb)
         *
         * Docs state the `muteAudio` setting "should take priority
         * over your in-game audio settings". We therefore layer it
         * above user preferences via the audio bridge without ever
         * overwriting the user's saved volume/toggle settings.
         */
        _wireAudioMuting() {
            safe(() => {
                const sdk = sdkRef();
                if (!sdk || !sdk.game || !sdk.game.settings) return;

                // Import dynamically so the shared audio module stays
                // platform-agnostic and this file keeps the only
                // CrazyGames-specific wiring. NOTE: the build system
                // rewrites this path for dist packages (depth differs).
                import("../../src/audio/audio.js") /* @build-rewrite */.then((audio) => {
                    this._audioBridge = audio;

                    // Apply the current setting immediately (the user
                    // may have the portal-wide mute toggled already).
                    audio.setPlatformMuted(!!sdk.game.settings.muteAudio);

                    // React to changes made from the portal side.
                    this._settingsListener = (newSettings) => {
                        audio.setPlatformMuted(!!(newSettings && newSettings.muteAudio));
                    };

                    if (typeof sdk.game.addSettingsChangeListener === "function") {
                        sdk.game.addSettingsChangeListener(this._settingsListener);
                    }
                }).catch((error) => {
                    console.warn("CrazyGames audio bridge failed:", error);
                });
            });
        },

        gameLoadingFinished() {
            safe(() => {
                const sdk = sdkRef();
                if (sdk && sdk.game && typeof sdk.game.sdkGameLoadingStop === "function") {
                    sdk.game.sdkGameLoadingStop();
                }
            });
        },

        gameplayStart() {
            safe(() => {
                const sdk = sdkRef();
                if (isPlaying) return;
                isPlaying = true;
                if (sdk && sdk.game && typeof sdk.game.gameplayStart === "function") {
                    sdk.game.gameplayStart();
                }
            });
        },

        gameplayStop() {
            safe(() => {
                const sdk = sdkRef();
                if (!isPlaying) return;
                isPlaying = false;
                if (sdk && sdk.game && typeof sdk.game.gameplayStop === "function") {
                    sdk.game.gameplayStop();
                }
            });
        },

        /**
         * Midgame ad. CrazyGames requires gameplayStop() first and
         * the ad module mutes game audio during the ad.
         */
        async showMidgameAd() {
            const sdk = sdkRef();
            if (!sdk || !sdk.ad) return;

            adapter.gameplayStop();

            // Early-exit guard: never construct the promise in a
            // non-DOM environment (unit tests, Node).
            if (typeof document === "undefined") return;

            return new Promise((resolve) => {
                try {
                    sdk.ad
                        .requestAd("midgame", {
                            adFinished: () => resolve(),
                            adError: (error) => {
                                console.warn("midgame ad error:", error);
                                resolve();
                            },
                            adStarted: () => {
                                /* SDK mutes audio automatically */
                            }
                        })
                        .catch((error) => {
                            console.warn("midgame requestAd failed:", error);
                            resolve();
                        });
                } catch (error) {
                    console.warn("midgame requestAd threw:", error);
                    resolve();
                }
            });
        },

        /**
         * Rewarded ad. Resolves { rewarded: boolean } — the reward
         * is granted ONLY inside the adFinished callback.
         */
        async showRewardedAd() {
            const sdk = sdkRef();
            if (!sdk || !sdk.ad) return { rewarded: false };

            adapter.gameplayStop();

            return new Promise((resolve) => {
                try {
                    sdk.ad
                        .requestAd("rewarded", {
                            adFinished: () => resolve({ rewarded: true }),
                            adError: (error) => {
                                console.warn("rewarded ad error:", error);
                                resolve({ rewarded: false });
                            },
                            adStarted: () => {
                                /* SDK mutes audio automatically */
                            }
                        })
                        .catch((error) => {
                            console.warn("rewarded requestAd failed:", error);
                            resolve({ rewarded: false });
                        });
                } catch (error) {
                    console.warn("rewarded requestAd threw:", error);
                    resolve({ rewarded: false });
                }
            });
        },

        /** CrazyGames "happytime" celebration for big moments. */
        celebrate() {
            safe(() => {
                const sdk = sdkRef();
                if (sdk && sdk.game && typeof sdk.game.happytime === "function") {
                    sdk.game.happytime();
                }
            });
        },

        getPlatformInfo() {
            return {
                id: "crazygames",
                name: "CrazyGames",
                supportsFullscreen: false,
                supportsRewardedAds: !!sdkRef()
            };
        },

        /**
         * Tear down the settings listener (useful for tests and
         * potential hot re-init; portals don't normally require it).
         */
        destroy() {
            safe(() => {
                const sdk = sdkRef();
                if (
                    sdk && sdk.game &&
                    typeof sdk.game.removeSettingsChangeListener === "function" &&
                    this._settingsListener
                ) {
                    sdk.game.removeSettingsChangeListener(this._settingsListener);
                }
                this._settingsListener = null;
                this._audioBridge = null;
            });
        }
    });

    /* -----------------------------------------------------
       CrazyGames notifies via SDK events when available;
       fall back to visibility for local testing.
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
        console.warn("CrazyGames adapter error:", error);
    }
}
