// Source-level contracts: DOM/event doubles, not browser rendering or WCAG claims.
const test = require('node:test');
const assert = require('node:assert/strict');
const { target, clock, run } = require('./dom-doubles.cjs');

test('scroll chrome clamps overscroll, handles short documents and coalesces events', () => {
  const c = clock(), header = target(), bar = target();
  const root = { scrollTop: 0, scrollHeight: 1000, clientHeight: 500 };
  const window = target({ ...c, pageYOffset: 0 });
  run('scroll-chrome.js', { window, document: { documentElement: root,
    querySelector: s => s === '.site-header' ? header : bar } });
  assert.equal(bar.style.transform, 'scaleX(0)');
  window.pageYOffset = 250;
  window.emit('scroll'); window.emit('scroll'); window.emit('resize');
  assert.equal(c.frames.size, 1); c.tick();
  assert.equal(header.classList.contains('is-stuck'), true);
  assert.equal(bar.style.transform, 'scaleX(0.5)');
  window.pageYOffset = 900; window.emit('scroll'); c.tick();
  assert.equal(bar.style.transform, 'scaleX(1)');
  window.pageYOffset = -20; window.emit('scroll'); c.tick();
  assert.equal(bar.style.transform, 'scaleX(0)');
  root.scrollHeight = 400; window.emit('resize'); c.tick();
  assert.equal(bar.style.transform, 'scaleX(0)');
});

function theme(blocked = false) {
  const root = target(), button = target(), media = target({ matches: false });
  root.setAttribute('data-theme', 'light');
  const storage = new Map(), events = [];
  const localStorage = {
    getItem(k) { if (blocked) throw Error('storage unavailable'); return storage.get(k) || null; },
    setItem(k, v) { if (blocked) throw Error('storage unavailable'); storage.set(k, v); }
  };
  const document = target({ documentElement: root, getElementById: () => button });
  document.addEventListener('tpcb:themechange', e => events.push({ theme: e.detail.theme, current: root.getAttribute('data-theme') }));
  run('theme.js', { window: { matchMedia: () => media }, document, localStorage });
  return { root, button, media, storage, events };
}

test('theme uses OS until an explicit choice and dispatches after applying palette', () => {
  const t = theme();
  t.media.emit('change', { matches: true });
  assert.equal(t.root.getAttribute('data-theme'), 'dark');
  assert.equal(t.button.getAttribute('aria-label'), 'Switch to light theme');
  assert.deepEqual(t.events, [{ theme: 'dark', current: 'dark' }]);
  t.button.emit('click');
  t.media.emit('change', { matches: true });
  assert.equal(t.root.getAttribute('data-theme'), 'light');
  assert.equal(t.storage.get('tpcb-theme'), 'light');
});

test('theme controls still switch when storage throws', () => {
  const t = theme(true); t.button.emit('click');
  assert.equal(t.root.getAttribute('data-theme'), 'dark');
  assert.equal(t.button.getAttribute('aria-label'), 'Switch to light theme');
});

function anchor(href, attrs = {}) {
  const url = new URL(href, 'https://site.test/about/');
  const a = target({ pathname: url.pathname, search: url.search, hash: url.hash, host: url.host,
    origin: url.origin, textContent: 'Link' });
  a.setAttribute('href', href);
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  a.appendChild = child => { a.textContent += child.textContent; };
  return a;
}
function annotate(links) {
  run('links.js', { window: { location: new URL('https://site.test/about/') },
    document: { querySelectorAll: () => links, createElement: () => target() } });
}

