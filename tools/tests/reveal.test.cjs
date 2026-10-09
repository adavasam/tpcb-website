// Run with: node --test tools/tests/*.test.cjs
// Exercise the actual head/reveal scripts with controlled timers and observers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '../..');
const template = fs.readFileSync(path.join(root, '_layouts/default.html'), 'utf8');
const head = template.match(/<script>([\s\S]*?)<\/script>/)[1];
const reveal = fs.readFileSync(path.join(root, 'assets/js/reveal.js'), 'utf8');

function setup({ reduced = false, observer = true, brokenObserver = false } = {}) {
  const classes = new Set();
  const timers = new Map();
  const listeners = new Map();
  const observed = [];
  const section = {
    classList: {
      contains: () => false,
      add: () => {},
    },
    getAttribute: () => null,
    getBoundingClientRect: () => ({ top: 1200, bottom: 1600 }),
  };
  const document = {
    documentElement: {
      classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
      setAttribute: () => {},
    },
    querySelectorAll: selector => selector === '[data-reveal]' ? [section] : [],
    addEventListener: (type, fn) => listeners.set(type, fn),
    dispatchEvent: event => listeners.get(event.type)?.(event),
  };
  let nextTimer = 0;
  const window = {
    matchMedia: () => ({ matches: reduced }),
    setTimeout: (fn, delay) => {
      const id = ++nextTimer;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    addEventListener: () => {},
    removeEventListener: () => {},
    innerHeight: 900,
  };
  class Observer {
    constructor() {
      if (brokenObserver) throw new Error('observer unavailable');
    }
    observe(target) { observed.push(target); }
    unobserve() {}
  }
  if (observer) window.IntersectionObserver = Observer;
  const context = vm.createContext({
    window, document, IntersectionObserver: Observer,
    localStorage: { getItem: () => null },
    CustomEvent: class { constructor(type) { this.type = type; } },
  });
  vm.runInContext(head, context);
  return {
    classes, timers, observed,
    start: () => vm.runInContext(reveal, context),
    expire: () => {
      for (const [id, timer] of timers) {
        timers.delete(id);
        timer.fn();
      }
    },
  };
}

test('a missing or stalled reveal script cannot leave content hidden indefinitely', () => {
  const app = setup();
  assert.equal(app.classes.has('js-reveal'), true);
  assert.equal([...app.timers.values()][0].delay, 4000);
  app.expire();
  assert.equal(app.classes.has('js-reveal'), false);
});

test('successful initialization preserves ordinary scroll reveal', () => {
  const app = setup();
  app.start();
  assert.equal(app.observed.length, 1);
  assert.equal(app.timers.size, 0);
  app.expire();
  assert.equal(app.classes.has('js-reveal'), true);
});

test('a late script never re-hides content released by the timeout', () => {
  const app = setup();
  app.expire();
  app.start();
  assert.equal(app.classes.has('js-reveal'), false);
});

test('an initialization exception leaves the independent fallback armed', () => {
  const app = setup({ brokenObserver: true });
  assert.throws(app.start, /observer unavailable/);
  app.expire();
  assert.equal(app.classes.has('js-reveal'), false);
});

test('reduced motion and unavailable observers never arm hiding', () => {
  for (const options of [{ reduced: true }, { observer: false }]) {
    const app = setup(options);
    app.start();
    assert.equal(app.classes.has('js-reveal'), false);
    assert.equal(app.timers.size, 0);
  }
});
