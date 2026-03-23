'use strict';
const vm = require('vm');
const fs = require('fs');

const TEST_NAMES = [
  'logger calls next()',
  'auth allows valid tokens',
  'errorHandler sends error response',
  'register uses method+path as key',
  'handle passes params to handler',
  'extractParams slices from index 1',
  'cache get returns stored value',
  'isRateLimited blocks when over limit',
  'cleanup removes expired entries',
];

function fail(name, err) {
  return { name, passed: false, error: err && err.message ? err.message : String(err) };
}

function mockRes() {
  const r = {
    _statusCode: null,
    _body: null,
    status(code) { this._statusCode = code; return this; },
    json(body) { this._body = body; return this; },
    send(body) { this._body = body; return this; },
  };
  return r;
}

const code = fs.readFileSync(0, 'utf8'); // fd 0 = stdin, works on Windows and Linux

const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  Date: Date,
};

// class/const/let declarations don't attach to vm globalThis automatically.
// We append a small block that copies them onto globalThis (which IS the sandbox).
const exportBlock = `
;(function(){
  if (typeof logger !== 'undefined') globalThis.logger = logger;
  if (typeof auth !== 'undefined') globalThis.auth = auth;
  if (typeof errorHandler !== 'undefined') globalThis.errorHandler = errorHandler;
  if (typeof jsonParser !== 'undefined') globalThis.jsonParser = jsonParser;
  if (typeof Router !== 'undefined') globalThis.Router = Router;
  if (typeof Cache !== 'undefined') globalThis.Cache = Cache;
})();
`;

const ctx = vm.createContext(sandbox);
try {
  vm.runInContext(code + exportBlock, ctx);
} catch (e) {
  process.stdout.write(JSON.stringify(
    TEST_NAMES.map(n => ({ name: n, passed: false, error: `Exec error: ${e.message}` }))
  ));
  process.exit(0);
}

const { logger, auth, errorHandler, jsonParser, Router, Cache } = sandbox;
const results = [];

// Test 1: logger calls next()
try {
  let nextCalled = false;
  const req = { method: 'GET', url: '/' };
  const res = mockRes();
  logger(req, res, () => { nextCalled = true; });
  results.push({ name: TEST_NAMES[0], passed: nextCalled });
} catch (e) { results.push(fail(TEST_NAMES[0], e)); }

// Test 2: auth allows valid tokens (calls next, not 403)
try {
  let nextCalled = false;
  const req = { headers: { authorization: 'Bearer valid-token-123' } };
  const res = mockRes();
  auth(req, res, () => { nextCalled = true; });
  results.push({ name: TEST_NAMES[1], passed: !!(nextCalled && res._statusCode !== 403) });
} catch (e) { results.push(fail(TEST_NAMES[1], e)); }

// Test 3: errorHandler sends error response
try {
  const err = new Error('Something broke');
  const req = {};
  const res = mockRes();
  errorHandler(err, req, res, () => {});
  results.push({ name: TEST_NAMES[2], passed: !!(res._statusCode !== null || res._body !== null) });
} catch (e) { results.push(fail(TEST_NAMES[2], e)); }

// Test 4: register uses method+path as key
try {
  const router = new Router();
  const handler = () => {};
  router.register('GET', '/users', handler);
  const key = 'GET:/users';
  results.push({ name: TEST_NAMES[3], passed: router.routes[key] === handler });
} catch (e) { results.push(fail(TEST_NAMES[3], e)); }

// Test 5: handle passes params to handler (third argument)
try {
  const router = new Router();
  let thirdArg = 'NOT_SET';
  let handlerCalled = false;
  router.register('GET', '/test', (req, res, params) => {
    handlerCalled = true;
    thirdArg = params;
  });
  const req = { method: 'GET', path: '/test' };
  const res = mockRes();
  router.handle(req, res);
  results.push({ name: TEST_NAMES[4], passed: !!(handlerCalled && thirdArg !== 'NOT_SET') });
} catch (e) { results.push(fail(TEST_NAMES[4], e)); }

// Test 6: extractParams slices from index 1 (not 2)
try {
  const router = new Router();
  // Pattern /:id, path /42 → after split+slice(1): values=['42'], keys=['id']
  const params = router.extractParams('/:id', '/42');
  results.push({ name: TEST_NAMES[5], passed: !!(params && params.id === '42') });
} catch (e) { results.push(fail(TEST_NAMES[5], e)); }

// Test 7: cache get returns stored value
try {
  const cache = new Cache(60);
  cache.set('mykey', 'myvalue');
  const val = cache.get('mykey');
  results.push({ name: TEST_NAMES[6], passed: val === 'myvalue' });
} catch (e) { results.push(fail(TEST_NAMES[6], e)); }

// Test 8: isRateLimited blocks when over limit
try {
  const cache = new Cache(60);
  let blocked = false;
  for (let i = 0; i < 11; i++) {
    const result = cache.isRateLimited('192.168.1.1', 10);
    if (result === true && i >= 10) blocked = true;
  }
  results.push({ name: TEST_NAMES[7], passed: blocked });
} catch (e) { results.push(fail(TEST_NAMES[7], e)); }

// Test 9: cleanup removes expired entries
try {
  const cache = new Cache(60);
  cache.store['expired_key'] = { value: 'old', expires: Date.now() - 1000 };
  cache.store['valid_key'] = { value: 'new', expires: Date.now() + 60000 };
  cache.cleanup();
  results.push({ name: TEST_NAMES[8], passed: !!(
    !('expired_key' in cache.store) && 'valid_key' in cache.store
  )});
} catch (e) { results.push(fail(TEST_NAMES[8], e)); }

process.stdout.write(JSON.stringify(results));
