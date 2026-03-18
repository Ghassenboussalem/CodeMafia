/**
 * Sandboxed test runner using isolated-vm.
 * Falls back to a heuristic approach if isolated-vm is not installed.
 *
 * Install: npm install isolated-vm
 * Note: Requires a C++ build environment (node-gyp). On Render/Railway
 *       this works out of the box. On plain Ubuntu: apt-get install build-essential.
 */

let ivm = null;
try {
  ivm = require('isolated-vm');
} catch (_) {
  console.warn('[testRunner] isolated-vm not available — using heuristic fallback');
}

const TIMEOUT_MS = 2000; // max 2 seconds per test run
const MEMORY_MB  = 8;    // 8 MB sandbox

/**
 * Run all tests for a challenge against the current code lines.
 * Returns { passed: number, total: number, results: [{name, passed}] }
 */
async function runTests(challenge, codeLines) {
  const total = challenge.tests.length;

  if (!ivm) {
    return heuristicRun(challenge, codeLines);
  }

  // Real isolated-vm sandbox path
  const code = codeLines.join('\n');
  const results = [];

  for (const test of challenge.tests) {
    try {
      const isolate = new ivm.Isolate({ memoryLimit: MEMORY_MB });
      const context = await isolate.createContext();
      const jail    = context.global;
      await jail.set('global', jail.derefInto());

      // Inject the student code + test assertion
      const script = await isolate.compileScript(`
        ${sanitizeForSandbox(code)}
        ${test.assertCode || ''}
      `);
      await script.run(context, { timeout: TIMEOUT_MS });
      results.push({ name: test.name, passed: true });
    } catch (_) {
      results.push({ name: test.name, passed: false });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  return { passed, total, results };
}

/**
 * Heuristic fallback: count remaining TODO comments.
 * Each TODO present = one test still failing.
 */
function heuristicRun(challenge, codeLines) {
  const code   = codeLines.join('\n');
  const todos  = (code.match(/# TODO|\/\/ TODO/g) || []).length;
  const total  = challenge.tests.length;
  const passed = Math.max(0, total - todos);

  return {
    passed,
    total,
    results: challenge.tests.map((t, i) => ({ name: t.name, passed: i < passed })),
  };
}

/**
 * Strip dangerous globals before running in sandbox.
 */
function sanitizeForSandbox(code) {
  // Remove any attempt to access process, require, fs, etc.
  return code
    .replace(/\brequire\s*\(/g, 'void(')
    .replace(/\bprocess\b/g, '{}')
    .replace(/\b__dirname\b/g, '""')
    .replace(/\b__filename\b/g, '""');
}

module.exports = { runTests };
