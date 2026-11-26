/* =========================================================
   SHIM — minimal browser globals for Node test runs.
   Imported FIRST so storage/adapters bind to the shim.
   ========================================================= */

const store = new Map();

globalThis.window = {
    localStorage: {
        setItem: (k, v) => store.set(k, String(v)),
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        removeItem: (k) => store.delete(k)
    }
};

globalThis.document = {
    addEventListener: () => { },
    hidden: false,
    body: { dataset: {} },
    fullscreenElement: null,
    webkitFullscreenElement: null
};

globalThis.addEventListener = () => { };

export { store };
