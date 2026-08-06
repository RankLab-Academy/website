/* ==========================================================================
   RankLab Academy — head script (must load synchronously in <head>)
   Tiny on purpose. Two jobs, both of which must happen BEFORE first paint:

   1. Add `has-js` to <html> so CSS can collapse the mega-menu panels.
      Without JavaScript the class never appears, every panel stays visible
      inline, and no navigation link is ever hidden or unreachable.
   2. Apply the saved colour theme so there is no light/dark flash.
   ========================================================================== */
(function () {
  "use strict";
  var root = document.documentElement;
  root.className = (root.className ? root.className + " " : "") + "has-js";

  var mode = null;
  try { mode = localStorage.getItem("rl-theme"); } catch (e) {}
  if (!mode) {
    mode = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  root.setAttribute("data-theme", mode);
})();
