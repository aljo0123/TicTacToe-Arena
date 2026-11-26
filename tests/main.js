/* =========================================================
   TEST ENTRY — runs all suites
   ========================================================= */

await import("./rules.test.js");
await import("./ai.test.js");
await import("./integration.test.js");
await import("./crazygames-audio.test.js");
await import("./phase1-banner.test.js");
await import("./phase2-winline-onboarding.test.js");
await import("./lifecycle.test.js");
