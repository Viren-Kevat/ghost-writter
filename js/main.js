(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= THEME ================= */
  (function theme() {
    var root = document.documentElement;
    var toggle = document.getElementById("themeToggle");
    var stored = localStorage.getItem("theme");
    var current = stored === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", current);
    toggle.setAttribute("aria-pressed", String(current === "dark"));

    toggle.addEventListener("click", function () {
      current = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", current);
      localStorage.setItem("theme", current);
      toggle.setAttribute("aria-pressed", String(current === "dark"));
    });
  })();

  /* ================= SCROLL PROGRESS + RAIL ================= */
  (function scrollProgress() {
    var bar = document.getElementById("progressTop");
    var railFill = document.getElementById("railFill");
    var railNum = document.getElementById("railNum");
    var railLabel = document.getElementById("railLabel");

    function update() {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var height = doc.scrollHeight - doc.clientHeight;
      var pct = height > 0 ? (scrollTop / height) * 100 : 0;
      bar.style.width = pct + "%";
      if (railFill) railFill.style.height = pct + "%";
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    var chapters = Array.prototype.slice.call(document.querySelectorAll("[data-chapter]"));
    if ("IntersectionObserver" in window && chapters.length) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              railNum.textContent = entry.target.getAttribute("data-chapter");
              railLabel.textContent = entry.target.getAttribute("data-label");
            }
          });
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      chapters.forEach(function (ch) { io.observe(ch); });
    }
  })();

  /* ================= REVEAL ON SCROLL ================= */
  (function reveals() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add("in-view"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ================= HERO: strike + cycling byline ================= */
  (function hero() {
    var heroEl = document.querySelector(".hero");
    if (heroEl) {
      requestAnimationFrame(function () {
        setTimeout(function () { heroEl.classList.add("is-loaded"); }, 250);
      });
    }

    var names = [
      "Hindustani Modi, CEO",
      "KiviCare",
      "Streamit",
      "Frezka",
      "Handyman",
      "Iqonic Agency",
      "Goldenmace IT Solutions"
    ];
    var el = document.getElementById("cycleName");
    if (!el) return;

    if (reduceMotion) {
      var i = 0;
      setInterval(function () {
        i = (i + 1) % names.length;
        el.textContent = names[i];
      }, 2400);
      return;
    }

    var idx = 0;
    var typeSpeed = 55;
    var deleteSpeed = 32;
    var holdTime = 1400;

    function type(word, cb) {
      var pos = 0;
      (function step() {
        el.textContent = word.slice(0, pos);
        pos++;
        if (pos <= word.length) {
          setTimeout(step, typeSpeed);
        } else {
          setTimeout(cb, holdTime);
        }
      })();
    }
    function erase(word, cb) {
      var pos = word.length;
      (function step() {
        el.textContent = word.slice(0, pos);
        pos--;
        if (pos >= 0) {
          setTimeout(step, deleteSpeed);
        } else {
          cb();
        }
      })();
    }
    function loop() {
      type(names[idx], function () {
        erase(names[idx], function () {
          idx = (idx + 1) % names.length;
          loop();
        });
      });
    }
    loop();
  })();

  /* ================= BANYAN SERVICES TREE ================= */
  (function banyan() {
    var stage = document.getElementById("treeStage");
    var canvas = document.getElementById("treeCanvas");
    if (!stage || !canvas) return;

    var leaves = Array.prototype.slice.call(stage.querySelectorAll(".tree-leaf"));
    var caption = document.getElementById("treeCaption");
    var ctx = canvas.getContext("2d");

    /* logical coordinate space the whole tree is generated in — label
       percentages are derived straight from this, so layout stays correct
       at any rendered size */
    var W = 1000, H = 800;
    var GROUND_Y = 540;

    function idFor(i) { return (i + 1) < 10 ? "0" + (i + 1) : String(i + 1); }
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    /* seeded PRNG (mulberry32) — the tree is identical on every load, so the
       8 service nodes always land in the same, art-directed spots */
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /* recursive branch/root builder — fully organic: branch count (1-3),
       spread and length all carry independent randomness per child, so
       lineages fork unevenly and drift asymmetrically rather than
       mirroring left/right. A per-branch "bend bias" is held constant
       across its own segments so it arcs smoothly instead of zigzagging. */
    function grow(x, y, angle, len, width, depth, rng, opts) {
      var segCount = 4;
      var curAngle = angle, curX = x, curY = y;
      var segLen = len / segCount;
      var bendBias = (rng() - 0.5) * 0.22;
      var pts = [[curX, curY]];
      for (var s = 0; s < segCount; s++) {
        curAngle += bendBias + (rng() - 0.5) * 0.1;
        var nx = curX + Math.cos(curAngle) * segLen;
        var ny = curY + Math.sin(curAngle) * segLen;
        if (opts.yMin !== undefined) ny = Math.max(ny, opts.yMin);
        if (opts.yMax !== undefined) ny = Math.min(ny, opts.yMax);
        pts.push([nx, ny]);
        curX = nx; curY = ny;
      }
      /* one continuous path per branch call, not one stroke per
         sub-segment — stroking each sub-segment separately double-glows
         every internal joint (both segments' round caps land on the same
         point), which is what was reading as a string of beads instead
         of a smooth glowing limb */
      opts.segs.push({ pts: pts, width: width, depth: depth });

      if (depth >= opts.maxDepth || len < 10) {
        opts.tips.push([curX, curY, depth]);
        return;
      }

      /* first 3 levels are the thick primary limbs (slow taper); beyond
         that, twigs shrink fast — keeps the recursion inside its vertical
         budget regardless of how vertical a lineage happens to drift */
      var roll = rng();
      var n = depth < 1 ? (rng() < 0.45 ? 3 : 2) : (roll < 0.22 ? 3 : roll < 0.9 ? 2 : 1);
      var coneWidth = depth < 1 ? 1.15 + rng() * 0.5 : 0.55 + rng() * 0.6;
      var lenMult = depth < 3 ? (0.66 + rng() * 0.14) : (0.46 + rng() * 0.16);
      var awayBias = opts.trunkX !== undefined ? (curX < opts.trunkX ? -1 : 1) * 0.04 : 0;
      for (var b = 0; b < n; b++) {
        var base = n === 1 ? 0 : (b / (n - 1) - 0.5) * coneWidth;
        var off = base + awayBias + (rng() - 0.5) * coneWidth * 0.3;
        var childLen = len * lenMult * (0.88 + rng() * 0.24);
        grow(curX, curY, curAngle + off, childLen, width * (0.6 + rng() * 0.16), depth + 1, rng, opts);
      }
    }

    /* farthest-point sampling: greedily pick the candidate that is most
       distant from everything already chosen, so the 8 service anchors
       stay well spread across whatever shape this seed's canopy grew
       into — independent of the (now asymmetric) branch structure. */
    function pickSpread(points, count) {
      if (points.length <= count) return points.slice();
      var minX = Infinity, startIdx = 0;
      points.forEach(function (p, idx) { if (p[0] < minX) { minX = p[0]; startIdx = idx; } });
      var chosen = [points[startIdx]];
      var remaining = points.filter(function (_, idx) { return idx !== startIdx; });
      while (chosen.length < count && remaining.length) {
        var bestIdx = -1, bestDist = -1;
        remaining.forEach(function (p, idx) {
          var minD = Infinity;
          chosen.forEach(function (c) { minD = Math.min(minD, Math.hypot(c[0] - p[0], c[1] - p[1])); });
          if (minD > bestDist) { bestDist = minD; bestIdx = idx; }
        });
        chosen.push(remaining[bestIdx]);
        remaining.splice(bestIdx, 1);
      }
      return chosen;
    }

    function buildTree(seed) {
      var rng = mulberry32(seed);
      var trunkX = W / 2 + (rng() - 0.5) * 30;

      var canopy = { segs: [], tips: [], maxDepth: 7, yMin: 16, trunkX: trunkX };
      grow(trunkX, GROUND_Y, -Math.PI / 2 + (rng() - 0.5) * 0.1, 160 + rng() * 30, 24, 0, rng, canopy);

      var roots = { segs: [], tips: [], maxDepth: 4, yMax: H - 12, trunkX: trunkX };
      var rootCount = 5 + Math.floor(rng() * 3);
      for (var i = 0; i < rootCount; i++) {
        var t = -1.15 + (i / (rootCount - 1)) * 2.3 + (rng() - 0.5) * 0.25;
        grow(trunkX, GROUND_Y, Math.PI / 2 + t, 55 + rng() * 35, 10 + rng() * 3, 0, rng, roots);
      }

      /* 8 service nodes: spread across the deeper tips (depth 2+, so they
         never sit right at the trunk fork), sorted left-to-right so they
         read in the same order as the legend list beneath them */
      var candidates = canopy.tips.filter(function (tp) { return tp[2] >= 4; });
      if (candidates.length < 8) candidates = canopy.tips.filter(function (tp) { return tp[2] >= 2; });
      if (candidates.length < 8) candidates = canopy.tips;
      var nodes = pickSpread(candidates, 8).sort(function (p, q) { return p[0] - q[0]; });

      /* canopy foliage mass: one big soft halo sized to the whole crown,
         plus dense overlapping blobs anchored on every deep branch
         segment (not just the sparse final tips) — additively blended so
         it reads as leafy volume instead of bare branch lines */
      var foliage = [];
      var cxSum = 0, cySum = 0;
      canopy.tips.forEach(function (tp) { cxSum += tp[0]; cySum += tp[1]; });
      var centerX = cxSum / canopy.tips.length, centerY = cySum / canopy.tips.length;
      var maxR = 0;
      canopy.tips.forEach(function (tp) { maxR = Math.max(maxR, Math.hypot(tp[0] - centerX, tp[1] - centerY)); });
      foliage.push({ x: centerX, y: centerY, r: maxR * 1.3, a: 0.045 });
      foliage.push({ x: centerX, y: centerY, r: maxR * 0.7, a: 0.03 });

      var anchors = [];
      canopy.segs.forEach(function (s) { if (s.depth >= 2) anchors.push(s.pts[s.pts.length - 1]); });
      if (anchors.length < 20) anchors = canopy.tips.map(function (tp) { return [tp[0], tp[1]]; });

      /* thinned hard so dense twig clusters (many nearby anchors) don't
         stack enough overlapping additive blobs to saturate to white */
      anchors.forEach(function (a, idx) {
        if (rng() < 0.7) return;
        foliage.push({
          x: a[0] + (rng() - 0.5) * 18,
          y: a[1] + (rng() - 0.5) * 18,
          r: 10 + rng() * 16,
          a: 0.012 + rng() * 0.016
        });
      });

      /* actual leaf marks (small rotated almond shapes, not round blobs) —
         this is what makes the canopy read as foliage rather than bare
         glowing lines; roots get none of these, which is the other half
         of telling the two apart at a glance */
      var LEAF_COLORS = ["#9C7C42", "#C9963F", "#DCB662", "#E3C070"];
      var leafMarks = [];
      canopy.tips.forEach(function (tip) {
        var count = 4 + Math.floor(rng() * 5);
        for (var k = 0; k < count; k++) {
          leafMarks.push({
            x: tip[0] + (rng() - 0.5) * 36,
            y: tip[1] + (rng() - 0.5) * 36,
            len: 8 + rng() * 9,
            wid: 3.5 + rng() * 3.5,
            rot: rng() * Math.PI * 2,
            a: 0.55 + rng() * 0.3,
            color: LEAF_COLORS[Math.floor(rng() * LEAF_COLORS.length)]
          });
        }
      });
      canopy.segs.forEach(function (s) {
        if (s.depth >= 3 && rng() < 0.55) {
          var p = s.pts[s.pts.length - 1];
          leafMarks.push({
            x: p[0], y: p[1],
            len: 7 + rng() * 7, wid: 3 + rng() * 3,
            rot: rng() * Math.PI * 2, a: 0.42 + rng() * 0.3,
            color: LEAF_COLORS[Math.floor(rng() * LEAF_COLORS.length)]
          });
        }
      });

      /* canopy sparkle field: a scatter of small points around every tip,
         sorted top-first so the reveal can light them in a natural order */
      var sparks = [];
      canopy.tips.forEach(function (tip) {
        var count = 2 + Math.floor(rng() * 3);
        for (var k = 0; k < count; k++) {
          sparks.push({
            x: tip[0] + (rng() - 0.5) * 26,
            y: tip[1] + (rng() - 0.5) * 26,
            r: 0.6 + rng() * 1.6,
            a: 0.35 + rng() * 0.55,
            phase: rng() * Math.PI * 2,
            speed: 0.6 + rng() * 0.5
          });
        }
      });
      sparks.sort(function (p, q) { return p.y - q.y; });

      return { branchSegs: canopy.segs, rootSegs: roots.segs, nodes: nodes, sparks: sparks, foliage: foliage, leafMarks: leafMarks, trunkX: trunkX };
    }

    var tree = buildTree(20260805);

    var DEPTH_GOLD = ["#C9963F", "#C9963F", "#D3A653", "#DCB662", "#E3C070", "#E8C87A", "#F0D68F"];
    var ROOT_GOLD = ["#8A6B35", "#8A6B35", "#9C7C42", "#AE8D50", "#C09E5E"];

    /* stroke a whole branch path 3x (bloom / body / core) with additive
       blending — one continuous path per branch (not one stroke per
       sub-segment) so internal joints don't double-glow into beads */
    function glowPath(c, pts, width, color) {
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = color;
      function strokeAt(w, alpha) {
        c.globalAlpha = alpha;
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
        c.stroke();
      }
      strokeAt(width * 6, 0.07);
      strokeAt(width * 2.1, 0.28);
      strokeAt(Math.max(width, 0.6), 0.95);
    }

    /* soft radial blob — used for the foliage mass, additive blended so
       overlapping clusters build up into a rounded, glowing crown */
    function glowBlob(c, x, y, r, alpha, color) {
      var g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalAlpha = alpha;
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }

    /* small rotated leaf silhouette — opaque enough to read as a leaf
       shape rather than blend into the soft foliage haze */
    function drawLeaf(c, x, y, len, wid, rot, alpha, color) {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.beginPath();
      c.ellipse(0, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    /* static layer: foliage mass + branches + roots drawn once to an
       offscreen canvas, then just blitted every frame — redrawing all of
       this at 30fps would be wasted work when only sparkles actually move */
    var staticLayer = document.createElement("canvas");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function renderStaticLayer() {
      staticLayer.width = W * dpr;
      staticLayer.height = H * dpr;
      var c = staticLayer.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.globalCompositeOperation = "lighter";
      tree.foliage.forEach(function (f) {
        glowBlob(c, f.x, f.y, f.r, f.a, "#F0D68F");
      });
      tree.rootSegs.forEach(function (s) {
        glowPath(c, s.pts, s.width, ROOT_GOLD[Math.min(s.depth, ROOT_GOLD.length - 1)]);
      });
      tree.branchSegs.forEach(function (s) {
        glowPath(c, s.pts, s.width, DEPTH_GOLD[Math.min(s.depth, DEPTH_GOLD.length - 1)]);
      });
      /* normal (not additive) blending for leaves — with 'lighter' a dense
         cluster of overlapping leaves saturates straight to blown-out
         white; normal alpha compositing caps at the leaf color itself
         however many pile up, which is what actually reads as foliage */
      c.globalCompositeOperation = "source-over";
      tree.leafMarks.forEach(function (lm) {
        drawLeaf(c, lm.x, lm.y, lm.len, lm.wid, lm.rot, lm.a, lm.color);
      });
      c.globalCompositeOperation = "lighter";
    }
    renderStaticLayer();

    function resize() {
      var rect = stage.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      if (reduceMotion) draw(0);
    }

    /* reveal progress: 0 -> 1 drives roots/trunk/canopy/nodes staging.
       Fixed at 1 for reduced motion so every stage below renders instantly
       and stays static (draw() is only ever called once in that case). */
    var reveal = reduceMotion ? 1 : 0;
    var revealStart = null;
    var REVEAL_MS = 2200;

    /* active service (hover/focus/pin), shared by legend + canvas hit-testing */
    var activeId = null;

    function setActive(id) {
      activeId = id;
      if (id) stage.setAttribute("data-active", id); else stage.removeAttribute("data-active");
      leaves.forEach(function (leaf) {
        leaf.classList.toggle("is-active", leaf.getAttribute("data-service") === id);
      });
      if (id) {
        var leaf = leaves.filter(function (l) { return l.getAttribute("data-service") === id; })[0];
        if (leaf && caption) {
          caption.querySelector(".tree-caption__num").textContent = leaf.querySelector(".tree-leaf__num").textContent;
          caption.querySelector(".tree-caption__name").textContent = leaf.querySelector(".tree-leaf__name").textContent;
          caption.querySelector(".tree-caption__desc").textContent = leaf.querySelector(".leaf-card p").textContent;
        }
      }
    }
    function clearActive() {
      if (stage.querySelector(".tree-leaf.is-pinned")) return;
      setActive(null);
    }

    /* position the legend from the tree's own generated node coordinates —
       left/top mark the TRUE spot (glow dot lines up with this). Whether
       two labels actually collide depends on the pill's real rendered
       size versus the tree column's real rendered width, neither of which
       is known at % math time (the column is a flexible grid track, not a
       fixed size) — so that part is resolved separately below, by
       measuring actual boxes once they exist in the DOM. */
    leaves.forEach(function (leaf, i) {
      var node = tree.nodes[i];
      if (!node) return;
      var leftPct = (node[0] / W) * 100;
      var topPct = Math.max(6, Math.min(70, (node[1] / H) * 100));
      leaf.style.left = leftPct + "%";
      leaf.style.top = topPct + "%";
      leaf.setAttribute("data-side", leftPct < 50 ? "left" : "right");
      leaf.style.setProperty("--i", i);
    });

    /* real collision pass: measure actual rendered pill boxes and nudge
       (via --yshift, which both the pill and its leaf-card read) any pill
       that overlaps one already placed further down until clear. Runs
       once layout has settled and again on resize, since the tree column
       is a flexible grid track — how cramped the pills are depends on the
       viewport, not just the seed. */
    function resolveLabelOverlap() {
      var items = leaves.map(function (leaf) {
        return { leaf: leaf, btn: leaf.querySelector(".tree-leaf__btn") };
      }).filter(function (it) { return it.btn; });
      items.forEach(function (it) { it.leaf.style.setProperty("--yshift", "0px"); });
      items.sort(function (a, b) { return a.btn.getBoundingClientRect().left - b.btn.getBoundingClientRect().left; });

      var placed = [];
      items.forEach(function (it) {
        var shift = 0, tries = 0;
        while (tries < 10) {
          var r = it.btn.getBoundingClientRect();
          var hit = placed.some(function (p) {
            return r.left < p.right + 10 && r.right > p.left - 10 && r.top < p.bottom + 8 && r.bottom > p.top - 8;
          });
          if (!hit) break;
          shift += 34;
          it.leaf.style.setProperty("--yshift", shift + "px");
          tries++;
        }
        var final = it.btn.getBoundingClientRect();
        placed.push({ left: final.left, right: final.right, top: final.top, bottom: final.bottom });
      });
    }

    requestAnimationFrame(function () { requestAnimationFrame(resolveLabelOverlap); });
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resolveLabelOverlap, 150);
    });

    function draw(now) {
      if (revealStart === null) revealStart = now;
      if (!reduceMotion) reveal = Math.min(1, (now - revealStart) / REVEAL_MS);

      var w = canvas.width, h = canvas.height;
      if (!w || !h) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(w / W, 0, 0, h / H, 0, 0);

      /* night vignette */
      var g = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.1, W / 2, H * 0.42, H * 0.75);
      g.addColorStop(0, "#171209");
      g.addColorStop(1, "#0D0B08");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      /* horizon glow at the roots/trunk seam */
      var hg = ctx.createRadialGradient(tree.trunkX, GROUND_Y, 0, tree.trunkX, GROUND_Y, 260);
      hg.addColorStop(0, "rgba(201,150,63,0.22)");
      hg.addColorStop(1, "rgba(201,150,63,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, W, H);

      /* roots reveal first, then trunk/branches rise from the ground —
         both are a clip over the pre-rendered static layer so it never
         needs re-stroking mid-grow */
      var rootP = clamp01(reveal / 0.3);
      if (rootP > 0) {
        ctx.save();
        ctx.beginPath();
        var rw = (W * 0.55) * rootP;
        ctx.rect(tree.trunkX - rw, GROUND_Y, rw * 2, H - GROUND_Y);
        ctx.clip();
        ctx.globalAlpha = Math.min(1, rootP * 1.6);
        ctx.drawImage(staticLayer, 0, 0, W, H);
        ctx.restore();
      }
      var boughP = clamp01((reveal - 0.15) / 0.6);
      if (boughP > 0) {
        ctx.save();
        var riseY = GROUND_Y - (GROUND_Y - 20) * boughP;
        ctx.beginPath();
        ctx.rect(0, riseY, W, GROUND_Y - riseY + 4);
        ctx.clip();
        ctx.globalAlpha = Math.min(1, boughP * 1.6);
        ctx.drawImage(staticLayer, 0, 0, W, H);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      /* canopy sparkle field, staggered by the same reveal progress */
      var sparkP = clamp01((reveal - 0.45) / 0.4);
      var visibleCount = Math.round(tree.sparks.length * sparkP);
      var t = now / 1000;
      for (var i = 0; i < visibleCount; i++) {
        var sp = tree.sparks[i];
        var twinkle = reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(t * sp.speed + sp.phase);
        ctx.globalAlpha = sp.a * twinkle;
        ctx.fillStyle = "#FFF2CE";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* the 8 service lights */
      var nodeP = clamp01((reveal - 0.6) / 0.35);
      tree.nodes.forEach(function (node, i) {
        if (i / tree.nodes.length >= nodeP) return;
        var isActive = activeId === idFor(i);
        var dim = activeId && !isActive ? 0.4 : 1;
        var pulse = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 1.4 + i);
        var r = (isActive ? 6.5 : 4.2) * pulse;
        var glowR = isActive ? 26 : 16;
        var color = isActive ? "#E15B4C" : "#FFF2CE";

        var ng = ctx.createRadialGradient(node[0], node[1], 0, node[0], node[1], glowR);
        ng.addColorStop(0, color);
        ng.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = dim;
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(node[0], node[1], glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node[0], node[1], r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    /* idle loop, throttled to ~30fps, gated by section visibility */
    var rafId = null;
    var running = false;
    var lastDraw = 0;

    function loop(now) {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (now - lastDraw < 33) return;
      lastDraw = now;
      draw(now);
    }
    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    var grown = false;
    function revealLeaves() {
      leaves.forEach(function (leaf) { leaf.classList.add("is-visible"); });
    }

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      draw(0);
      revealLeaves();
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            start();
            if (!grown) { grown = true; revealLeaves(); }
          } else {
            stop();
          }
        });
      }, { threshold: 0.12 });
      io.observe(stage);
    } else {
      start();
      revealLeaves();
    }

    /* legend interaction: hover/focus/click/keys — same contract as before */
    leaves.forEach(function (leaf, i) {
      var id = leaf.getAttribute("data-service");
      var btn = leaf.querySelector(".tree-leaf__btn");

      leaf.addEventListener("mouseenter", function () { setActive(id); });
      leaf.addEventListener("mouseleave", function () {
        if (!leaf.classList.contains("is-pinned")) clearActive();
      });
      btn.addEventListener("focus", function () { setActive(id); });
      btn.addEventListener("blur", function () {
        if (!leaf.classList.contains("is-pinned")) clearActive();
      });

      btn.addEventListener("click", function () {
        var wasPinned = leaf.classList.contains("is-pinned");
        leaves.forEach(function (l) {
          l.classList.remove("is-pinned");
          l.querySelector(".tree-leaf__btn").setAttribute("aria-expanded", "false");
        });
        if (!wasPinned) {
          leaf.classList.add("is-pinned");
          btn.setAttribute("aria-expanded", "true");
          setActive(id);
        } else {
          clearActive();
        }
      });

      btn.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          var next = leaves[(i + 1) % leaves.length];
          next.querySelector(".tree-leaf__btn").focus();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          var prev = leaves[(i - 1 + leaves.length) % leaves.length];
          prev.querySelector(".tree-leaf__btn").focus();
        } else if (e.key === "Escape") {
          leaf.classList.remove("is-pinned");
          btn.setAttribute("aria-expanded", "false");
          clearActive();
          btn.blur();
        }
      });
    });

    /* canvas hit-testing: hovering/clicking a node lights up its label */
    function nodeAt(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var px = ((clientX - rect.left) / rect.width) * W;
      var py = ((clientY - rect.top) / rect.height) * H;
      var best = null, bestDist = 26;
      tree.nodes.forEach(function (node, i) {
        var d = Math.hypot(node[0] - px, node[1] - py);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    canvas.addEventListener("mousemove", function (e) {
      var idx = nodeAt(e.clientX, e.clientY);
      canvas.style.cursor = idx === null ? "default" : "pointer";
      if (stage.querySelector(".tree-leaf.is-pinned")) return;
      if (idx === null) { clearActive(); return; }
      setActive(idFor(idx));
    });
    canvas.addEventListener("mouseleave", function () { clearActive(); });
    canvas.addEventListener("click", function (e) {
      var idx = nodeAt(e.clientX, e.clientY);
      if (idx === null) return;
      var leaf = leaves[idx];
      if (leaf) leaf.querySelector(".tree-leaf__btn").click();
    });

    /* default caption content before any interaction (mobile strip) */
    if (caption) {
      caption.querySelector(".tree-caption__num").textContent = "01";
      caption.querySelector(".tree-caption__name").textContent = "LinkedIn Ghostwriting & Strategy";
      caption.querySelector(".tree-caption__desc").textContent =
        "Content built on real strategy- designed to build authority and stay true to your voice.";
    }
  })();

  /* ================= COUNT UP ================= */
  (function countUp() {
    var els = document.querySelectorAll(".countup");
    function animate(el) {
      var target = parseInt(el.getAttribute("data-target"), 10) || 0;
      if (reduceMotion) {
        el.textContent = target.toLocaleString("en-US");
        return;
      }
      var duration = 1300;
      var start = null;
      function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
      function frame(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var value = Math.round(easeOutQuint(progress) * target);
        el.textContent = value.toLocaleString("en-US");
        if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    if (!("IntersectionObserver" in window)) {
      els.forEach(animate);
      return;
    }
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animate(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ================= BEFORE / AFTER COMPARE SLIDER ================= */
  (function compare() {
    var wrap = document.getElementById("compareSlider");
    var after = document.getElementById("compareAfter");
    var handle = document.getElementById("compareHandle");
    if (!wrap || !after || !handle) return;

    function setPct(pct) {
      pct = Math.max(0, Math.min(100, pct));
      after.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
      handle.style.left = pct + "%";
      wrap.setAttribute("aria-valuenow", Math.round(pct));
    }

    function pctFromClientX(clientX) {
      var rect = wrap.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    var dragging = false;

    function onDown(e) {
      dragging = true;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setPct(pctFromClientX(clientX));
    }
    function onMove(e) {
      if (!dragging) return;
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setPct(pctFromClientX(clientX));
    }
    function onUp() { dragging = false; }

    wrap.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    wrap.addEventListener("touchstart", onDown, { passive: true });
    wrap.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    wrap.addEventListener("keydown", function (e) {
      var current = parseFloat(wrap.getAttribute("aria-valuenow")) || 50;
      if (e.key === "ArrowLeft") { setPct(current - 5); e.preventDefault(); }
      if (e.key === "ArrowRight") { setPct(current + 5); e.preventDefault(); }
    });

    setPct(50);
  })();

  /* ================= CASE STUDY DOSSIERS ================= */
  (function dossiers() {
    var items = document.querySelectorAll("[data-dossier]");
    items.forEach(function (item) {
      var btn = item.querySelector(".dossier__head");
      btn.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");
        items.forEach(function (d) {
          d.classList.remove("is-open");
          d.querySelector(".dossier__head").setAttribute("aria-expanded", "false");
        });
        if (!isOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  })();
})();
