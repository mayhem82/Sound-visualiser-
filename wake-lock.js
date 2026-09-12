(() => {
  "use strict";

  // Shared Screen Wake Lock helper — one real implementation, included by
  // every page that has an active hands-on/hands-free session, instead of
  // duplicating this per page. Keeps the screen from sleeping while enabled;
  // the OS/browser still releases the lock automatically when the tab is
  // backgrounded (spec behaviour, not a bug here) -- this transparently
  // re-requests it once the page is visible again, so a caller only ever
  // has to say "on" or "off," not track visibility itself.

  const supported = "wakeLock" in navigator;
  let sentinel = null;
  let wanted = false;
  let acquiring = null; // in-flight request(), so two near-simultaneous
                        // callers (e.g. enable() racing a visibilitychange)
                        // await the same request instead of each firing
                        // their own before either has set `sentinel`.

  async function acquire() {
    if (!supported || !wanted || sentinel || acquiring) return acquiring;
    acquiring = (async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        sentinel.addEventListener("release", () => { sentinel = null; });
      } catch (e) { /* not fatal -- screen just sleeps normally on its own timeout */ }
      finally { acquiring = null; }
    })();
    return acquiring;
  }

  function enable() {
    wanted = true;
    acquire();
  }

  function disable() {
    wanted = false;
    if (sentinel) { sentinel.release().catch(() => {}); sentinel = null; }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") acquire();
  });

  window.WakeLockHelper = { enable, disable, get supported() { return supported; } };
})();
