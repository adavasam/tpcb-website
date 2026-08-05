/* hero-atoms.js — TPCB homepage hero background.
 *
 * Slowly drifting "atoms" with faint "bonds" drawn between near neighbours,
 * painted behind the hero copy. Deliberately sparse and slow: this is a
 * decorative texture for an academic program site, not a focal point.
 *
 * Design constraints this file is written to honour:
 *  - Colours are read from the CSS custom properties --hero-node / --hero-bond
 *    (see assets/css/tpcb.css). No colour literals live in this file, so the
 *    palette stays under the designer's control and the contrast budget for the
 *    hero title/tagline is decided in one place. Distance fade is applied with
 *    globalAlpha, which can only ever *lower* the token's alpha, never raise it.
 *  - prefers-reduced-motion: reduce paints exactly one static frame and never
 *    starts a rAF loop. Toggling the setting mid-session is handled live.
 *  - The loop is suspended while the hero is scrolled out of view
 *    (IntersectionObserver) or the tab is hidden (visibilitychange).
 *  - Cost is capped for mobile: devicePixelRatio clamped to 2, node count scaled
 *    to viewport area with a hard ceiling, and bond search done through a
 *    uniform spatial grid rather than an O(n^2) sweep.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-atoms');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* --- Tunables ------------------------------------------------------- */
  var MAX_DPR = 2;             // retina is plenty; 3x costs 2.25x the fill
  var AREA_PER_NODE = 15000;   // CSS px^2 of hero per atom
  var MIN_NODES = 18;
  var MAX_NODES = 90;          // ceiling regardless of how wide the viewport is
  var BOND_DIST = 130;         // CSS px; also the spatial grid cell size
  var BOND_FALLOFF = 1.6;      // >1 concentrates bond ink on the shortest bonds
  var SPEED_MIN = 5;           // px per second
  var SPEED_MAX = 13;
  var RADIUS_MIN = 1.0;
  var RADIUS_MAX = 2.3;
  var MAX_FRAME_DT = 0.05;     // clamp dt so a backgrounded tab can't jump
  var RESIZE_DEBOUNCE = 150;

  /* Pointer interaction. Atoms are nudged away from the cursor and grow faint
     bonds to it, so the field responds to the reader without becoming a toy. */
  var CURSOR_PUSH_DIST = 170;  // CSS px — radius of the repulsion field
  var CURSOR_PUSH = 26;        // px/sec at the centre, tapering to 0 at the rim
  var CURSOR_BOND_DIST = 190;  // CSS px — cursor draws bonds within this
  var CURSOR_GLOW_RADIUS = 130; // CSS px — radius of the halo under the cursor

  /* Clear region around the hero copy. The tokens are deliberately darker than
     the text could tolerate as a flat wash, so this erase is load-bearing for
     contrast, not decoration — see the --hero-* comment in tpcb.css. */
  var TEXT_CLEAR_PAD = 26;     // fully-erased margin beyond the copy's box
  var TEXT_CLEAR_FADE = 130;   // px over which the erase ramps back to zero

  /* --- Colour tokens --------------------------------------------------- */
  var nodeColor = '';
  var bondColor = '';
  var cursorColor = '';
  var glowColor = '';
  var glowFade = '';

  /* A gradient needs a fully-transparent stop of the SAME hue. Fading to the
     CSS keyword `transparent` is rgba(0,0,0,0), which some engines interpolate
     through black and leaves a dirty edge — so derive the zero-alpha stop from
     the token's own channels rather than hardcoding one. */
  function zeroAlpha(color) {
    var m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(color || '');
    return m ? 'rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ',0)' : '';
  }

  function readTokens() {
    var cs = getComputedStyle(document.documentElement);
    nodeColor = cs.getPropertyValue('--hero-node').trim();
    bondColor = cs.getPropertyValue('--hero-bond').trim();
    cursorColor = cs.getPropertyValue('--hero-cursor').trim() || bondColor;
    glowColor = cs.getPropertyValue('--hero-glow').trim();
    glowFade = zeroAlpha(glowColor);
    return nodeColor !== '' || bondColor !== '';
  }

  // If the stylesheet hasn't defined the tokens there is nothing safe to draw:
  // bail rather than invent a colour.
  if (!readTokens()) return;

  /* --- State ----------------------------------------------------------- */
  var nodes = [];
  var w = 0, h = 0, dpr = 1;
  var rafId = 0;
  var lastTime = 0;
  var visible = true;     // hero intersects the viewport
  var focused = true;     // tab is foregrounded
  var reduced = false;    // prefers-reduced-motion: reduce
  var paused = false;     // user pressed the in-page pause control

  // Pointer position in canvas space; null whenever the cursor is not over
  // the hero, which is also the state under reduced motion.
  var pointer = null;

  // Copy's bounding box in canvas space, refreshed on measure().
  var textBox = null;

  var motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  // Only wire the cursor on devices that actually have one. On touch this
  // would either never fire or fight the scroll gesture.
  var finePointer = window.matchMedia
    ? window.matchMedia('(hover: hover) and (pointer: fine)')
    : null;

  function rand(min, max) { return min + Math.random() * (max - min); }

  /* --- Sizing ---------------------------------------------------------- */
  function measure() {
    var rect = canvas.getBoundingClientRect();
    var nextW = Math.max(1, Math.round(rect.width));
    var nextH = Math.max(1, Math.round(rect.height));
    var nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var changed = nextW !== w || nextH !== h || nextDpr !== dpr;

    // Keep the drift continuous across a resize by rescaling positions.
    var scaleX = w > 0 ? nextW / w : 1;
    var scaleY = h > 0 ? nextH / h : 1;

    w = nextW; h = nextH; dpr = nextDpr;

    // Backing store in device pixels, drawing commands in CSS pixels.
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (changed && nodes.length) {
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].x *= scaleX;
        nodes[i].y *= scaleY;
      }
    }
    measureText();
    return changed;
  }

  /* Locate the hero copy relative to the canvas so the clear region tracks it
     across resizes and font-size changes rather than assuming a fixed centre. */
  function measureText() {
    var content = document.querySelector('.hero-content');
    if (!content) { textBox = null; return; }
    var cr = canvas.getBoundingClientRect();
    var tr = content.getBoundingClientRect();
    if (!tr.width || !tr.height) { textBox = null; return; }
    textBox = {
      cx: (tr.left - cr.left) + tr.width / 2,
      cy: (tr.top - cr.top) + tr.height / 2,
      hw: tr.width / 2,
      hh: tr.height / 2
    };
  }

  function targetCount() {
    var n = Math.round((w * h) / AREA_PER_NODE);
    return Math.max(MIN_NODES, Math.min(MAX_NODES, n));
  }

  function makeNode() {
    var angle = Math.random() * Math.PI * 2;
    var speed = rand(SPEED_MIN, SPEED_MAX);
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: rand(RADIUS_MIN, RADIUS_MAX)
    };
  }

  function syncNodeCount() {
    var want = targetCount();
    while (nodes.length < want) nodes.push(makeNode());
    if (nodes.length > want) nodes.length = want;
  }

  /* --- Simulation ------------------------------------------------------ */
  function step(dt) {
    var pushSq = CURSOR_PUSH_DIST * CURSOR_PUSH_DIST;

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx * dt;
      n.y += n.vy * dt;

      // Nudge away from the cursor. This displaces position rather than
      // velocity, so atoms ease aside and then resume their own drift instead
      // of accumulating momentum and flying off.
      if (pointer) {
        var dx = n.x - pointer.x;
        var dy = n.y - pointer.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < pushSq) {
          var d = Math.sqrt(d2);
          var force = (1 - d / CURSOR_PUSH_DIST) * CURSOR_PUSH * dt;
          n.x += (dx / d) * force;
          n.y += (dy / d) * force;
        }
      }

      // Reflect off the edges; no wrapping, so atoms never pop in or out.
      if (n.x < 0) { n.x = 0; n.vx = -n.vx; }
      else if (n.x > w) { n.x = w; n.vx = -n.vx; }
      if (n.y < 0) { n.y = 0; n.vy = -n.vy; }
      else if (n.y > h) { n.y = h; n.vy = -n.vy; }
    }
  }

  /* --- Cursor glow -------------------------------------------------------
   * Painted first, so atoms and bonds sit on top of the halo rather than being
   * veiled by it.
   */
  function drawCursorGlow() {
    if (!pointer || !glowColor || !glowFade) return;
    var g = ctx.createRadialGradient(
      pointer.x, pointer.y, 0,
      pointer.x, pointer.y, CURSOR_GLOW_RADIUS
    );
    g.addColorStop(0, glowColor);
    g.addColorStop(1, glowFade);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, CURSOR_GLOW_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  /* --- Cursor bonds ----------------------------------------------------- */
  function drawCursorBonds() {
    if (!pointer || !cursorColor) return;
    var maxSq = CURSOR_BOND_DIST * CURSOR_BOND_DIST;
    ctx.strokeStyle = cursorColor;
    ctx.lineWidth = 1;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var dx = n.x - pointer.x;
      var dy = n.y - pointer.y;
      var d2 = dx * dx + dy * dy;
      if (d2 >= maxSq) continue;
      ctx.globalAlpha = Math.pow(1 - Math.sqrt(d2) / CURSOR_BOND_DIST, BOND_FALLOFF);
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(pointer.x, pointer.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* --- Clear the copy ---------------------------------------------------
   * Erase an elliptical region over the hero text once everything else is
   * painted. Doing it as a composite pass rather than per-node is what makes
   * it correct: a bond can span the copy with both endpoints far outside it,
   * and only an erase catches that. Also keeps the cost at one fill.
   */
  function clearTextRegion() {
    if (!textBox) return;
    var rx = textBox.hw + TEXT_CLEAR_PAD + TEXT_CLEAR_FADE;
    var ry = textBox.hh + TEXT_CLEAR_PAD + TEXT_CLEAR_FADE;
    if (rx <= 0 || ry <= 0) return;

    // Fraction of the radius erased outright, before the ramp starts.
    //
    // This used to be min() of the two axis ratios, which is wrong: the
    // gradient is built in unit-circle space and THEN scaled by (rx, ry), so a
    // single scalar stop has to clear the box's CORNER, not its edge midpoints.
    // min() under-covered the long axis by ~83px on a desktop hero, leaving up
    // to 55% of the field's ink over the outer corners of the copy. Taking the
    // corner's radius in unit space fixes that; capped at 1 so the ramp is
    // never eliminated entirely.
    var solid = Math.min(1, Math.hypot(
      (textBox.hw + TEXT_CLEAR_PAD) / rx,
      (textBox.hh + TEXT_CLEAR_PAD) / ry
    ));

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.translate(textBox.cx, textBox.cy);
    ctx.scale(rx, ry);            // unit circle -> ellipse matching the copy
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(solid, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* --- Bond search ------------------------------------------------------
   * Uniform spatial grid with cell size == BOND_DIST, so every pair within
   * bonding range is found by checking a node's own cell plus a half
   * neighbourhood (E, SW, S, SE). That visits each pair exactly once and keeps
   * the cost linear in node count instead of quadratic.
   */
  var NEIGHBOURS = [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

  function drawBonds() {
    if (!bondColor) return;

    var cols = Math.max(1, Math.ceil(w / BOND_DIST));
    var rows = Math.max(1, Math.ceil(h / BOND_DIST));
    var buckets = [];
    var i, j, k;

    for (i = 0; i < cols * rows; i++) buckets.push(null);

    for (i = 0; i < nodes.length; i++) {
      var cx = Math.min(cols - 1, Math.max(0, Math.floor(nodes[i].x / BOND_DIST)));
      var cy = Math.min(rows - 1, Math.max(0, Math.floor(nodes[i].y / BOND_DIST)));
      var key = cy * cols + cx;
      if (buckets[key] === null) buckets[key] = [i];
      else buckets[key].push(i);
      nodes[i].cx = cx;
      nodes[i].cy = cy;
    }

    var maxSq = BOND_DIST * BOND_DIST;
    ctx.strokeStyle = bondColor;
    ctx.lineWidth = 1;

    for (i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (k = 0; k < NEIGHBOURS.length; k++) {
        var nx = a.cx + NEIGHBOURS[k][0];
        var ny = a.cy + NEIGHBOURS[k][1];
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        var bucket = buckets[ny * cols + nx];
        if (bucket === null) continue;
        var sameCell = (NEIGHBOURS[k][0] === 0 && NEIGHBOURS[k][1] === 0);
        for (j = 0; j < bucket.length; j++) {
          var bi = bucket[j];
          if (sameCell && bi <= i) continue;   // count each in-cell pair once
          var b = nodes[bi];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= maxSq) continue;
          // Fade with distance, raised to BOND_FALLOFF so a bond darkens
          // sharply as the two atoms close on each other. globalAlpha only
          // ever attenuates the token's own alpha, never raises it.
          ctx.globalAlpha = Math.pow(1 - Math.sqrt(d2) / BOND_DIST, BOND_FALLOFF);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawNodes() {
    if (!nodeColor) return;
    ctx.fillStyle = nodeColor;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render() {
    ctx.clearRect(0, 0, w, h);
    drawCursorGlow();    // under everything else
    drawBonds();
    drawCursorBonds();
    drawNodes();
    clearTextRegion();   // must run last: it erases whatever was painted
  }

  /* --- Loop ------------------------------------------------------------ */
  function frame(now) {
    var dt = lastTime ? Math.min((now - lastTime) / 1000, MAX_FRAME_DT) : 0;
    lastTime = now;
    step(dt);
    render();
    rafId = window.requestAnimationFrame(frame);
  }

  function shouldAnimate() {
    return !reduced && !paused && visible && focused;
  }

  function start() {
    if (rafId || !shouldAnimate()) return;
    lastTime = 0;   // fresh clock, so a resumed loop doesn't leap forward
    rafId = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
    lastTime = 0;
  }

  function sync() {
    if (shouldAnimate()) start();
    else stop();
  }

  /* --- Reduced motion --------------------------------------------------
   * When reduce is set we never enter the rAF loop at all: one static frame is
   * painted and that is the whole of the animation. Toggling the OS setting
   * mid-session switches between the two behaviours live.
   */
  function applyMotionPreference() {
    reduced = !!(motionQuery && motionQuery.matches);
    if (reduced) {
      stop();
      pointer = null;   // cursor interaction is motion; drop it entirely
      render();         // single static frame
    } else {
      sync();
    }
    syncToggle();
  }

  /* --- Pointer ----------------------------------------------------------
   * Bound to the hero section, not the canvas: the canvas is pointer-events:
   * none so the copy underneath stays selectable and its links clickable.
   * Ignored outright under reduced motion, and on coarse pointers where it
   * would either never fire or interfere with scrolling.
   */
  function wirePointer() {
    var hero = canvas.parentElement;
    if (!hero) return;

    hero.addEventListener('pointermove', function (e) {
      if (reduced || e.pointerType === 'touch') return;
      var rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      // Under an idle loop (offscreen/backgrounded) there is nothing to redraw.
      if (!rafId && visible && focused) render();
    }, { passive: true });

    function clearPointer() {
      if (!pointer) return;
      pointer = null;
      if (!rafId) render();   // drop the cursor bonds immediately
    }
    hero.addEventListener('pointerleave', clearPointer, { passive: true });
    hero.addEventListener('pointercancel', clearPointer, { passive: true });
  }

  if (!finePointer || finePointer.matches) wirePointer();

  if (motionQuery) {
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', applyMotionPreference);
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(applyMotionPreference);   // Safari < 14
    }
  }

  /* --- Pause when offscreen or backgrounded ---------------------------- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      if (!reduced) sync();
    }, { threshold: 0 }).observe(canvas);
  }

  document.addEventListener('visibilitychange', function () {
    focused = document.visibilityState !== 'hidden';
    if (!reduced) sync();
  });

  /* --- Keep the clear region registered with the copy --------------------
   * measure() alone is not enough: it runs at boot and on window resize, but
   * the copy's box also changes when the web fonts swap in (the script is
   * deferred, so boot can measure fallback-font layout) and when a browser
   * applies text-only zoom, neither of which fires `resize`. A stale box means
   * the field paints but the erase lands in the wrong place — and under
   * prefers-reduced-motion there is no loop to repaint it, so the
   * mis-registration would persist for the whole session.
   */
  function remeasure() {
    measure();
    syncNodeCount();
    if (!rafId) render();
  }

  if (window.ResizeObserver) {
    var content = document.querySelector('.hero-content');
    if (content) new ResizeObserver(remeasure).observe(content);
  }
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(remeasure).catch(function () {});
  }

  /* --- Resize (debounced) ---------------------------------------------- */
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      readTokens();   // picks up a token change from e.g. a theme swap
      measure();
      syncNodeCount();
      if (reduced || !rafId) render();   // repaint immediately if not looping
    }, RESIZE_DEBOUNCE);
  }, { passive: true });

  /* --- Pause control (WCAG 2.2.2) ---------------------------------------
   * Motion that starts on its own and lasts more than five seconds needs an
   * in-page mechanism to stop it; prefers-reduced-motion is an OS preference
   * and does not satisfy the criterion by itself. The choice persists, and the
   * button stays hidden when reduce is set, because there is no motion to stop.
   */
  var STORAGE_KEY = 'tpcb:hero-motion';
  var toggleBtn = document.getElementById('hero-motion-toggle');

  function readStoredPause() {
    try { return window.localStorage.getItem(STORAGE_KEY) === 'paused'; }
    catch (e) { return false; }   // private mode / storage disabled
  }

  function storePause(value) {
    try { window.localStorage.setItem(STORAGE_KEY, value ? 'paused' : 'running'); }
    catch (e) { /* non-fatal */ }
  }

  function syncToggle() {
    if (!toggleBtn) return;
    // Nothing to pause when the OS already suppresses motion.
    toggleBtn.hidden = reduced;
    toggleBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    toggleBtn.textContent = paused
      ? 'Play background animation'
      : 'Pause background animation';
  }

  if (toggleBtn) {
    paused = readStoredPause();
    toggleBtn.addEventListener('click', function () {
      paused = !paused;
      storePause(paused);
      syncToggle();
      if (paused) { stop(); render(); } else { sync(); }
    });
  }

  /* --- Boot ------------------------------------------------------------ */
  measure();
  syncNodeCount();
  render();
  applyMotionPreference();
})();
