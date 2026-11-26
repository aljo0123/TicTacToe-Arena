/* =========================================================
   BUILD SCRIPT — three independent production targets
   Usage: node build.js web | poki | crazygames
   Each build copies shared src/ + ONLY its own platform
   adapter, plus a platform-specific boot file.
   ========================================================= */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGETS = {
    web: {
        dir: "dist/web",
        adapter: "platform/web/web.js",
        adapterFactory: "createWebPlatform",
        sdkScript: null
    },
    poki: {
        dir: "dist/poki",
        adapter: "platform/poki/poki.js",
        adapterFactory: "createPokiPlatform",
        sdkScript: "https://game-cdn.poki.com/scripts/v2/poki-sdk.js",
        sdkAttributes: "defer"
    },
    crazygames: {
        dir: "dist/crazygames",
        adapter: "platform/crazygames/crazygames.js",
        adapterFactory: "createCrazyGamesPlatform",
        sdkScript: "https://sdk.crazygames.com/crazygames-sdk-v3.js",
        sdkAttributes: "defer"
    }
};

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });

    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function buildTarget(targetName) {
    const target = TARGETS[targetName];
    if (!target) {
        console.error(`Unknown target: ${targetName}`);
        console.error(`Available: ${Object.keys(TARGETS).join(", ")}`);
        process.exitCode = 1;
        return;
    }

    const outDir = path.join(__dirname, target.dir);

    // Clean output.
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    // Shared source.
    copyDir(path.join(__dirname, "src"), path.join(outDir, "src"));

    // The selected platform adapter + interface, laid out to match
    // the boot file's relative import (../poki/poki.js etc.).
    const adapterOutName = targetName === "web" ? "platform/web" : targetName;
    const adapterOutDir = path.join(outDir, adapterOutName);
    copyDir(path.join(__dirname, target.adapter, ".."), adapterOutDir);
    fs.copyFileSync(
        path.join(__dirname, "platform", "interface.js"),
        path.join(adapterOutDir, "interface.js")
    );

    // Fix the interface import inside the copied adapter.
    const adapterFile = path.join(adapterOutDir, path.basename(target.adapter));
    let adapterSource = fs.readFileSync(adapterFile, "utf8");
    adapterSource = adapterSource.replace(
        'import { createPlatformAdapter } from "../interface.js";',
        'import { createPlatformAdapter } from "./interface.js";'
    );

    // Fix the audio-bridge import depth for the dist layout.
    // src/ is copied INSIDE each target:
    //   crazygames/poki: dist/<target>/<name>/ → ../src = dist/<target>/src
    //   web:             dist/web/platform/web/ → ../../src = dist/web/src
    const audioImportDepth = targetName === "web"
        ? "../../src/audio/audio.js"
        : "../src/audio/audio.js";
    adapterSource = adapterSource.replace(
        /import\("\.\.\/\.\.\/src\/audio\/audio\.js"\)/,
        `import("${audioImportDepth}")`
    );
    fs.writeFileSync(adapterFile, adapterSource);
    // Remove any sibling adapters copied by the parent-dir copy.
    if (targetName !== "web") {
        for (const other of ["poki", "crazygames", "web"]) {
            if (other !== targetName) {
                fs.rmSync(path.join(outDir, other), {
                    recursive: true,
                    force: true
                });
            }
        }
        fs.rmSync(path.join(outDir, "platform"), {
            recursive: true,
            force: true
        });
    }

    // Static assets.
    fs.copyFileSync(
        path.join(__dirname, "style.css"),
        path.join(outDir, "style.css")
    );
    fs.copyFileSync(
        path.join(__dirname, "favicon.svg"),
        path.join(outDir, "favicon.svg")
    );
    if (fs.existsSync(path.join(__dirname, "assets"))) {
        copyDir(path.join(__dirname, "assets"), path.join(outDir, "assets"));
    }

    /* -----------------------------------------------------
       index.html — inject SDK script (if any) and point the
       module entry at the platform boot file.
       ----------------------------------------------------- */

    let html = fs.readFileSync(
        path.join(__dirname, "index.html"),
        "utf8"
    );

    if (target.sdkScript) {
        const attrs = target.sdkAttributes || "";
        html = html.replace(
            "<!--\n        NOTE (build system): platform SDK scripts are injected here\n        per build target. The web build loads nothing extra.\n    -->",
            `<script ${attrs} src="${target.sdkScript}"></script>`
        );
    }

    html = html.replace(
        'src="src/main.js"',
        'src="src/boot.js"'
    );

    fs.writeFileSync(path.join(outDir, "index.html"), html);

    /* -----------------------------------------------------
       boot.js — platform-specific bootstrap.
       Built from main.js with the adapter import rewritten.
       ----------------------------------------------------- */

    let boot = fs.readFileSync(path.join(__dirname, "src/main.js"), "utf8");

    boot = boot.replace(
        'import { createWebPlatform } from "../platform/web/web.js";',
        `import { ${target.adapterFactory} } from "../${adapterOutName}/${path.basename(target.adapter)}";`
    );
    // Also swap the constructor call itself.
    boot = boot.replace(
        "const platform = createWebPlatform();",
        `const platform = ${target.adapterFactory}();`
    );

    fs.writeFileSync(path.join(outDir, "src", "boot.js"), boot);

    // main.js is not needed in the built package (boot.js replaces it).
    fs.rmSync(path.join(outDir, "src", "main.js"), { force: true });

    console.log(`✓ Built ${targetName} → ${target.dir}`);
}

/* ---------------------------------------------------------
   CLI
   --------------------------------------------------------- */

const arg = process.argv[2];

if (!arg || arg === "all") {
    for (const name of Object.keys(TARGETS)) {
        buildTarget(name);
    }
} else {
    buildTarget(arg);
}
