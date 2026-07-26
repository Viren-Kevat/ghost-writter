(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= THEME ================= */
  (function theme() {
    var root = document.documentElement;
    var toggle = document.getElementById("themeToggle");
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var current = stored || (prefersDark ? "dark" : "light");
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

  /* ================= SERVICE ROWS (click toggles on touch/click devices too) ================= */
  (function serviceRows() {
    var rows = document.querySelectorAll(".service-row");
    rows.forEach(function (row) {
      row.addEventListener("click", function () {
        var wasOpen = row.classList.contains("is-open");
        rows.forEach(function (r) { r.classList.remove("is-open"); });
        if (!wasOpen) row.classList.add("is-open");
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          row.click();
        }
      });
    });
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
