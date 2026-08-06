/* ==========================================================================
   RankLab Academy — IndexedDB data layer (RLDB)
   All learner data stays in the browser. No server, no account, no tracking.
   Object stores:
     progress   { id: "course:lesson", course, lesson, done, updated }
     notes      { id: "course:lesson", course, lesson, text, updated }
     quiz       { id: "course:lesson", course, lesson, correct, total, updated }
     checklists { id: "checklistId", items: {key:bool}, updated }
     portfolio  { id (auto), site fields... }             // 10-site master sheet
     keywords   { id (auto), keyword, site, intent, ... } // keyword/SERP research
     favorites  { id: promptId, title, url, updated }     // saved prompts
     settings   { id: "key", value }
     activity   { id: "YYYY-MM-DD", visits, updated }     // streak / returning visitor
   ========================================================================== */
(function (global) {
  "use strict";

  var DB_NAME = "ranklab-academy";
  var DB_VERSION = 1;
  var STORES = ["progress", "notes", "quiz", "checklists", "portfolio", "keywords", "favorites", "settings", "activity"];
  var dbPromise = null;

  function supported() {
    try { return typeof indexedDB !== "undefined" && indexedDB !== null; } catch (e) { return false; }
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!supported()) { reject(new Error("IndexedDB unavailable")); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (ev) {
        var db = ev.target.result;
        STORES.forEach(function (name) {
          if (db.objectStoreNames.contains(name)) return;
          if (name === "portfolio" || name === "keywords") {
            var s = db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
            s.createIndex("updated", "updated", { unique: false });
          } else {
            var st = db.createObjectStore(name, { keyPath: "id" });
            if (name === "progress" || name === "notes" || name === "quiz") {
              st.createIndex("course", "course", { unique: false });
            }
          }
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(store, mode) {
    return open().then(function (db) {
      return db.transaction(store, mode).objectStore(store);
    });
  }

  function wrap(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  var RLDB = {
    supported: supported,

    /** Insert or update a record. Adds `updated` timestamp automatically. */
    put: function (store, value) {
      value.updated = Date.now();
      return tx(store, "readwrite").then(function (s) { return wrap(s.put(value)); });
    },

    get: function (store, id) {
      return tx(store, "readonly").then(function (s) { return wrap(s.get(id)); });
    },

    all: function (store) {
      return tx(store, "readonly").then(function (s) { return wrap(s.getAll()); });
    },

    remove: function (store, id) {
      return tx(store, "readwrite").then(function (s) { return wrap(s.delete(id)); });
    },

    clear: function (store) {
      return tx(store, "readwrite").then(function (s) { return wrap(s.clear()); });
    },

    /** Records for a single course, using the `course` index. */
    byCourse: function (store, course) {
      return tx(store, "readonly").then(function (s) {
        if (!s.indexNames.contains("course")) return [];
        return wrap(s.index("course").getAll(course));
      });
    },

    setting: function (key, value) {
      if (typeof value === "undefined") {
        return RLDB.get("settings", key).then(function (r) { return r ? r.value : undefined; });
      }
      return RLDB.put("settings", { id: key, value: value });
    },

    /** Records a daily visit; returns { days, streak }. */
    trackVisit: function () {
      var today = new Date().toISOString().slice(0, 10);
      return RLDB.get("activity", today).then(function (rec) {
        var visits = rec ? (rec.visits || 0) + 1 : 1;
        return RLDB.put("activity", { id: today, visits: visits });
      }).then(function () {
        return RLDB.all("activity");
      }).then(function (rows) {
        var days = rows.map(function (r) { return r.id; }).sort();
        var streak = 0;
        var cursor = new Date();
        while (true) {
          var key = cursor.toISOString().slice(0, 10);
          if (days.indexOf(key) === -1) break;
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
        return { days: days.length, streak: streak, history: days };
      }).catch(function () { return { days: 0, streak: 0, history: [] }; });
    },

    /** Full backup of every store (used by the dashboard export button). */
    exportAll: function () {
      var out = { app: "ranklab-academy", version: DB_VERSION, exported: new Date().toISOString(), data: {} };
      return Promise.all(STORES.map(function (name) {
        return RLDB.all(name).then(function (rows) { out.data[name] = rows; });
      })).then(function () { return out; });
    },

    /** Restore a backup produced by exportAll(). Merges by key. */
    importAll: function (payload) {
      if (!payload || !payload.data) return Promise.reject(new Error("Invalid backup file"));
      var jobs = [];
      STORES.forEach(function (name) {
        var rows = payload.data[name];
        if (!Array.isArray(rows)) return;
        rows.forEach(function (row) {
          if (name === "portfolio" || name === "keywords") { delete row.id; }
          jobs.push(RLDB.put(name, row));
        });
      });
      return Promise.all(jobs);
    },

    wipe: function () {
      return Promise.all(STORES.map(function (n) { return RLDB.clear(n); }));
    },

    stores: STORES
  };

  global.RLDB = RLDB;
})(window);
