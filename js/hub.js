/* ==========================================================================
   RankLab Academy — hub / homepage personalisation
   Adds saved progress to static course cards and shows a "resume" banner.
   Cards are static HTML (good for crawlers); JS only decorates them.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.RLDB || !RLDB.supported()) return;

  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  document.addEventListener("DOMContentLoaded", function () {
    var cards = $$("[data-course-card]");
    if (cards.length) {
      RLDB.all("progress").then(function (rows) {
        var byCourse = {};
        rows.forEach(function (r) {
          if (!r.done) return;
          byCourse[r.course] = (byCourse[r.course] || 0) + 1;
        });
        var totalDone = 0, totalLessons = 0;
        cards.forEach(function (card) {
          var id = card.getAttribute("data-course-card");
          var lessons = parseInt(card.getAttribute("data-lessons") || "0", 10);
          var done = byCourse[id] || 0;
          totalDone += done; totalLessons += lessons;
          var out = card.querySelector("[data-card-progress]");
          if (!out) return;
          if (done === 0) { out.innerHTML = '<span class="badge badge-mute">Not started</span>'; return; }
          var pct = lessons ? Math.round(done / lessons * 100) : 0;
          out.innerHTML = '<span class="badge ' + (pct === 100 ? "badge-accent" : "") + '">' +
            (pct === 100 ? "Completed ✓" : done + "/" + lessons + " lessons · " + pct + "%") + "</span>";
        });
        var pctAll = totalLessons ? Math.round(totalDone / totalLessons * 100) : 0;
        $$("[data-academy-pct]").forEach(function (el) { el.textContent = pctAll + "%"; });
        $$("[data-academy-bar] > i").forEach(function (i) { i.style.width = pctAll + "%"; });
      });
    }

    RLDB.setting("last-lesson").then(function (last) {
      var banner = document.getElementById("resume-banner");
      if (!banner || !last || !last.url) return;
      var link = banner.querySelector("[data-resume-link]");
      if (link) {
        link.href = last.url;
        link.textContent = (last.title || "your last lesson");
      }
      banner.hidden = false;
    });
  });
})();
