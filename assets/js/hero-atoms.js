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
  var AREA_PER_NODE = 24000;   // CSS px^2 of hero per atom — keeps it sparse
  var MIN_NODES = 12;
  var MAX_NODES = 54;          // ceiling regardless of how wide the viewport is
  var BOND_DIST = 130;         // CSS px; also the spatial grid cell size
  var SPEED_MIN = 3;           // px per second
  var SPEED_MAX = 9;
  var RADIUS_MIN = 1.0;
  var RADIUS_MAX = 2.3;
  var MAX_FRAME_DT = 0.05;     // clamp dt so a backgrounded tab can't jump
  var RESIZE_DEBOUNCE = 150;

  /* --- Colour tokens --------------------------------------------------- */
  var nodeColor = '';
  var bondColor = '';

  function readTokens() {
    var cs = getComputedStyle(document.documentElement);
    nodeColor = cs.getPropertyValue('--hero-node').trim();
    bondColor = cs.getPropertyValue('--hero-bond').trim();
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

  var motionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
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
    return changed;
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
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      // Reflect off the edges; no wrapping, so atoms never pop in or out.
      if (n.x < 0) { n.x = 0; n.vx = -n.vx; }
      else if (n.x > w) { n.x = w; n.vx = -n.vx; }
      if (n.y < 0) { n.y = 0; n.vy = -n.vy; }
      else if (n.y > h) { n.y = h; n.vy = -n.vy; }
    }
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
          // Fade with distance. globalAlpha only ever attenuates the token's
          // own alpha, so the contrast budget in tpcb.css still holds.
          ctx.globalAlpha = 1 - Math.sqrt(d2) / BOND_DIST;
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
    drawBonds();
    drawNodes();
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
    return !reduced && visible && focused;
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
      render();   // single static frame
    } else {
      sync();
    }
  }

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

  /* --- Boot ------------------------------------------------------------ */
  measure();
  syncNodeCount();
  render();
  applyMotionPreference();
})();
