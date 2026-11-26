/* =========================================================
   ANALYTICS — privacy-respecting, opt-in, local by default.
   The standalone web build performs NO network analytics.
   Portal builds may use their own dashboards instead.
   ========================================================= */

import { loadJSON, saveJSON } from "../storage/storage.js";

let enabled = false;
let events = [];

export function setEnabled(value) {
    enabled = !!value;
}

export function isEnabled() {
    return enabled;
}

/**
 * Records an event locally (for the stats dashboard).
 * Never transmitted anywhere in the web build.
 */
export function track(name, data = {}) {
    if (!enabled) return;

    events.push({ name, data, time: Date.now() });
    if (events.length > 200) events.length = 200;

    saveJSON("analytics", { events: events.slice(-100) });
}

export function getEvents() {
    return events.slice();
}

export function loadFromStorage() {
    const saved = loadJSON("analytics", { events: [] }, (a) =>
        Array.isArray(a.events)
    );
    events = saved.events;
}
