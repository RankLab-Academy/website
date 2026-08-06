/* ==========================================================================
   RankLab Academy — accessible mega menu
   --------------------------------------------------------------------------
   DESIGN CONTRACT (why this implementation has no position or hidden-element
   bugs):

   POSITION
   - The panel is a direct child of <header class="site-header">, which is
     position:sticky and therefore a containing block for absolute children.
     The panel is never nested inside a transformed, filtered or
     overflow:hidden ancestor, so it cannot be clipped or offset.
   - No inline top/left values are ever computed in JavaScript. Placement is
     100% CSS (`top:100%; left:0; right:0`), so it stays correct on resize,
     zoom, RTL and scroll without a single reflow listener.
   - Only ONE panel can be open, so panels can never stack or overlap.

   HIDDEN ELEMENTS
   - "Closed" means the `hidden` attribute + `display:none`. It never means
     opacity:0, visibility:hidden, height:0 or off-screen positioning, so a
     closed panel can never intercept clicks, trap keyboard focus, or be
     announced by a screen reader.
   - Focus is moved out of a panel before it is hidden — never leaving focus
     on a display:none element (which would silently blur to <body>).
   - If JavaScript fails, `has-js` is absent and nothing is hidden at all.
   ========================================================================== */
(function () {
  "use strict";

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  var header = document.querySelector(".site-header");
  var nav = document.getElementById("main-nav");
  if (!header || !nav) return;

  var triggers = $$(".mega-btn", nav);
  if (!triggers.length) return;

  var openTrigger = null;
  var isMobile = function () { return window.matchMedia("(max-width: 940px)").matches; };

  /* ---------- pair each trigger with its panel ---------- */
  var pairs = triggers.map(function (btn) {
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    return panel ? { btn: btn, panel: panel } : null;
  }).filter(Boolean);

  /* ---------- open / close ---------- */
  function closePanel(pair, opts) {
    if (!pair) return;
    var returnFocus = opts && opts.returnFocus;

    // Move focus OUT before hiding, so focus is never on a display:none node.
    if (pair.panel.contains(document.activeElement)) {
      pair.btn.focus();
    } else if (returnFocus) {
      pair.btn.focus();
    }

    pair.panel.hidden = true;              // authoritative closed state
    pair.panel.classList.remove("is-open");
    pair.btn.setAttribute("aria-expanded", "false");
    if (openTrigger === pair.btn) openTrigger = null;
  }

  function closeAll(opts) {
    pairs.forEach(function (p) {
      if (p.btn.getAttribute("aria-expanded") === "true") closePanel(p, opts);
    });
  }

  function openPanel(pair) {
    closeAll();                            // only one panel open, ever
    pair.panel.hidden = false;
    pair.panel.classList.add("is-open");
    pair.btn.setAttribute("aria-expanded", "true");
    openTrigger = pair.btn;
  }

  function togglePanel(pair) {
    if (pair.btn.getAttribute("aria-expanded") === "true") {
      closePanel(pair, { returnFocus: true });
    } else {
      openPanel(pair);
    }
  }

  /* ---------- initial state ---------- */
  pairs.forEach(function (pair) {
    pair.panel.hidden = true;
    pair.panel.classList.remove("is-open");
    pair.btn.setAttribute("aria-expanded", "false");

    pair.btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      togglePanel(pair);
    });

    // Desktop: Escape from anywhere inside the panel closes and restores focus.
    pair.panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") {
        e.stopPropagation();
        closePanel(pair, { returnFocus: true });
      }
    });

    // Closing after a link is followed prevents a stale open panel when the
    // browser restores the page from the back/forward cache.
    $$("a", pair.panel).forEach(function (a) {
      a.addEventListener("click", function () { closePanel(pair); });
    });
  });

  /* ---------- hover intent (desktop only, pointer devices only) ----------
     Hover is a convenience layer on top of click. Click always works, so
     touch and keyboard users are never dependent on hover. */
  var hoverTimer = null;
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    pairs.forEach(function (pair) {
      function enter() {
        if (isMobile()) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { openPanel(pair); }, 90);
      }
      function leave() {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () {
          if (isMobile()) return;
          // Do not close while the pointer or focus is still inside.
          if (pair.panel.matches(":hover") || pair.btn.matches(":hover")) return;
          if (pair.panel.contains(document.activeElement)) return;
          closePanel(pair);
        }, 220);
      }
      pair.btn.addEventListener("mouseenter", enter);
      pair.btn.addEventListener("mouseleave", leave);
      pair.panel.addEventListener("mouseenter", function () { clearTimeout(hoverTimer); });
      pair.panel.addEventListener("mouseleave", leave);
    });
  }

  /* ---------- outside click ---------- */
  document.addEventListener("click", function (e) {
    if (!openTrigger) return;
    if (header.contains(e.target)) return;
    closeAll();
  });

  /* ---------- global Escape ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    if (openTrigger) closeAll({ returnFocus: true });
  });

  /* ---------- focus leaves the header entirely (Tab out) ---------- */
  document.addEventListener("focusin", function (e) {
    if (!openTrigger) return;
    if (!header.contains(e.target)) closeAll();
  });

  /* ---------- breakpoint change: reset to a known-good closed state -------
     Prevents a desktop-positioned panel from surviving into mobile layout. */
  var mq = window.matchMedia("(max-width: 940px)");
  var onChange = function () { closeAll(); };
  if (mq.addEventListener) mq.addEventListener("change", onChange);
  else if (mq.addListener) mq.addListener(onChange);

  /* ---------- back/forward cache restore ---------- */
  window.addEventListener("pageshow", function (e) { if (e.persisted) closeAll(); });

  /* ---------- mark the active section ---------- */
  var here = location.pathname.replace(/index\.html$/, "");
  pairs.forEach(function (pair) {
    var match = $$("a", pair.panel).some(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#") return false;
      return new URL(a.href, location.href).pathname.replace(/index\.html$/, "") === here;
    });
    if (match) pair.btn.setAttribute("data-section-active", "true");
  });
})();
