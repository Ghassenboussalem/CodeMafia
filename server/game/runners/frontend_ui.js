'use strict';
const vm = require('vm');
const fs = require('fs');

const TEST_NAMES = [
  'setState merges state',
  'getState returns this.state',
  'subscribe returns working unsubscribe',
  'register saves route handler',
  'navigate updates current path',
  'getCurrent returns current route',
  'createElement creates real element',
  'addClass uses classList',
  'setStyle sets individual property',
];

function fail(name, err) {
  return { name, passed: false, error: err && err.message ? err.message : String(err) };
}

// Minimal DOM mock for Node.js
function makeElement(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(),
    style: {},
    classList: {
      _classes: [],
      add(...cls) { this._classes.push(...cls); },
      toggle(cls) { this._classes.push(cls); },
    },
    _listeners: {},
    addEventListener(ev, fn) {
      this._listeners[ev] = this._listeners[ev] || [];
      this._listeners[ev].push(fn);
    },
    removeEventListener(ev, fn) {
      if (this._listeners[ev]) {
        this._listeners[ev] = this._listeners[ev].filter(f => f !== fn);
      }
    },
    setAttribute(k, v) { this[k] = v; },
    textContent: '',
    innerHTML: '',
  };
}

const mockDocument = {
  createElement(tag) { return makeElement(tag); },
};

const code = fs.readFileSync(0, 'utf8'); // fd 0 = stdin, works on Windows and Linux

const sandbox = {
  document: mockDocument,
  console: { log() {}, warn() {}, error() {} },
};

// class/const/let declarations don't attach to vm globalThis automatically.
// We append a small block that copies them onto globalThis (which IS the sandbox).
const exportBlock = `
;(function(){
  if (typeof Store !== 'undefined') globalThis.Store = Store;
  if (typeof Router !== 'undefined') globalThis.Router = Router;
  if (typeof DOMUtils !== 'undefined') globalThis.DOMUtils = DOMUtils;
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

const { Store, Router, DOMUtils } = sandbox;
const results = [];

// Test 1: setState merges state
try {
  const store = new Store({ a: 1 });
  store.setState({ b: 2 });
  const state = store.getState();
  results.push({ name: TEST_NAMES[0], passed: !!(state && state.a === 1 && state.b === 2) });
} catch (e) { results.push(fail(TEST_NAMES[0], e)); }

// Test 2: getState returns this.state
try {
  const store = new Store({ x: 42 });
  const state = store.getState();
  results.push({ name: TEST_NAMES[1], passed: !!(state && state.x === 42) });
} catch (e) { results.push(fail(TEST_NAMES[1], e)); }

// Test 3: subscribe returns working unsubscribe
try {
  const store = new Store({});
  let callCount = 0;
  const unsub = store.subscribe(() => callCount++);
  store.setState({ a: 1 });   // should call listener once
  unsub();                     // unsubscribe
  store.setState({ a: 2 });   // should NOT call listener
  results.push({ name: TEST_NAMES[2], passed: callCount === 1 });
} catch (e) { results.push(fail(TEST_NAMES[2], e)); }

// Test 4: register saves route handler
try {
  const router = new Router();
  const handler = () => {};
  router.register('/home', handler);
  // Accept either path-only key or method:path key
  const saved = router.routes['/home'] || router.routes['GET:/home'];
  results.push({ name: TEST_NAMES[3], passed: typeof saved === 'function' });
} catch (e) { results.push(fail(TEST_NAMES[3], e)); }

// Test 5: navigate updates current path
try {
  const router = new Router();
  router.register('/about', () => {});
  router.navigate('/about');
  results.push({ name: TEST_NAMES[4], passed: router.current === '/about' });
} catch (e) { results.push(fail(TEST_NAMES[4], e)); }

// Test 6: getCurrent returns current route
try {
  const router = new Router();
  router.register('/contact', () => {});
  router.navigate('/contact');
  results.push({ name: TEST_NAMES[5], passed: router.getCurrent() === '/contact' });
} catch (e) { results.push(fail(TEST_NAMES[5], e)); }

// Test 7: createElement creates real element (not null)
try {
  const dom = new DOMUtils();
  const el = dom.createElement('div', { id: 'test' }, 'hello');
  results.push({ name: TEST_NAMES[6], passed: el !== null && el !== undefined });
} catch (e) { results.push(fail(TEST_NAMES[6], e)); }

// Test 8: addClass uses classList.add
try {
  const dom = new DOMUtils();
  const el = makeElement('div');
  dom.addClass(el, 'foo', 'bar');
  results.push({ name: TEST_NAMES[7], passed: !!(
    el.classList._classes.includes('foo') && el.classList._classes.includes('bar')
  )});
} catch (e) { results.push(fail(TEST_NAMES[7], e)); }

// Test 9: setStyle sets individual property (el.style[prop] = val)
try {
  const dom = new DOMUtils();
  const el = makeElement('div');
  dom.setStyle(el, 'color', 'red');
  results.push({ name: TEST_NAMES[8], passed: el.style.color === 'red' });
} catch (e) { results.push(fail(TEST_NAMES[8], e)); }

process.stdout.write(JSON.stringify(results));