test('external link annotation preserves internal anchors, authors choices and special schemes', () => {
  const external = anchor('https://elsewhere.test/paper', { rel: 'nofollow' });
  const internal = anchor('/students/');
  const fragment = anchor('#section');
  const mail = anchor('mailto:tpcb@example.test');
  const download = anchor('https://elsewhere.test/file.pdf', { download: '' });
  const chosen = anchor('https://elsewhere.test/', { target: '_self' });
  const icon = anchor('https://elsewhere.test/social', { target: '_blank', 'aria-label': 'Social' });
  annotate([external, internal, fragment, mail, download, chosen, icon]);
  assert.equal(external.getAttribute('target'), '_blank');
  assert.equal(external.getAttribute('rel'), 'nofollow noopener');
  assert.equal(external.textContent, 'Link (opens in a new tab)');
  for (const a of [internal, fragment, mail, download]) assert.equal(a.getAttribute('target'), null);
  assert.equal(chosen.getAttribute('target'), '_self');
  assert.equal(icon.getAttribute('aria-label'), 'Social (opens in a new tab)');
  annotate([external, icon]);
  assert.equal(external.textContent, 'Link (opens in a new tab)');
  assert.equal(icon.getAttribute('aria-label'), 'Social (opens in a new tab)');
});

test('profile navigation changes active semantics and ignores unavailable sections', () => {
  const a = target(), b = target(), missing = target();
  a.setAttribute('href', '#research'); b.setAttribute('href', '#students'); missing.setAttribute('href', '#gone');
  const sections = { research: { id: 'research' }, students: { id: 'students' } };
  let callback; const observed = [];
  const IntersectionObserver = class { constructor(fn) { callback = fn; } observe(s) { observed.push(s.id); } };
  run('profile-nav.js', { window: { IntersectionObserver }, IntersectionObserver,
    document: { querySelectorAll: () => [a, b, missing], getElementById: id => sections[id] } });
  assert.deepEqual(observed, ['research', 'students']);
  callback([{ target: sections.research, isIntersecting: true }]);
  assert.equal(a.getAttribute('aria-current'), 'true');
  callback([{ target: sections.students, isIntersecting: true }, { target: sections.research, isIntersecting: false }]);
  assert.equal(b.getAttribute('aria-current'), 'true');
  assert.equal(a.getAttribute('aria-current'), null);
});

function directory() {
  const c = clock(), search = target(), count = target(), empty = target(), reset = target();
  const makeGroup = (key, values) => {
    const buttons = values.map(value => target({ dataset: { value } }));
    return target({ dataset: { filterKey: key }, buttons, querySelectorAll: () => buttons });
  };
  const inst = makeGroup('institutions', ['all', 'WCM', 'MSK']), cohort = makeGroup('cohort', ['all', '2026']);
  const headings = ['June', 'May'].map(group => target({ dataset: { group } }));
  const items = [
    { institutions: 'WCM MSK', cohort: '2026', group: 'June', search: 'ada two advisors' },
    { institutions: 'MSK', cohort: '2025', group: 'May', search: 'ben one advisor' }
  ].map(dataset => target({ dataset }));
  const controls = target({ dataset: { items: '.item', count: 'count', empty: 'empty', noun: 'students' },
    querySelector: () => search, querySelectorAll: () => [inst, cohort] });
  const document = {
    querySelector: () => controls, getElementById: id => id === 'count' ? count : empty,
    querySelectorAll: s => ({ '.item': items, '[data-group-heading]': headings, '[data-filter-reset]': [reset], 'button[data-sort]': [] }[s])
  };
  run('directory.js', { document, window: c });
  return { c, search, count, empty, reset, inst, cohort, headings, items };
}

test('shared directory matches co-advisors, ANDs filters, hides headings and resets focus', () => {
  const d = directory();
  d.inst.buttons[1].emit('click');
  assert.deepEqual(d.items.map(x => x.hidden), [false, true]);
  assert.deepEqual(d.headings.map(x => x.hidden), [false, true]);
  d.inst.buttons[2].emit('click'); d.cohort.buttons[1].emit('click');
  assert.deepEqual(d.items.map(x => x.hidden), [false, true]);
  d.search.value = 'missing'; d.search.emit('input');
  assert.equal(d.empty.hidden, false);
  assert.equal(d.count.textContent, 'Showing 1 of 2 students');
  d.c.flush(); assert.equal(d.count.textContent, 'Showing 0 of 2 students');
  d.reset.emit('click');
  assert.deepEqual(d.items.map(x => x.hidden), [false, false]);
  assert.equal(d.search.focused, true);
  assert.equal(d.count.textContent, 'Showing 2 of 2 students');
  assert.equal(d.inst.buttons[0].getAttribute('aria-pressed'), 'true');
});

