/* ==========================================================================
   Newsletter capture demo.
   A static site cannot send email. This form stores the address in IndexedDB
   so the interaction is honest and testable, and shows exactly where to plug
   in a real provider (Beehiiv / ConvertKit / Mailchimp) plus Turnstile.
   ========================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("newsletter-form");
  if (!form) return;
  var note = document.getElementById("nl-note");
  var input = document.getElementById("nl-email");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = (input.value || "").trim();
    var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    if (!valid) {
      note.textContent = "Please enter a valid email address.";
      input.focus();
      return;
    }
    var done = function () {
      note.innerHTML = "Saved locally as <strong>" + value.replace(/[<>&]/g, "") + "</strong>. " +
        "Nothing was transmitted — this demo shows the UX, not a mailing list. " +
        "Swap the handler in <code>js/newsletter.js</code> for your ESP form endpoint and add Cloudflare Turnstile before launch.";
      form.reset();
      if (window.rlToast) rlToast("Saved to this browser");
    };
    if (window.RLDB && RLDB.supported()) {
      RLDB.setting("newsletter-email", value).then(done, done);
    } else { done(); }
  });
})();
