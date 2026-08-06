/* ==========================================================================
   RankLab Academy — course access tiers (demonstration)
   --------------------------------------------------------------------------
   PRICE LADDER
     Course 0  Free        Course 5  $49        Course 9   $99
     Course 1  Free        Course 6  $59        Course 10  $119
     Course 2  $19         Course 7  $69        Course 11  $149
     Course 3  $29         Course 8  $79        Course 12  $199
     Course 4  $39
   Each course costs more than the one before it: later courses govern larger
   irreversible decisions (legal exposure, monetisation, portfolio capital).

   IMPORTANT — THIS IS NOT SECURITY
   This is a static site with no backend, so entitlements live in IndexedDB in
   the visitor's own browser. Anyone can read the lesson text in the page
   source. A production build MUST put a payment provider and server-side
   entitlement checks in front of paid content. The banner rendered by this
   script says so explicitly rather than pretending otherwise.

   HOW LOCKING WORKS (and why it has no hidden-element bugs)
   - Locked lessons are NOT display:none and are NOT removed. They are marked
     `inert`-like: wrapped in a preview state that fades the tail of the text
     with a CSS mask and appends a visible unlock panel.
   - Interactive controls inside a locked lesson are disabled with the real
     `disabled` attribute, so they cannot be focused or clicked. Nothing is
     invisible-but-clickable, and nothing focusable is ever inside a
     display:none subtree.
   - With JS disabled nothing is locked at all, so no content is ever
     unreachable and crawlers always see the full page.
   ========================================================================== */
(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var body = document.body;
  var courseId = body.getAttribute("data-course");
  var tier = body.getAttribute("data-tier");          // "free" | "paid"
  var price = body.getAttribute("data-price") || "";
  if (!courseId || tier !== "paid") return;           // free courses: never locked

  var STORE = "settings";
  var KEY = "entitlements";
  var hasDB = window.RLDB && RLDB.supported();

  /* How much of a paid course is readable before the paywall. */
  var FREE_LESSONS = 1;

  function getEntitlements() {
    if (!hasDB) return Promise.resolve({});
    return RLDB.setting(KEY).then(function (v) { return v || {}; });
  }

  function setEntitlement(id) {
    if (!hasDB) return Promise.resolve();
    return getEntitlements().then(function (map) {
      map[id] = { unlocked: true, at: Date.now(), price: price };
      return RLDB.setting(KEY, map);
    });
  }

  function clearEntitlement(id) {
    if (!hasDB) return Promise.resolve();
    return getEntitlements().then(function (map) {
      delete map[id];
      return RLDB.setting(KEY, map);
    });
  }

  /* ---------- lock / unlock rendering ---------- */
  function lock(lessons) {
    lessons.forEach(function (sec, i) {
      if (i < FREE_LESSONS) return;
      if (sec.classList.contains("is-locked")) return;
      sec.classList.add("is-locked");

      // Disable every control so nothing focusable hides behind the veil.
      $$("input, textarea, button, select", sec).forEach(function (el) {
        if (el.hasAttribute("disabled")) { el.setAttribute("data-was-disabled", "1"); return; }
        el.disabled = true;
      });

      // Move the lesson body into a single clipped wrapper. Clipping the
      // WRAPPER (rather than each child individually) is what truncates the
      // preview; the gate is appended outside it so it is never cut off.
      var heading = sec.querySelector("h2");
      var wrap = document.createElement("div");
      wrap.className = "lesson-preview";
      var kids = Array.prototype.slice.call(sec.childNodes);
      kids.forEach(function (node) {
        if (node === heading) return;          // heading stays visible
        wrap.appendChild(node);
      });
      sec.appendChild(wrap);

      var gate = document.createElement("div");
      gate.className = "lesson-gate";
      gate.innerHTML =
        '<p class="gate-title">Lesson locked</p>' +
        '<p class="gate-copy">This lesson is part of <strong>' + esc(document.title.split("|")[0].trim()) +
        '</strong>. Unlock the course for <strong>' + esc(price) + '</strong> to read it, run the lab and save the artifact.</p>' +
        '<p class="btn-row"><button class="btn" type="button" data-unlock>Unlock this course — ' + esc(price) + '</button>' +
        '<a class="btn btn-outline" href="' + rel("pricing.html") + '">See all prices</a></p>';
      sec.appendChild(gate);
    });
    wireUnlock();
  }

  function unlock(lessons) {
    lessons.forEach(function (sec) {
      sec.classList.remove("is-locked");
      $$("input, textarea, button, select", sec).forEach(function (el) {
        if (el.getAttribute("data-was-disabled") === "1") return;
        el.disabled = false;
      });
      var gate = $(".lesson-gate", sec);
      if (gate) gate.parentNode.removeChild(gate);
      // Unwrap the preview container, restoring the original DOM order.
      var wrap = $(".lesson-preview", sec);
      if (wrap) {
        while (wrap.firstChild) sec.appendChild(wrap.firstChild);
        wrap.parentNode.removeChild(wrap);
      }
    });
  }

  function wireUnlock() {
    $$("[data-unlock]").forEach(function (btn) {
      if (btn.getAttribute("data-wired")) return;
      btn.setAttribute("data-wired", "1");
      btn.addEventListener("click", function () {
        if (!hasDB) { window.rlToast && rlToast("Local storage unavailable — cannot record access."); return; }
        setEntitlement(courseId).then(function () {
          render(true);
          window.rlToast && rlToast("Course unlocked in this browser");
        });
      });
    });
  }

  /* ---------- header banner ---------- */
  function banner(unlocked) {
    var host = $("[data-access-banner]");
    if (!host) return;
    host.innerHTML = unlocked
      ? '<div class="callout callout-tip mb-0"><strong class="callout-title">Unlocked in this browser</strong>' +
        '<p class="mb-0 text-sm">You have full access to this course on this device. ' +
        '<button class="btn btn-sm btn-outline" type="button" data-relock>Reset access</button></p></div>'
      : '<div class="callout callout-warn mb-0"><strong class="callout-title">Paid course — ' + esc(price) + '</strong>' +
        '<p class="mb-0 text-sm">Lesson ' + FREE_LESSONS + ' is a free preview. Unlocking is simulated locally for this demo; ' +
        'no payment is taken and no data leaves your browser. ' +
        '<a href="' + rel("pricing.html") + '">See the full price ladder</a>.</p></div>';

    var rl = $("[data-relock]");
    if (rl) rl.addEventListener("click", function () {
      clearEntitlement(courseId).then(function () { render(false); window.rlToast && rlToast("Access reset"); });
    });
    wireUnlock();
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  // Course pages live in /courses/, everything else at the root.
  function rel(path) {
    return (location.pathname.indexOf("/courses/") > -1 ? "../" : "") + path;
  }

  function render(unlocked) {
    var lessons = $$(".lesson[id]").filter(function (s) { return /^lesson-/.test(s.id); });
    if (unlocked) unlock(lessons); else lock(lessons);
    banner(unlocked);
  }

  getEntitlements().then(function (map) {
    render(!!(map && map[courseId] && map[courseId].unlocked));
  });
})();
