(() => {
  "use strict";

  // Shared Compute Pressure API helper -- reports real CPU/thermal
  // pressure state ("nominal" | "fair" | "serious" | "critical") so a page
  // can surface a manual "Reduce load" button when it's actually elevated,
  // instead of silently throttling itself or doing nothing. Deliberately
  // NOT automatic: a caller decides what "reduce load" means for its own
  // page (a lower refresh rate, fewer particles, whatever) and only acts
  // on an explicit click -- this just supplies the real signal.

  const supported = typeof PressureObserver === "function";
  let observer = null;
  let currentState = null;
  const listeners = [];

  function notify() {
    listeners.forEach((cb) => { try { cb(currentState); } catch (e) {} });
  }

  function start() {
    if (!supported || observer) return;
    observer = new PressureObserver((records) => {
      currentState = records[records.length - 1].state;
      notify();
    });
    observer.observe("cpu").catch(() => {});
  }

  // cb(state) fires on every change, and once immediately with the current
  // state if one's already known.
  function onChange(cb) {
    listeners.push(cb);
    if (currentState) cb(currentState);
  }

  function getState() { return currentState; }
  function isElevated() { return currentState === "serious" || currentState === "critical"; }

  window.ComputePressureHelper = { supported, start, onChange, getState, isElevated };
})();
