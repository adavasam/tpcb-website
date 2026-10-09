const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function target(extra = {}) {
  const listeners = new Map();
  const attributes = new Map();
  const classes = new Set();
  return Object.assign({
    hidden: false, textContent: '', dataset: {}, value: '',
    style: { setProperty(name, value) { this[name] = value; } },
    classList: { contains: x => classes.has(x), add: x => classes.add(x), remove: x => classes.delete(x),
      toggle(x, on = !classes.has(x)) { if (on) classes.add(x); else classes.delete(x); } },
    setAttribute: (k, v) => attributes.set(k, String(v)),
    getAttribute: k => attributes.has(k) ? attributes.get(k) : null,
    hasAttribute: k => attributes.has(k), removeAttribute: k => attributes.delete(k),
    addEventListener(k, fn) { if (!listeners.has(k)) listeners.set(k, new Set()); listeners.get(k).add(fn); },
    removeEventListener(k, fn) { listeners.get(k)?.delete(fn); },
    emit(k, event = {}) { for (const fn of [...(listeners.get(k) || [])]) fn(event); },
    dispatchEvent(event) { this.emit(event.type, event); },
    focus() { this.focused = true; }
  }, extra);
}
function clock() {
  let next = 1;
  const frames = new Map(), timers = new Map();
  return {
    frames, timers,
    requestAnimationFrame(fn) { const id = next++; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn) { const id = next++; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    tick(time = 100) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); },
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }
  };
}
function run(name, globals) {
  const context = { CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    URLSearchParams, ...globals };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../assets/js', name), 'utf8'), context);
}
module.exports = { target, clock, run };
