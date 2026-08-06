/* ==========================================================================
   RankLab Academy — core UI script
   Handles: nav, theme, ad slot rendering (CLS-safe), copy buttons,
            generic IndexedDB checklists, toasts, visit streak.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- tiny helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg) {
    var el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }
  window.rlToast = toast;

  /* ---------- theme ---------- */
  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem("rl-theme", mode); } catch (e) {}
    var btn = $("#theme-toggle");
    if (btn) {
      btn.textContent = mode === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", mode === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }
  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("rl-theme"); } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  })();

  /* ---------- nav + header ---------- */
  function initNav() {
    var toggle = $("#nav-toggle");
    var nav = $("#main-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    var themeBtn = $("#theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
      });
    }
    // Mark the current page in the nav for users and crawlers.
    var here = location.pathname.replace(/index\.html$/, "");
    $$("#main-nav a").forEach(function (a) {
      var target = a.getAttribute("href");
      if (!target || target.charAt(0) === "#") return;
      var path = new URL(a.href, location.href).pathname.replace(/index\.html$/, "");
      if (path === here) a.setAttribute("aria-current", "page");
    });
  }

  /* ---------- Ad slots -------------------------------------------------
     Every slot reserves its height in CSS before JS runs, so activating a
     real ad network never causes Cumulative Layout Shift.
     To go live: set window.RL_ADS in js/ads-config.js (client + slot ids)
     and load the AdSense loader tag in the page head.
  --------------------------------------------------------------------- */
  function initAds() {
    var cfg = window.RL_ADS || {};
    var live = cfg.enabled === true && typeof cfg.client === "string" && cfg.client.indexOf("ca-pub-") === 0;

    $$(".ad-slot").forEach(function (slot) {
      var name = slot.getAttribute("data-ad") || "inarticle";
      var format = slot.getAttribute("data-ad-format") || "auto";
      if (live && cfg.slots && cfg.slots[name]) {
        var ins = document.createElement("ins");
        ins.className = "adsbygoogle";
        ins.style.display = "block";
        ins.setAttribute("data-ad-client", cfg.client);
        ins.setAttribute("data-ad-slot", cfg.slots[name]);
        ins.setAttribute("data-ad-format", format);
        ins.setAttribute("data-full-width-responsive", "true");
        slot.innerHTML = "";
        slot.appendChild(ins);
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      } else {
        var inner = slot.querySelector(".ad-inner");
        if (inner && !inner.textContent.trim()) {
          inner.innerHTML = '<span>Reserved ad unit &mdash; <code>' + name + '</code><br>' +
            '<small>Set <code>window.RL_ADS</code> in <code>js/ads-config.js</code> to serve live ads here.</small></span>';
        }
      }
    });
  }

  /* ---------- copy-to-clipboard for prompt blocks ---------- */
  function initCopy() {
    $$("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sel = btn.getAttribute("data-copy");
        var src = sel ? document.querySelector(sel) : btn.closest(".prompt-block").querySelector("pre");
        if (!src) return;
        var text = src.innerText;
        var done = function () { toast("Copied to clipboard"); btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = "Copy"; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
        } else { fallback(text, done); }
      });
    });
    function fallback(text, done) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed — select the text manually"); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- persistent checklists (IndexedDB) ---------- */
  function initChecklists() {
    var lists = $$("[data-checklist]");
    if (!lists.length || !window.RLDB || !RLDB.supported()) return;

    lists.forEach(function (list) {
      var id = list.getAttribute("data-checklist");
      var boxes = $$('input[type="checkbox"]', list);
      RLDB.get("checklists", id).then(function (rec) {
        var items = (rec && rec.items) || {};
        boxes.forEach(function (box) {
          var key = box.getAttribute("data-key") || box.id;
          if (items[key]) { box.checked = true; box.closest("li").classList.add("done"); }
        });
        updateCount(list);
      });
      boxes.forEach(function (box) {
        box.addEventListener("change", function () {
          box.closest("li").classList.toggle("done", box.checked);
          var items = {};
          boxes.forEach(function (b) { items[b.getAttribute("data-key") || b.id] = b.checked; });
          RLDB.put("checklists", { id: id, items: items }).then(function () { updateCount(list); });
        });
      });
      var reset = document.querySelector('[data-checklist-reset="' + id + '"]');
      if (reset) {
        reset.addEventListener("click", function () {
          boxes.forEach(function (b) { b.checked = false; b.closest("li").classList.remove("done"); });
          RLDB.remove("checklists", id).then(function () { updateCount(list); toast("Checklist reset"); });
        });
      }
    });

    function updateCount(list) {
      var id = list.getAttribute("data-checklist");
      var out = document.querySelector('[data-checklist-count="' + id + '"]');
      if (!out) return;
      var boxes = $$('input[type="checkbox"]', list);
      var done = boxes.filter(function (b) { return b.checked; }).length;
      out.textContent = done + " / " + boxes.length + " saved";
      var bar = document.querySelector('[data-checklist-bar="' + id + '"] > i');
      if (bar) bar.style.width = (boxes.length ? Math.round(done / boxes.length * 100) : 0) + "%";
    }
  }

  /* ---------- year + visit streak ---------- */
  function initMisc() {
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    if (window.RLDB && RLDB.supported()) {
      RLDB.trackVisit().then(function (info) {
        $$("[data-streak]").forEach(function (el) { el.textContent = info.streak; });
        $$("[data-days]").forEach(function (el) { el.textContent = info.days; });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav(); initAds(); initCopy(); initChecklists(); initMisc();
  });
})();
