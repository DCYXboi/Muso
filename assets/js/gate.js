/* ==========================================================
   MUSO — shoji entrance gate 障子
   Loaded immediately after the gate markup, ahead of three.js,
   so the doors are clickable the moment they are painted.
   ========================================================== */
(function () {
  "use strict";

  // How long an absence is forgiven. The stamp records when the visitor was
  // last on the site, so a reload or a quick trip away walks straight back in;
  // stay away longer than this and the doors are shut again.
  var FORGIVE_ABSENCE = 5 * 60 * 1000; // five minutes
  var STAMP = "muso-last-seen"; // epoch ms

  var root = document.documentElement;
  var gate = document.getElementById("gate");
  if (!gate) return;

  var inside = false; // has this visitor actually crossed the threshold?

  function drop() {
    if (gate.parentNode) gate.parentNode.removeChild(gate);
  }

  function stamp() {
    // Only once they are inside. Otherwise tabbing away from the closed doors
    // would mark them as a returning visitor and they would never see the gate.
    if (!inside) return;
    try {
      localStorage.setItem(STAMP, String(Date.now()));
    } catch (e) {
      /* nothing to remember it with — the gate simply returns next load */
    }
  }

  // "Leaving" is a tab switch, a minimise, a close, or a reload. pagehide is
  // the reliable one on desktop; visibilitychange covers mobile backgrounding,
  // where pagehide is not guaranteed to fire.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") stamp();
  });
  window.addEventListener("pagehide", stamp);

  // A missing or unreadable stamp, and a clock that has jumped backwards, all
  // fall through to showing the gate — the friendlier failure.
  var recent = false;
  try {
    var last = parseInt(localStorage.getItem(STAMP), 10);
    var away = Date.now() - last;
    recent = last > 0 && away >= 0 && away < FORGIVE_ABSENCE;
  } catch (e) {
    recent = false; // private mode or blocked storage
  }
  if (recent) {
    inside = true; // already in; keep the stamp fresh as they come and go
    drop();
    return;
  }

  // Everyone else crosses the threshold, however they arrived. A deep link is
  // remembered and honoured once the doors are open, not used to skip them.
  var target = "";
  try {
    target = decodeURIComponent(location.hash.slice(1));
  } catch (e) {
    target = location.hash.slice(1);
  }

  // The stylesheet keeps .gate display:none until this class is set, so a
  // visitor without JavaScript is never shut out of the site.
  root.classList.add("gated");

  // Two things try to move the page out from under the closed doors: a reload
  // restoring the old scroll position, and the browser jumping to a URL
  // fragment once it parses that element. Hold the top until the doors open.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  function pin() {
    if (root.classList.contains("gated")) window.scrollTo(0, 0);
  }
  pin();
  document.addEventListener("DOMContentLoaded", pin);
  window.addEventListener("load", pin);

  var btn = document.getElementById("gateEnter");
  var opened = false;

  function open() {
    if (opened) return;
    opened = true;
    inside = true;
    stamp(); // in case they leave in a way that fires neither event

    gate.classList.add("opening");

    function finish() {
      drop();
      root.classList.remove("gated"); // releases the scroll lock

      // Now honour the deep link the visitor arrived with; otherwise the hero.
      var dest = (target && document.getElementById(target)) || document.querySelector(".h1");
      if (!dest) return;
      if (dest.id) dest.scrollIntoView();
      dest.setAttribute("tabindex", "-1");
      dest.focus({ preventScroll: true });
    }

    // transitionend is the real signal; the timer covers reduced-motion,
    // backgrounded tabs, and anything else that swallows the event.
    var safety = setTimeout(finish, 2200);
    gate.addEventListener("transitionend", function (e) {
      if (e.propertyName === "transform" && e.target === gate.querySelector(".gate__panel--r")) {
        clearTimeout(safety);
        finish();
      }
    });
  }

  gate.addEventListener("click", open);
  gate.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar" || e.key === "Escape") {
      e.preventDefault();
      open();
    }
    // One way through: keep focus on the door rather than the page behind it.
    if (e.key === "Tab") e.preventDefault();
  });

  if (btn) btn.focus({ preventScroll: true });
})();
