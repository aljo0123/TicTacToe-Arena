/* =========================================================
   WEB PLATFORM ADAPTER — standalone version
   No SDK. Everything is a safe no-op except fullscreen and
   visibility handling, which are native browser features.
   Used for GitHub Pages / personal sites / direct access.
   ========================================================= */

import { createPlatformAdapter } from "../interface.js";

export function createWebPlatform() {
    const adapter = createPlatformAdapter({
        id: "web",
        name: "Web",
        supportsFullscreen: true,

        async init() {
            /* nothing to initialize without an SDK */
        },

        getPlatformInfo() {
            return {
                id: "web",
                name: "Web",
                supportsFullscreen: true,
                supportsRewardedAds: false
            };
        }
    });

    /* -----------------------------------------------------
       Native browser pause/resume via visibility events
       ----------------------------------------------------- */

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            adapter._pauseCallbacks.forEach((cb) => {
                try {
                    cb();
                } catch (error) {
                    // listener failure must not break the game
                }
            });
        } else {
            adapter._resumeCallbacks.forEach((cb) => {
                try {
                    cb();
                } catch (error) {
                    // ignore
                }
            });
        }
    });

    return adapter;
}