test('alumni sorting keeps filtered rows hidden and uses name to break year ties', () => {
  const rows = [ ['ada', '2025'], ['ben', '2026'], ['clara', '2026'] ].map(([name, entry]) => target({ dataset: { name, entry } }));
  rows[1].hidden = true;
  const tbody = { rows, appendChild(fragment) { this.order = fragment.rows; } };
  const headers = [target(), target()];
  const buttons = ['name', 'entry'].map((sort, i) => target({ dataset: { sort }, closest: s => s === 'table' ? { tBodies: [tbody] } : headers[i] }));
  run('directory.js', { window: {}, document: {
    querySelector: () => null, querySelectorAll: () => buttons,
    createDocumentFragment: () => ({ rows: [], appendChild(row) { this.rows.push(row); } })
  } });
  buttons[1].emit('click');
  assert.deepEqual(tbody.order.map(x => x.dataset.name), ['ben', 'clara', 'ada']);
  assert.equal(headers[1].getAttribute('aria-sort'), 'descending');
  assert.equal(rows[1].hidden, true);
  buttons[0].emit('click');
  assert.deepEqual(tbody.order.map(x => x.dataset.name), ['ada', 'ben', 'clara']);
});


function faculty(query = '') {
  const c = clock(), form = target(), search = target(), accepting = target({ checked: false });
  const count = target(), empty = target(), reset = target(), inputs = [];
  function input(name, value, initial = false) {
    let checked = initial;
    const el = target({ name, value, initial });
    Object.defineProperty(el, 'checked', { get: () => checked, set(on) {
      if (on && name === 'inst') inputs.filter(x => x.name === name && x !== el).forEach(x => { x.checked = false; });
      checked = on;
    } });
    inputs.push(el); return el;
  }
  input('inst', 'all', true); input('inst', 'WCM'); input('inst', 'MSK');
  input('approach', 'Biophysics'); input('approach', 'Drug Discovery');
  input('focus', 'Gene Expression & RNA'); input('focus', 'Cancer Biology');
  form.querySelectorAll = s => inputs.filter(x => s === `input[name="${x.name}"]`);
  form.querySelector = () => inputs.find(x => x.name === 'inst' && x.checked);
  form.reset = () => { inputs.forEach(x => { x.checked = x.initial; }); search.value = ''; accepting.checked = false; };
  const cards = [
    { inst: 'WCM', approach: '|Biophysics|', focus: '|Gene Expression & RNA|', accepting: 'yes', search: 'ada scientist' },
    { inst: 'MSK', approach: '|Drug Discovery|', focus: '|Cancer Biology|', accepting: 'no', search: 'ben researcher' }
  ].map(dataset => target({ dataset }));
  const elements = { 'fd-grid': { querySelectorAll: () => cards }, 'fd-filters': form,
    'fd-search-input': search, 'fd-accepting': accepting, 'fd-count': count, 'fd-empty': empty, 'fd-reset': reset };
  const writes = [], history = { replaceState(_state, _title, url) { writes.push(url); } };
  run('faculty-directory.js', { history, window: { ...c, URLSearchParams, history,
    location: { search: query, pathname: '/tpcb-website/faculty/' } }, document: {
    getElementById: id => elements[id], querySelectorAll: () => []
  } });
  return { c, form, search, accepting, count, empty, reset, inputs, cards, writes };
}

