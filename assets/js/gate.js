/* ==========================================================
   MUSO — shoji entrance gate 障子
   Loaded immediately after the gate markup, ahead of three.js,
   so the doors are clickable the moment they are painted.
   ========================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var gate = document.getElementById("gate");
  if (!gate) return;

  function drop() {
    if (gate.parentNode) gate.parentNode.removeChild(gate);
  }

  // Everyone crosses the threshold, however they arrived. A deep link is
  // remembered and honoured once the doors are open, not used to skip them.
  var target = "";
  try {
    target = decodeURIComponent(location.hash.slice(1));
  } catch (e) {
    target = location.hash.slice(1);
  }

  // One crossing per browser session.
  var seen = false;
  try {
    seen = sessionStorage.getItem("muso-entered") === "1";
  } catch (e) {
    seen = false; // private mode or blocked storage: just show it
  }
  if (seen) {
    drop();
    return;
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

    gate.classList.add("opening");
    try {
      sessionStorage.setItem("muso-entered", "1");
    } catch (e) {
      /* nothing to remember it with — the gate simply returns next load */
    }

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
