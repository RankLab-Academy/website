/* ==========================================================================
   Ad configuration — edit this ONE file to switch every ad slot on the site
   from reserved placeholder to live Google AdSense inventory.

   Steps to go live (see /resources/visual-assets.html for the full SOP):
   1. Get approved in Google AdSense and create your ad units.
   2. Add the AdSense loader tag to the <head> of your pages:
      <script async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
        crossorigin="anonymous"></script>
   3. Replace the client id and the slot ids below, then set enabled: true.

   Every slot already reserves its height in CSS (.ad-leaderboard, .ad-rectangle,
   .ad-inarticle, .ad-sidebar, .ad-footer), so switching ads on will NOT create
   Cumulative Layout Shift — one of the Core Web Vitals this academy teaches.
   ========================================================================== */
window.RL_ADS = {
  enabled: false,                       // set to true after adding your loader tag
  client: "ca-pub-XXXXXXXXXXXXXXXX",    // your AdSense publisher id
  slots: {
    header: "1111111111",     // responsive leaderboard under the header
    inarticle: "2222222222",  // in-content responsive unit
    rectangle: "3333333333",  // 300x250 medium rectangle
    sidebar: "4444444444",    // 300x600 sticky sidebar (desktop only)
    footer: "5555555555"      // leaderboard above the footer
  }
};