test('faculty URL state safely handles ampersands and persists AND/OR filters', () => {
  const f = faculty('?inst=WCM&focus=Gene+Expression+%26+RNA&accepting=1');
  assert.deepEqual(f.cards.map(x => x.hidden), [false, true]);
  assert.equal(f.count.textContent, 'Showing 1 of 2 faculty');
  f.reset.emit('click');
  assert.deepEqual(f.cards.map(x => x.hidden), [false, false]);
  assert.equal(f.writes.at(-1), '/tpcb-website/faculty/');
  for (const x of f.inputs.filter(x => x.name === 'approach')) x.checked = true;
  f.form.emit('change');
  assert.deepEqual(f.cards.map(x => x.hidden), [false, false]);
  assert.equal(new URLSearchParams(f.writes.at(-1)).get('approach'), 'Biophysics|Drug Discovery');
  f.accepting.checked = true; f.form.emit('change');
  assert.deepEqual(f.cards.map(x => x.hidden), [false, true]);
  f.search.value = 'researcher'; f.search.emit('input'); f.c.flush();
  assert.equal(f.empty.hidden, false);
  assert.equal(f.count.textContent, 'Showing 0 of 2 faculty');
  let prevented = false; f.form.emit('submit', { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

function hero({ reduced = false, storedPause = false, blockedStorage = false, tokens = true } = {}) {
  const c = clock(), motion = target({ matches: reduced }), pointerQuery = target({ matches: true });
  const parent = target(), button = target({ hidden: true }), root = target();
  const drawings = { renders: 0, arcs: [], tokenReads: 0 };
  const ctx = new Proxy({
    clearRect() { drawings.renders++; drawings.arcs = []; },
    arc(x, y, radius) { drawings.arcs.push({ x, y, radius }); },
    createRadialGradient() { return { addColorStop() {} }; }
  }, { get(object, key) { return key in object ? object[key] : () => {}; }, set(object, key, value) { object[key] = value; return true; } });
  const canvas = target({ parentElement: parent, getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 1000, height: 600, left: 0, top: 0 }) });
  const storage = new Map(storedPause ? [['tpcb:hero-motion', 'paused']] : []);
  const localStorage = {
    getItem(k) { if (blockedStorage) throw Error('blocked'); return storage.get(k); },
    setItem(k, v) { if (blockedStorage) throw Error('blocked'); storage.set(k, v); }
  };
  const observers = [], resizeObservers = [];
  const IntersectionObserver = class { constructor(fn) { observers.push(fn); } observe() {} };
  const ResizeObserver = class { constructor(fn) { resizeObservers.push(fn); } observe() {} };
  const window = target({ ...c, localStorage, devicePixelRatio: 3, IntersectionObserver, ResizeObserver,
    matchMedia: q => q.includes('reduced-motion') ? motion : pointerQuery });
  const document = target({ documentElement: root, visibilityState: 'visible',
    getElementById: id => id === 'hero-atoms' ? canvas : button });
  const random = Object.create(Math); random.random = () => 0.5;
  run('hero-atoms.js', { window, document, IntersectionObserver, ResizeObserver, Math: random,
    getComputedStyle() { drawings.tokenReads++; return { getPropertyValue: () => tokens ? 'rgba(20, 40, 80, 0.4)' : '' }; }
  });
  return { c, motion, parent, button, canvas, document, window, drawings, storage, observers, resizeObservers };
}

test('hero respects pause persistence, reduced motion, visibility and observer changes', () => {
  const h = hero({ storedPause: true });
  assert.equal(h.c.frames.size, 0);
  assert.equal(h.button.getAttribute('aria-pressed'), 'true');
  assert.equal(h.canvas.width, 2000); // capped DPR
  h.button.emit('click'); assert.equal(h.c.frames.size, 1);
  h.document.visibilityState = 'hidden'; h.document.emit('visibilitychange');
  assert.equal(h.c.frames.size, 0);
  h.document.visibilityState = 'visible'; h.document.emit('visibilitychange');
  assert.equal(h.c.frames.size, 1);
  h.observers[0]([{ isIntersecting: false }]); assert.equal(h.c.frames.size, 0);
  h.observers[0]([{ isIntersecting: true }]); assert.equal(h.c.frames.size, 1);
  h.motion.matches = true; h.motion.emit('change');
  assert.equal(h.c.frames.size, 0); assert.equal(h.button.hidden, true);
  h.motion.matches = false; h.motion.emit('change');
  assert.equal(h.c.frames.size, 1); assert.equal(h.button.hidden, false);
});

test('hero handles blocked storage, freezes pointer when paused and repaints theme/resize', () => {
  const h = hero({ blockedStorage: true });
  h.c.tick(100); const before = h.drawings.arcs[0].x;
  h.c.tick(10000); const after = h.drawings.arcs[0].x;
  assert.ok(Math.abs(after - before) <= 11 * 0.05); // clamped elapsed time
  h.button.emit('click');
  assert.equal(h.c.frames.size, 0);
  let rendered = h.drawings.renders;
  h.parent.emit('pointermove', { pointerType: 'mouse', clientX: 50, clientY: 20 });
  assert.equal(h.drawings.renders, rendered);
  h.document.emit('tpcb:themechange');
  assert.equal(h.drawings.renders, rendered + 1);
  h.resizeObservers[0]();
  assert.equal(h.drawings.renders, rendered + 2);
});

test('hero missing theme tokens does not expose a nonfunctional pause control', () => {
  const h = hero({ tokens: false });
  assert.equal(h.c.frames.size, 0); assert.equal(h.button.hidden, true);
});

test('reveal scroll fallback reveals sections and decimal counters settle exactly', () => {
  const c = clock(), root = target(), document = target(), callbacks = [], observed = [];
  let top = 1200;
  const section = target({ getBoundingClientRect: () => ({ top, bottom: top + 200 }) });
  const counter = target({ textContent: '5.4' }); counter.setAttribute('data-count-to', '5.4');
  const IntersectionObserver = class {
    constructor(fn) { callbacks.push(fn); }
    observe(el) { observed.push(el); }
    unobserve() {}
  };
  let ready = false; document.addEventListener('tpcb:revealready', () => { ready = true; });
  document.documentElement = root;
  document.querySelectorAll = s => s === '[data-reveal]' ? [section] : [counter];
  const window = target({ ...c, IntersectionObserver, innerHeight: 900,
    matchMedia: () => ({ matches: false }) });
  run('reveal.js', { window, document, IntersectionObserver });
  assert.equal(ready, true); assert.equal(observed.length, 2);
  assert.equal(section.classList.contains('is-revealed'), false);
  top = 500; window.emit('scroll'); c.tick();
  assert.equal(section.classList.contains('is-revealed'), true);
  callbacks[1]([{ target: counter, isIntersecting: true }]);
  c.tick(100); c.tick(1200);
  assert.equal(counter.textContent, '5.4');
  assert.equal(c.frames.size, 0);
});

test('external fragment with the current pathname remains an external link', () => {
  const external = anchor('https://elsewhere.test/about/#section');
  const internal = anchor('https://site.test/about/#section');
  annotate([external, internal]);
  assert.equal(external.getAttribute('target'), '_blank');
  assert.equal(external.getAttribute('rel'), 'noopener');
  assert.equal(external.textContent, 'Link (opens in a new tab)');
  assert.equal(internal.getAttribute('target'), null);
});

test('theme preserves explicit choice through OS changes when storage is blocked', () => {
  const t = theme(true);
  t.button.emit('click');
  assert.equal(t.root.getAttribute('data-theme'), 'dark');
  t.media.emit('change', { matches: true });
  t.media.emit('change', { matches: false });
  assert.equal(t.root.getAttribute('data-theme'), 'dark');
  t.button.emit('click');
  assert.equal(t.root.getAttribute('data-theme'), 'light');
});

test('theme still suppresses OS override for preferences saved by another tab', () => {
  const t = theme();
  t.storage.set('tpcb-theme', 'light');
  t.media.emit('change', { matches: true });
  assert.equal(t.root.getAttribute('data-theme'), 'light');
});
