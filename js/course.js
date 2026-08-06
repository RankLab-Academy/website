/* ==========================================================================
   RankLab Academy — course page script
   Lesson completion, autosaved notes, quiz self-scoring, TOC scroll-spy,
   course progress bar and "resume where you left off" — all via IndexedDB.
   Requires: data-course="course-01" on <body> (or on .doc-layout).
   ========================================================================== */
(function () {
  "use strict";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var root = document.body;
  var courseId = root.getAttribute("data-course");
  if (!courseId) return;
  var hasDB = window.RLDB && RLDB.supported();

  var lessons = $$(".lesson[id]");
  var total = lessons.length;

  /* ---------- progress bar ---------- */
  function renderProgress(doneCount) {
    var pct = total ? Math.round(doneCount / total * 100) : 0;
    $$("[data-course-bar] > i").forEach(function (i) { i.style.width = pct + "%"; });
    $$("[data-course-pct]").forEach(function (el) { el.textContent = pct + "%"; });
    $$("[data-course-done]").forEach(function (el) { el.textContent = doneCount; });
    $$("[data-course-total]").forEach(function (el) { el.textContent = total; });
  }

  function refresh() {
    if (!hasDB) { renderProgress(0); return Promise.resolve(); }
    return RLDB.byCourse("progress", courseId).then(function (rows) {
      var doneIds = {};
      rows.forEach(function (r) { if (r.done) doneIds[r.lesson] = true; });
      lessons.forEach(function (sec) {
        var done = !!doneIds[sec.id];
        var box = $('input[data-lesson-complete]', sec);
        if (box) {
          box.checked = done;
          box.closest(".complete-toggle").classList.toggle("is-done", done);
        }
        var tocLink = $('.toc a[href="#' + sec.id + '"]');
        if (tocLink) tocLink.classList.toggle("done", done);
      });
      renderProgress(Object.keys(doneIds).length);
    });
  }

  /* ---------- lesson complete toggles ---------- */
  lessons.forEach(function (sec) {
    var box = $('input[data-lesson-complete]', sec);
    if (!box) return;
    box.addEventListener("change", function () {
      if (!hasDB) { window.rlToast && rlToast("Your browser blocks local storage — progress can't be saved."); return; }
      RLDB.put("progress", {
        id: courseId + ":" + sec.id,
        course: courseId,
        lesson: sec.id,
        title: (sec.querySelector("h2") || {}).textContent || sec.id,
        done: box.checked
      }).then(function () {
        RLDB.setting("last-lesson", { course: courseId, lesson: sec.id, url: location.pathname + "#" + sec.id, title: document.title });
        refresh();
        if (box.checked) window.rlToast && rlToast("Lesson saved as complete");
      });
    });
  });

  /* ---------- autosaved notes ---------- */
  $$("textarea[data-note]").forEach(function (ta) {
    var lessonId = ta.getAttribute("data-note");
    var key = courseId + ":" + lessonId;
    var status = ta.parentNode.querySelector(".notes-status");
    if (!hasDB) { if (status) status.textContent = "Local storage unavailable."; return; }

    RLDB.get("notes", key).then(function (rec) {
      if (rec && rec.text) {
        ta.value = rec.text;
        if (status) status.textContent = "Saved note restored (" + new Date(rec.updated).toLocaleDateString() + ")";
      }
    });

    var timer;
    ta.addEventListener("input", function () {
      if (status) status.textContent = "Saving…";
      clearTimeout(timer);
      timer = setTimeout(function () {
        RLDB.put("notes", { id: key, course: courseId, lesson: lessonId, text: ta.value })
          .then(function () { if (status) status.textContent = "Saved to this browser ✓"; });
      }, 600);
    });
  });

  /* ---------- quiz self-scoring ---------- */
  $$("[data-quiz]").forEach(function (quiz) {
    var lessonId = quiz.getAttribute("data-quiz");
    var key = courseId + ":" + lessonId;
    var questions = $$("details", quiz).length;
    var out = quiz.querySelector("[data-quiz-out]");

    function show(correct) {
      if (out) out.textContent = correct === null ? "Not scored yet" : correct + " / " + questions + " correct";
    }
    if (hasDB) RLDB.get("quiz", key).then(function (r) { show(r ? r.correct : null); });

    $$("[data-quiz-score]", quiz).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var correct = parseInt(btn.getAttribute("data-quiz-score"), 10);
        if (!hasDB) { show(correct); return; }
        RLDB.put("quiz", { id: key, course: courseId, lesson: lessonId, correct: correct, total: questions })
          .then(function () { show(correct); window.rlToast && rlToast("Quiz score saved"); });
      });
    });
  });

  /* ---------- TOC scroll-spy ---------- */
  var tocLinks = $$(".toc a[href^='#']");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(function (a) { a.classList.remove("active"); });
        var link = $('.toc a[href="#' + entry.target.id + '"]');
        if (link) link.classList.add("active");
      });
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });
    lessons.forEach(function (sec) { io.observe(sec); });
  }

  /* ---------- remember position for "resume" ---------- */
  if (hasDB) {
    var savedTimer;
    window.addEventListener("scroll", function () {
      clearTimeout(savedTimer);
      savedTimer = setTimeout(function () {
        var current = null;
        lessons.forEach(function (sec) {
          if (sec.getBoundingClientRect().top < 140) current = sec;
        });
        if (!current) return;
        RLDB.setting("last-lesson", {
          course: courseId,
          lesson: current.id,
          url: location.pathname + "#" + current.id,
          title: document.title.split("|")[0].trim()
        });
      }, 900);
    }, { passive: true });
  }

  refresh();
})();
