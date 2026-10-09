// Run with: node --test tools/tests/navigation-publications.test.cjs
// Exercise the shipped scripts' event handlers without a browser or dependencies.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element() {
  const listeners = {};
  const classes = new Set();
  return {
    hidden: false,
    attributes: {},
    classList: {
      contains: name => classes.has(name),
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      toggle(name, on = !classes.has(name)) {
        if (on) classes.add(name); else classes.delete(name);
      }
    },
    addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
    emit(name, event = {}) { (listeners[name] || []).forEach(fn => fn(event)); },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
}

function runScript(name, globals) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../assets/js', name), 'utf8'), globals);
}

function navigation(desktopMode = true) {
  const document = element();
  const navbar = element();
  const menu = element();
  const toggle = element();
  const item = element();
  const button = element();
  const submenu = element();
  const link = element();
  const desktop = element();
  desktop.matches = desktopMode;
  item.hover = false;
  item.focusWithin = false;
  item.matches = selector => selector === ':hover' ? item.hover : item.focusWithin;
  item.querySelector = selector => selector === '.dropdown-toggle' ? button : submenu;
  item.contains = node => [item, button, submenu, link].includes(node);
  submenu.contains = node => node === link;
  navbar.querySelectorAll = () => [item];
  navbar.contains = node => item.contains(node) || [menu, toggle].includes(node);
  button.focus = () => { document.activeElement = button; item.focusWithin = true; };
  toggle.focus = () => { document.activeElement = toggle; item.focusWithin = false; };
  document.querySelector = selector => selector === '.navbar' ? navbar : toggle;
  document.getElementById = () => menu;
  const timers = [];
  runScript('nav.js', { document, window: { matchMedia: () => desktop, setTimeout: fn => timers.push(fn) } });
  return { document, navbar, menu, toggle, item, button, link,
    flush() { while (timers.length) timers.shift()(); } };
}

test('Escape stays dismissed while focus remains after pointer leaves', () => {
  const n = navigation();
  n.item.hover = true;
  n.item.focusWithin = true;
  n.document.activeElement = n.link;
  n.document.emit('keydown', { key: 'Escape' });
  assert.equal(n.document.activeElement, n.button);
  assert.equal(n.button.attributes['aria-expanded'], 'false');
  n.item.hover = false;
  n.item.emit('mouseleave');
  n.flush();
  assert.equal(n.item.classList.contains('dismissed'), true);
  assert.equal(n.button.attributes['aria-expanded'], 'false');
  n.item.focusWithin = false;
  n.item.emit('focusout', { relatedTarget: null });
  n.flush();
  assert.equal(n.item.classList.contains('dismissed'), false);
  n.item.hover = true;
  n.item.emit('mouseenter');
  n.flush();
  assert.equal(n.button.attributes['aria-expanded'], 'true');
});

test('Escape stays dismissed while pointer remains after focus leaves', () => {
  const n = navigation();
  n.item.hover = true;
  n.item.focusWithin = true;
  n.document.activeElement = n.button;
  n.document.emit('keydown', { key: 'Escape' });
  n.item.emit('focusout', { relatedTarget: null });
  // CSS focus state is settled only after the event handler.
  n.item.focusWithin = false;
  n.flush();
  assert.equal(n.item.classList.contains('dismissed'), true);
  assert.equal(n.button.attributes['aria-expanded'], 'false');
  n.item.emit('mouseleave');
  n.item.hover = false;
  n.flush();
  assert.equal(n.item.classList.contains('dismissed'), false);
});

test('desktop disclosure button can explicitly reopen a dismissed submenu', () => {
  const n = navigation();
  n.item.focusWithin = true;
  n.document.activeElement = n.button;
  n.document.emit('keydown', { key: 'Escape' });
  n.button.emit('click');
  assert.equal(n.item.classList.contains('dismissed'), false);
  assert.equal(n.button.attributes['aria-expanded'], 'true');
});

test('mobile Escape closes submenu then panel and restores owning controls', () => {
  const n = navigation(false);
  n.toggle.emit('click');
  n.button.emit('click');
  assert.equal(n.item.classList.contains('open'), true);
  n.document.activeElement = n.link;
  n.document.emit('keydown', { key: 'Escape' });
  assert.equal(n.item.classList.contains('open'), false);
  assert.equal(n.document.activeElement, n.button);
  assert.equal(n.menu.classList.contains('open'), true);
  n.document.emit('keydown', { key: 'Escape' });
  assert.equal(n.menu.classList.contains('open'), false);
  assert.equal(n.document.activeElement, n.toggle);
});

test('publication search finds a title present only in the fallback citation', () => {
  const search = element(); search.value = ''; search.focus = () => {};
  const controls = element(); controls.hidden = true;
  const count = { textContent: '' };
  const clear = element();
  const empty = element();
  const heading = element();
  const fields = {
    '.bib-authors': 'Hazra, A.; Chatterjee, A.',
    '.bib-meta': '2009',
    '.bib-note': 'Coenzyme and prosthetic group biosynthesis. In Encyclopedia of Microbiology.',
    '.bib-tpcb': 'Hazra, Amrita'
  };
  const entry = {
    querySelectorAll(selector) {
      return fields[selector] ? [{ cloneNode() {
        return { textContent: fields[selector], querySelectorAll: () => [] };
      } }] : [];
    }
  };
  const li = element(); li.querySelector = () => entry;
  const list = element(); list.tagName = 'OL'; list.children = [li];
  heading.nextElementSibling = list;
  const document = {
    querySelector(selector) {
      return { '.bib-wrapper': { querySelectorAll: () => [heading] }, '.pubfilter': controls,
        '.pubfilter-empty': empty }[selector];
    },
    getElementById(id) { return { 'pub-search': search, 'pubfilter-count': count, 'pubfilter-clear': clear }[id]; }
  };
  let timer;
  runScript('publications.js', { document, window: {
    setTimeout(fn) { timer = fn; return 1; }, clearTimeout() { timer = null; }
  } });
  search.value = 'Coenzyme and prosthetic group biosynthesis';
  search.emit('input');
  timer();
  assert.equal(li.hidden, false);
  assert.equal(heading.hidden, false);
  assert.equal(count.textContent, 'Showing 1 of 1 publications');
  search.value = 'unmatched citation';
  search.emit('input');
  timer();
  assert.equal(li.hidden, true);
  assert.equal(list.hidden, true);
  assert.equal(empty.hidden, false);
  clear.emit('click');
  assert.equal(li.hidden, false);
  assert.equal(heading.hidden, false);
  assert.equal(count.textContent, 'Showing all 1 publications');
});
