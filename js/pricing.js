/* ==========================================================================
   RankLab Academy — pricing page enhancements
   --------------------------------------------------------------------------
   Reads the same IndexedDB `settings.entitlements` map that js/access.js
   writes, and reports which courses are already unlocked in THIS browser.

   This is reporting only. It is not an access check and it is not security:
   the page says so, and the real gate would live on a server. If IndexedDB is
   unavailable the status block simply stays empty — nothing on the page
   depends on it.
   ========================================================================== */
(function () {
  "use strict";

  var host = document.querySelector("[data-ladder-status]");
  if (!host) return;
  if (!(window.RLDB && RLDB.supported())) return;

  /* Course number -> price, mirroring data/courses.json. */
  var LADDER = [
    { id: "course-00", num: 0, price: 0 },
    { id: "course-01", num: 1, price: 0 },
    { id: "course-02", num: 2, price: 19 },
    { id: "course-03", num: 3, price: 29 },
    { id: "course-04", num: 4, price: 39 },
    { id: "course-05", num: 5, price: 49 },
    { id: "course-06", num: 6, price: 59 },
    { id: "course-07", num: 7, price: 69 },
    { id: "course-08", num: 8, price: 79 },
    { id: "course-09", num: 9, price: 99 },
    { id: "course-10", num: 10, price: 119 },
    { id: "course-11", num: 11, price: 149 },
    { id: "course-12", num: 12, price: 199 }
  ];

  RLDB.setting("entitlements").then(function (map) {
    map = map || {};
    var owned = LADDER.filter(function (c) {
      return c.price > 0 && map[c.id] && map[c.id].unlocked;
    });
    if (!owned.length) return;

    var spent = owned.reduce(function (t, c) { return t + c.price; }, 0);
    var nums = owned.map(function (c) { return c.num; }).join(", ");

    host.innerHTML =
      '<div class="callout callout-tip mb-0">' +
      '<strong class="callout-title">Unlocked in this browser</strong>' +
      '<p class="mb-0 text-sm">Course' + (owned.length > 1 ? "s" : "") + " " + nums +
      " (ladder value $" + spent + '). This reflects local demo state only — ' +
      'no payment was taken. Reset any course from its own page.</p></div>';
  }).catch(function () { /* storage blocked: leave the block empty */ });
})();
