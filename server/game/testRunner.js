async function runTests(challenge, codeLines) {
  const total = challenge.tests.length; // always 9

  const lines = Array.isArray(codeLines) ? codeLines : String(codeLines).split('\n');
  const clean = lines.map((l) =>
    String(l)
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );

  const results = [];
  for (const test of challenge.tests) {
    let passed = false;
    try {
      passed = typeof test.validate === 'function'
        ? Boolean(test.validate(clean))
        : false;
    } catch (err) {
      console.error(`[testRunner] "${test.name}" threw:`, err.message);
    }
    results.push({ name: test.name, passed, section: test.section });
  }

  const passed = results.filter((r) => r.passed).length;
  console.log(`[testRunner] ${challenge.id}: ${passed}/${total}`);
  return { passed, total, results };
}

module.exports = { runTests };