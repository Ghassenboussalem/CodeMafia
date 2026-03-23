const { spawn } = require('child_process');
const path = require('path');

// Map challenge id → { cmd, file }
// Python for Python challenges, Node for JS challenges
const RUNNERS = {
  oop_bank_system:     { cmd: 'python',  file: 'oop_bank.py' },
  dsa_search_sort:     { cmd: 'python',  file: 'dsa_search_sort.py' },
  sec_auth_system:     { cmd: 'python',  file: 'security_auth.py' },
  fe_component_system: { cmd: 'node',    file: 'frontend_ui.js' },
  be_api_server:       { cmd: 'node',    file: 'backend_api.js' },
  // New challenges (v2 pool)
  event_system:        { cmd: 'python',  file: 'event_system.py' },
  lru_cache:           { cmd: 'python',  file: 'lru_cache.py' },
  state_machine:       { cmd: 'python',  file: 'state_machine.py' },
  graph_traversal:     { cmd: 'python',  file: 'graph_traversal.py' },
  permission_system:   { cmd: 'python',  file: 'permission_system.py' },
};

function spawnRunner(cmd, runnerPath, code) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [runnerPath], {
      timeout: 6000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => reject(new Error(`Spawn error: ${err.message}`)));
    child.on('close', (exitCode, signal) => {
      if (signal === 'SIGTERM' || exitCode === null) {
        return reject(new Error('Runner timed out'));
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error(
          `JSON parse error: ${e.message} | stdout: ${stdout.slice(0, 300)} | stderr: ${stderr.slice(0, 300)}`
        ));
      }
    });

    child.stdin.write(code, 'utf8');
    child.stdin.end();
  });
}

async function runTests(challenge, codeLines) {
  const total = challenge.tests.length;

  // Sanitize HTML entities the editor may inject
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
  const code = clean.join('\n');

  const runner = RUNNERS[challenge.id];
  if (!runner) {
    console.error(`[testRunner] No runner registered for challenge id: ${challenge.id}`);
    const results = challenge.tests.map((t) => ({ name: t.name, passed: false, section: t.section }));
    return { passed: 0, total, results };
  }

  const runnerPath = path.join(__dirname, 'runners', runner.file);

  let runnerResults;
  try {
    runnerResults = await spawnRunner(runner.cmd, runnerPath, code);
  } catch (err) {
    console.error(`[testRunner] Runner failed for ${challenge.id}:`, err.message);
    runnerResults = challenge.tests.map((t) => ({
      name: t.name,
      passed: false,
      error: err.message,
    }));
  }

  // Attach section metadata from challenge definition (runner only outputs name + passed)
  const sectionByName = {};
  for (const t of challenge.tests) {
    sectionByName[t.name] = t.section;
  }

  const results = runnerResults.map((r) => ({
    name: r.name,
    passed: Boolean(r.passed),
    section: sectionByName[r.name] ?? r.section ?? 0,
    ...(r.error ? { error: r.error } : {}),
  }));

  const passed = results.filter((r) => r.passed).length;
  console.log(`[testRunner] ${challenge.id}: ${passed}/${total}`);
  return { passed, total, results };
}

module.exports = { runTests };
