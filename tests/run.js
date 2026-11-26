/* =========================================================
   TEST RUNNER — zero dependencies
   ========================================================= */

const results = { pass: 0, fail: 0, failures: [] };

export function assert(condition, message) {
    if (condition) {
        results.pass++;
    } else {
        results.fail++;
        results.failures.push(message);
        console.error("  FAIL:", message);
    }
}

export function assertEquals(actual, expected, message) {
    assert(
        actual === expected,
        `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`
    );
}

export function section(name) {
    console.log(`\n— ${name}`);
}

export function report() {
    console.log(
        `\n=== ${results.pass} passed, ${results.fail} failed ===`
    );
    if (results.fail > 0) {
        process.exitCode = 1;
    }
}
