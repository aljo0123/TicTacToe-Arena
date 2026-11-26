/* =========================================================
   AD GATE — defers midgame ads until the result banner closes.
   Guarantees: no ad while the banner is up; no duplicate
   requests; failures never block navigation.
   ========================================================= */

export function createAdGate() {
    let bannerOpen = false;
    let pendingDismissal = false;
    let adInFlight = false;

    return {
        /** Called when the result banner is shown. */
        bannerOpened() {
            bannerOpen = true;
            pendingDismissal = false;
        },

        /**
         * Called when the player dismisses the banner via Home or
         * Change Mode. Arms the ad so the NEXT caller to request()
         * fires it. Returns true when a request is allowed.
         */
        bannerDismissed() {
            if (!bannerOpen) return false;
            if (pendingDismissal || adInFlight) return false;
            pendingDismissal = true;
            bannerOpen = false;
            return true;
        },

        /**
         * Requests the ad through the supplied platform. Only one
         * request can be in flight; failures resolve silently.
         * @param {object} platform — adapter with showMidgameAd()
         */
        async request(platform) {
            if (!pendingDismissal || adInFlight) return { requested: false };
            if (!platform || typeof platform.showMidgameAd !== "function") {
                pendingDismissal = false;
                return { requested: false };
            }

            adInFlight = true;
            try {
                // Race against a timeout so a hanging SDK can never
                // block navigation or a later rematch.
                await Promise.race([
                    platform.showMidgameAd(),
                    new Promise((resolve) => setTimeout(resolve, 8000))
                ]);
            } catch (error) {
                // SDK rejection — swallow; ads must never break play.
            }
            adInFlight = false;
            pendingDismissal = false;
            return { requested: true };
        },

        /** Full reset (new session/navigation). No ads fire after. */
        reset() {
            bannerOpen = false;
            pendingDismissal = false;
            // adInFlight intentionally untouched — a live ad must finish.
        },

        /** True while the result banner is being displayed. */
        isBannerOpen() {
            return bannerOpen;
        },

        /** True while an ad request is running. */
        isAdInFlight() {
            return adInFlight;
        }
    };
}
