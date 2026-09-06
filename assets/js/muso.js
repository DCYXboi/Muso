/* ==========================================================
   MUSO â€” interaction
   - day / night theme, incl. the palette hand-off to the scene
   - floating nav, overlay menu, scroll reveals
   - product photo <-> technical flat toggle
   - the ronin: a procedural three.js rig that tracks the cursor
   ========================================================== */
(function(){
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- theme ---------------- */
  var mqDark = window.matchMedia("(prefers-color-scheme: dark)");
  var tDay = document.getElementById("tDay"), tNight = document.getElementById("tNight");
  function resolved(){
    var t = root.getAttribute("data-theme");
    if(t === "dark") return "dark";
    if(t === "light") return "light";
    return mqDark.matches ? "dark" : "light";
  }
  function syncToggle(){
    var d = resolved() === "dark";
    tNight.setAttribute("aria-pressed", d ? "true" : "false");
    tDay.setAttribute("aria-pressed", d ? "false" : "true");
  }
  tDay.addEventListener("click", function(){ root.setAttribute("data-theme","light"); syncToggle(); });
  tNight.addEventListener("click", function(){ root.setAttribute("data-theme","dark"); syncToggle(); });
  if(mqDark.addEventListener) mqDark.addEventListener("change", syncToggle);
  syncToggle();

  /* ---------------- nav ---------------- */
  var nav = document.getElementById("nav"), burger = document.getElementById("burger"), sheet = document.getElementById("sheet");
  function closeMenu(){ document.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded","false"); burger.setAttribute("aria-label","Open menu"); }
  burger.addEventListener("click", function(){
    var open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  sheet.addEventListener("click", function(e){ if(e.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeMenu(); });

  var lastY = 0, navTick = false;
  window.addEventListener("scroll", function(){
    if(navTick) return; navTick = true;
    requestAnimationFrame(function(){
      var y = window.scrollY || 0;
      nav.classList.toggle("tucked", y > 40 && y > lastY);
      lastY = y; navTick = false;
    });
  }, {passive:true});

  /* ---------------- reveals ---------------- */
  var items = [].slice.call(document.querySelectorAll("[data-reveal]"));
  if("IntersectionObserver" in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, {rootMargin:"0px 0px -6% 0px", threshold:0.05});
    items.forEach(function(el, i){ el.style.setProperty("--d", (i % 5) * 70 + "ms"); io.observe(el); });
    setTimeout(function(){ items.forEach(function(el){ el.classList.add("in"); }); }, 2800);
  } else {
    items.forEach(function(el){ el.classList.add("in"); });
  }

  /* photo <-> technical flat. Hover handles the mouse; the button state
     carries keyboard and touch, which hover alone would leave out. */
  [].slice.call(document.querySelectorAll(".media")).forEach(function(btn){
    btn.addEventListener("click", function(){
      btn.setAttribute("aria-pressed", btn.getAttribute("aria-pressed") === "true" ? "false" : "true");
    });
  });

  /* =========================================================
     THE RŌNIN — procedural, cursor-reactive
     Built as a rig: hat + head track the pointer, torso lags,
     robe shears with pointer velocity, figure takes weight on press.
     ========================================================= */
  var canvas = document.getElementById("gl");
  var poster = document.getElementById("poster");
  var core   = document.getElementById("stageCore");
  var hint   = document.getElementById("hint");
  if(!window.THREE || !canvas) return;

  var PAL = {
    light:{ deep:0x16252C, mid:0x2F4650, pale:0x6B8087, rim:0xEFE7D6, disc:0xF2EDE0, stone:0xACA189, straw:0xB09A76, glow:0.10 },
    dark: { deep:0x070C0F, mid:0x16232A, pale:0x3C545E, rim:0xE0D4B8, disc:0xE8E0CE, stone:0x1A2227, straw:0x6B5C42, glow:0.55 }
  };

  var VERT = [
    "uniform float uSway, uTime, uBreath, uPress, uSwayTop, uSwayBot, uSwayAmt;",
    "varying vec3 vN; varying vec3 vV; varying vec2 vUv;",
    "void main(){",
    "  vUv = uv;",
    "  vec3 p = position;",
    "  float m = clamp((uSwayTop - p.y) / max(uSwayTop - uSwayBot, 0.001), 0.0, 1.0);",
    "  m = m * m;",
    "  p.x += uSway * m * uSwayAmt;",
    "  p.z += uSway * m * uSwayAmt * 0.32;",
    "  p.y += sin(uTime * 0.85 + p.x * 1.6) * 0.008 * m;",
    "  p.y += uBreath * (1.0 - m) * 0.014;",
    "  p.y -= uPress * 0.055;",
    "  vec4 wp = modelMatrix * vec4(p, 1.0);",
    "  vN = normalize(mat3(modelMatrix) * normal);",
    "  vV = normalize(cameraPosition - wp.xyz);",
    "  gl_Position = projectionMatrix * viewMatrix * wp;",
    "}"
  ].join("\n");

  var FRAG = [
    "uniform vec3 uDeep, uMid, uPale, uRim, uLight;",
    "uniform float uBandA, uBandB, uRimPow, uRimAmt, uPattern, uPatAmt, uGlint, uGrain;",
    "varying vec3 vN; varying vec3 vV; varying vec2 vUv;",
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float tri(float x){ return abs(fract(x) - 0.5) * 2.0; }",
    "void main(){",
    "  vec3 N = normalize(vN);",
    "  float t = dot(N, normalize(uLight)) * 0.5 + 0.5;",
    "  vec3 c = mix(uDeep, uMid, smoothstep(uBandA - 0.08, uBandA + 0.08, t));",
    "  c = mix(c, uPale, smoothstep(uBandB - 0.07, uBandB + 0.07, t));",
    "  float pat = 0.0;",
    "  if(uPattern > 0.5 && uPattern < 1.5){",
    "    pat = smoothstep(0.84, 1.0, tri(vUv.y * 30.0)) * 0.9 + smoothstep(0.9, 1.0, tri(vUv.x * 84.0)) * 0.3;",
    "  } else if(uPattern > 1.5 && uPattern < 2.5){",
    "    pat = smoothstep(0.8, 1.0, tri(vUv.x * 44.0 + vUv.y * 2.5)) * 0.55;",
    "  } else if(uPattern > 2.5 && uPattern < 3.5){",
    "    pat = smoothstep(0.7, 1.0, tri(vUv.x * 4.0 + vUv.y * 12.0)) * 0.9;",
    "  }",
    "  c = mix(c, uDeep * 0.7, pat * uPatAmt);",
    "  float rim = pow(1.0 - clamp(dot(N, normalize(vV)), 0.0, 1.0), uRimPow);",
    "  c += uRim * rim * uRimAmt;",
    "  if(uPattern > 3.5){",
    "    c += uRim * smoothstep(0.06, 0.0, abs(vUv.x - uGlint)) * 0.8;",
    "  }",
    "  c += (hash(gl_FragCoord.xy) - 0.5) * uGrain;",
    "  gl_FragColor = vec4(c, 1.0);",
    "}"
  ].join("\n");

  var mats = [];
  function inkMat(o){
    o = o || {};
    var m = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      side: o.side || THREE.FrontSide,
      uniforms:{
        uDeep:{value:new THREE.Color(PAL.light.deep)},
        uMid:{value:new THREE.Color(PAL.light.mid)},
        uPale:{value:new THREE.Color(PAL.light.pale)},
        uRim:{value:new THREE.Color(PAL.light.rim)},
        uLight:{value:new THREE.Vector3(-0.52, 0.74, 0.42)},
        uBandA:{value:o.bandA !== undefined ? o.bandA : 0.46},
        uBandB:{value:o.bandB !== undefined ? o.bandB : 0.78},
        uRimPow:{value:o.rimPow !== undefined ? o.rimPow : 2.6},
        uRimAmt:{value:o.rimAmt !== undefined ? o.rimAmt : 0.5},
        uPattern:{value:o.pattern || 0},
        uPatAmt:{value:o.patAmt !== undefined ? o.patAmt : 0.5},
        uGlint:{value:0.5},
        uGrain:{value:o.grain !== undefined ? o.grain : 0.028},
        uSway:{value:0}, uTime:{value:0}, uBreath:{value:0}, uPress:{value:0},
        uSwayTop:{value:o.swayTop !== undefined ? o.swayTop : 1.0},
        uSwayBot:{value:o.swayBot !== undefined ? o.swayBot : -1.0},
        uSwayAmt:{value:o.swayAmt !== undefined ? o.swayAmt : 0}
      }
    });
    m.userData.tint = o.tint || "body";
    mats.push(m);
    return m;
  }

  /* ---- geometry helpers ---- */
  function lathe(pts, seg){
    var v = pts.map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    return new THREE.LatheGeometry(v, seg || 48);
  }
  function tri(x){ return Math.abs(x - Math.floor(x) - 0.5) * 2; }

  // Sharp, hand-shaped creases: displace radially with a triangle wave so
  // the cloth reads faceted and torn rather than machine-smooth.
  function crease(geo, o){
    geo = geo.toNonIndexed();
    var pos = geo.attributes.position, v = new THREE.Vector3();
    for(var i = 0; i < pos.count; i++){
      v.fromBufferAttribute(pos, i);
      var r = Math.sqrt(v.x * v.x + v.z * v.z);
      if(r < 1e-4) continue;
      var th = Math.atan2(v.z, v.x) / (Math.PI * 2);
      var drop = Math.min(Math.max((o.top - v.y) / (o.top - o.bot), 0), 1);
      var amp = o.amp * Math.pow(drop, o.pow || 1);
      var f = (tri(th * o.n1 + v.y * (o.skew || 0)) * 0.66 + tri(th * o.n2 + 1.7) * 0.34) - 0.5;
      var off = f * amp;
      v.x += (v.x / r) * off;
      v.z += (v.z / r) * off;
      if(o.yamp) v.y += f * o.yamp * drop;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.48, 7.7);

  var renderer;
  try{
    renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true, powerPreference:"high-performance"});
  }catch(err){ return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  var world = new THREE.Group(); scene.add(world);
  var figure = new THREE.Group(); world.add(figure);

  /* ---- moon ---- */
  var moon = new THREE.Group(); world.add(moon);
  var discMat = new THREE.MeshBasicMaterial({color:PAL.light.disc});
  var disc = new THREE.Mesh(new THREE.CircleGeometry(2.15, 96), discMat);
  disc.position.set(0.12, 1.5, -5.2);
  moon.add(disc);

  var glowMat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false,
    uniforms:{ uCol:{value:new THREE.Color(PAL.light.disc)}, uAmt:{value:PAL.light.glow} },
    vertexShader:"varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader:"uniform vec3 uCol; uniform float uAmt; varying vec2 vU; void main(){ float d = length(vU - 0.5) * 2.0; float a = pow(1.0 - clamp(d,0.0,1.0), 2.6) * uAmt; gl_FragColor = vec4(uCol, a); }"
  });
  var glow = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), glowMat);
  glow.position.set(0.12, 1.5, -5.4);
  moon.add(glow);

  /* ---- stone ledge ---- */
  var stoneMat = inkMat({bandA:0.42, bandB:0.8, rimAmt:0.3, rimPow:3.2, grain:0.05, tint:"stone"});
  var ledgeGeo = new THREE.BoxGeometry(7.4, 0.26, 0.78, 40, 2, 3).toNonIndexed();
  (function roughen(g){
    var p = g.attributes.position, v = new THREE.Vector3();
    for(var i = 0; i < p.count; i++){
      v.fromBufferAttribute(p, i);
      var n = Math.sin(v.x * 5.1) * 0.5 + Math.sin(v.x * 13.3 + 1.2) * 0.3 + Math.sin(v.z * 9.0) * 0.2;
      v.y += n * 0.026; v.z += n * 0.014;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
  })(ledgeGeo);
  var ledge = new THREE.Mesh(ledgeGeo, stoneMat);
  ledge.position.set(0, -1.06, 0);
  figure.add(ledge);

  /* ---- torso + robe (lags behind the head) ---- */
  var torso = new THREE.Group(); figure.add(torso);
  var robeMat = inkMat({pattern:2, patAmt:0.3, bandA:0.63, bandB:0.91, rimAmt:0.62, rimPow:2.4, swayTop:0.95, swayBot:-1.05, swayAmt:0.13, side:THREE.DoubleSide});
  var robeGeo = crease(lathe([
    [0.32, 1.06],[0.64, 0.96],[0.82, 0.80],[0.84, 0.56],[0.82, 0.30],
    [0.85, 0.04],[0.93,-0.22],[1.04,-0.46],[1.15,-0.66],[1.25,-0.82],
    [1.31,-0.93],[1.22,-0.99],[0.68,-1.03],[0.00,-1.05]
  ], 54), {top:0.95, bot:-1.05, amp:0.13, pow:1.25, n1:9, n2:19, skew:0.7});
  torso.add(new THREE.Mesh(robeGeo, robeMat));

  // sleeves — heavy drooping masses either side
  var sleeveMat = inkMat({pattern:2, patAmt:0.24, bandA:0.6, bandB:0.89, rimAmt:0.58, rimPow:2.2, swayTop:0.8, swayBot:-0.6, swayAmt:0.1, side:THREE.DoubleSide});
  function sleeve(sx){
    var g = crease(lathe([
      [0.06, 0.46],[0.26, 0.40],[0.40, 0.24],[0.47, 0.02],[0.50,-0.22],
      [0.47,-0.44],[0.38,-0.58],[0.20,-0.65],[0.00,-0.67]
    ], 40), {top:0.46, bot:-0.67, amp:0.1, pow:1.2, n1:7, n2:15, skew:0.9});
    var m = new THREE.Mesh(g, sleeveMat);
    m.scale.set(1.34, 1.3, 1.0);
    m.position.set(sx * 0.84, 0.5, 0.04);
    m.rotation.z = sx * 0.34;
    m.rotation.x = -0.1;
    return m;
  }
  torso.add(sleeve(-1)); torso.add(sleeve(1));

  // collar
  var collarMat = inkMat({rimAmt:0.72, rimPow:2.0, bandA:0.66, bandB:0.92, side:THREE.DoubleSide});
  var collar = new THREE.Mesh(crease(lathe([
    [0.20, 1.16],[0.34, 1.08],[0.44, 0.94],[0.48, 0.78],[0.40, 0.74],[0.30, 0.88],[0.18, 1.02]
  ], 34), {top:1.16, bot:0.74, amp:0.05, pow:1, n1:6, n2:11, skew:0}), collarMat);
  torso.add(collar);

  // forearms + hands resting at the lap
  var limbMat = inkMat({pattern:3, patAmt:0.42, rimAmt:0.5, rimPow:2.4});
  function forearm(sx){
    var g = new THREE.CylinderGeometry(0.085, 0.10, 0.78, 12, 1).toNonIndexed();
    g.computeVertexNormals();
    var m = new THREE.Mesh(g, limbMat);
    m.position.set(sx * 0.5, 0.02, 0.42);
    m.rotation.set(-0.5, 0, sx * 0.62);
    return m;
  }
  torso.add(forearm(-1)); torso.add(forearm(1));
  var handMat = inkMat({bandA:0.5, bandB:0.82, rimAmt:0.6, rimPow:2.2});
  function hand(x, y, z, s){
    var m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), handMat);
    m.position.set(x, y, z); m.scale.set(1, 0.86, s || 1.15);
    return m;
  }
  torso.add(hand(-0.2, -0.12, 0.62)); torso.add(hand(0.26, -0.06, 0.6));

  // hanging leg with wrapped shin + sandal
  var shin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.86, 14, 1), inkMat({pattern:3, patAmt:0.6, rimAmt:0.46, rimPow:2.6}));
  shin.position.set(0.24, -1.6, 0.2); shin.rotation.z = -0.05;
  figure.add(shin);
  var sandal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.56), inkMat({bandA:0.44, bandB:0.8, rimAmt:0.4}));
  sandal.position.set(0.24, -2.06, 0.26);
  figure.add(sandal);

  /* ---- swords ---- */
  var sayaMat  = inkMat({pattern:4, patAmt:0, rimAmt:0.7, rimPow:2.0, bandA:0.44, bandB:0.74});
  var tsukaMat = inkMat({pattern:3, patAmt:0.75, rimAmt:0.5, rimPow:2.4});
  var tsubaMat = inkMat({bandA:0.4, bandB:0.72, rimAmt:0.85, rimPow:1.7});

  function katana(pts, tsukaAt, scale){
    var g = new THREE.Group();
    var curve = new THREE.CatmullRomCurve3(pts.map(function(p){ return new THREE.Vector3(p[0], p[1], p[2]); }));
    var saya = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.048 * scale, 9, false), sayaMat);
    g.add(saya);
    var t = new THREE.Vector3().fromArray(tsukaAt);
    var tk = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * scale, 0.058 * scale, 0.52 * scale, 10), tsukaMat);
    var dir = curve.getTangentAt(0).clone();
    tk.position.copy(t);
    tk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.add(tk);
    var tb = new THREE.Mesh(new THREE.CylinderGeometry(0.115 * scale, 0.115 * scale, 0.022, 18), tsubaMat);
    tb.position.copy(curve.getPointAt(0.02));
    tb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.add(tb);
    return g;
  }

  // katana across the lap
  torso.add(katana([[-1.98, 0.52, 0.34],[-1.1, 0.28, 0.5],[-0.1, 0.06, 0.58],[0.9, -0.1, 0.5],[1.62, -0.2, 0.36]],
                   [-2.22, 0.6, 0.3], 1));
  // wakizashi resting on the ledge, behind
  var wak = katana([[0.86, -0.36, -0.1],[1.7, -0.5, -0.14],[2.5, -0.62, -0.18],[3.06, -0.7, -0.2]],
                   [0.6, -0.32, -0.08], 0.86);
  figure.add(wak);

  /* ---- head + kasa (the part that watches you) ---- */
  var head = new THREE.Group();
  head.position.set(0, 1.02, 0);
  torso.add(head);

  var voidMat = inkMat({bandA:0.9, bandB:0.99, rimAmt:0.22, rimPow:3.6, grain:0.02});
  var skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), voidMat);
  skull.position.set(0, 0.24, 0.02); skull.scale.set(1, 1.1, 0.95);
  head.add(skull);

  var hatMat = inkMat({pattern:1, patAmt:0.55, rimAmt:0.42, rimPow:2.2, bandA:0.5, bandB:0.86, side:THREE.DoubleSide, tint:"straw"});
  var hatGeo = crease(lathe([
    [0.00, 0.10],[0.05, 0.06],[0.13, 0.00],[0.26,-0.09],[0.44,-0.19],
    [0.64,-0.29],[0.85,-0.38],[1.03,-0.45],[1.16,-0.50],[1.24,-0.55],
    [1.21,-0.60],[1.02,-0.55],[0.66,-0.40],[0.24,-0.19],[0.00,-0.08]
  ], 56), {top:0.10, bot:-0.60, amp:0.045, pow:1.5, n1:11, n2:23, skew:0, yamp:0.05});
  var hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.set(0, 0.62, 0);
  hat.scale.set(1.16, 1.16, 1.16);
  head.add(hat);

  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), hatMat);
  knob.position.set(0, 0.74, 0);
  head.add(knob);

  /* ---- ink drips off the hem ---- */
  var dripMat = inkMat({bandA:0.95, bandB:0.99, rimAmt:0.14, rimPow:4, grain:0.015});
  for(var i = 0; i < 11; i++){
    var a = (i / 11) * Math.PI * 2 + 0.4;
    var len = 0.22 + ((i * 37) % 11) / 11 * 0.62;
    var d = new THREE.Mesh(new THREE.ConeGeometry(0.022, len, 6), dripMat);
    d.position.set(Math.cos(a) * 1.24, -1.16 - len / 2, Math.sin(a) * 0.5 + 0.1);
    figure.add(d);
    if(i % 3 === 0){
      var sp = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 6), dripMat);
      sp.position.set(Math.cos(a) * 1.5, -1.5 - (i % 4) * 0.22, Math.sin(a) * 0.55);
      figure.add(sp);
    }
  }

  /* ---------------- rig + interaction ---------------- */
  function Spr(k, d){ this.v = 0; this.s = 0; this.t = 0; this.k = k; this.d = d; }
  Spr.prototype.step = function(dt){
    this.s += ((this.t - this.v) * this.k - this.s * this.d) * dt;
    this.v += this.s * dt;
  };

  var sHeadX = new Spr(40, 8.6), sHeadY = new Spr(40, 8.6);
  var sCamX  = new Spr(22, 7.2), sCamY  = new Spr(22, 7.2);
  var sSway  = new Spr(26, 6.0);
  var sPress = new Spr(50, 10);

  var px = 0, py = 0, prevPx = 0, lastMove = -9999, touched = false;
  var isTouch = window.matchMedia("(hover: none)").matches;

  function onMove(cx, cy){
    var r = core.getBoundingClientRect();
    px = Math.max(-1, Math.min(1, ((cx - r.left) / r.width) * 2 - 1));
    py = Math.max(-1, Math.min(1, ((cy - r.top) / r.height) * 2 - 1));
    lastMove = performance.now();
    if(!touched){ touched = true; hint.classList.add("gone"); }
  }
  window.addEventListener("pointermove", function(e){ onMove(e.clientX, e.clientY); }, {passive:true});
  core.addEventListener("pointerdown", function(){ sPress.t = 1; });
  window.addEventListener("pointerup", function(){ sPress.t = 0; });
  window.addEventListener("pointercancel", function(){ sPress.t = 0; });

  /* ---------------- palette lerp ---------------- */
  var cur = {}, tgtP = {};
  ["deep","mid","pale","rim","disc","stone","straw"].forEach(function(k){
    cur[k] = new THREE.Color(PAL.light[k]);
    tgtP[k] = new THREE.Color(PAL.light[k]);
  });
  var curGlow = PAL.light.glow, tgtGlow = PAL.light.glow;

  function applyPalette(){
    var p = PAL[resolved()];
    ["deep","mid","pale","rim","disc","stone","straw"].forEach(function(k){ tgtP[k].setHex(p[k]); });
    tgtGlow = p.glow;
  }
  applyPalette();
  ["deep","mid","pale","rim","disc","stone","straw"].forEach(function(k){ cur[k].copy(tgtP[k]); });
  curGlow = tgtGlow;
  tDay.addEventListener("click", applyPalette);
  tNight.addEventListener("click", applyPalette);
  if(mqDark.addEventListener) mqDark.addEventListener("change", applyPalette);

  /* ---------------- sizing ---------------- */
  function resize(){
    var w = core.clientWidth, h = core.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.92 ? 33 : 30;
    camera.updateProjectionMatrix();
  }
  if("ResizeObserver" in window){ new ResizeObserver(resize).observe(core); }
  window.addEventListener("resize", resize);
  resize();

  /* ---------------- loop ---------------- */
  var visible = true;
  if("IntersectionObserver" in window){
    new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }, {threshold:0}).observe(core);
  }

  var last = performance.now(), t0 = last;
  canvas.classList.add("live");
  if(poster) poster.classList.add("off");

  function frame(now){
    requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    if(!visible || document.hidden) return;
    var time = (now - t0) / 1000;

    // idle drift takes over when the pointer rests, and always on touch
    var tx = px, ty = py;
    if(isTouch || now - lastMove > 2600 || reduce){
      var k = reduce ? 0.35 : 1;
      tx = (Math.sin(time * 0.33) * 0.44 + Math.sin(time * 0.19 + 1.1) * 0.2) * k;
      ty = (Math.sin(time * 0.25 + 1.4) * 0.32) * k;
    }

    sHeadX.t = tx; sHeadY.t = ty;
    sCamX.t = tx;  sCamY.t = ty;
    sSway.t = Math.max(-0.7, Math.min(0.7, (prevPx - tx) * 5.2));
    prevPx = tx;

    sHeadX.step(dt); sHeadY.step(dt); sCamX.step(dt); sCamY.step(dt); sSway.step(dt); sPress.step(dt);

    // the gaze: hat and head yaw toward the cursor, clamped and heavy
    head.rotation.y = sHeadX.v * 0.34;
    head.rotation.x = sHeadY.v * 0.17 + sPress.v * 0.11;
    head.rotation.z = -sHeadX.v * 0.06;
    // the body follows late — a third of the turn, one spring behind
    torso.rotation.y = sHeadX.v * 0.12;
    torso.rotation.z = -sHeadX.v * 0.028;
    figure.position.y = -sPress.v * 0.045;

    // camera parallax; the moon lags to sit further away
    camera.position.x = -sCamX.v * 0.95;
    camera.position.y = 0.55 - sCamY.v * 0.5;
    camera.lookAt(0, 0.34, 0);
    moon.position.x = -sCamX.v * 0.5;
    moon.position.y = -sCamY.v * 0.22;

    var breath = Math.sin(time * 0.62) * 0.5 + 0.5;
    var glint = 0.5 + sHeadX.v * 0.36;

    // ease the palette across a theme change
    var f = 1 - Math.exp(-2.6 * dt);
    ["deep","mid","pale","rim","disc","stone","straw"].forEach(function(k){ cur[k].lerp(tgtP[k], f); });
    curGlow += (tgtGlow - curGlow) * f;

    for(var i = 0; i < mats.length; i++){
      var u = mats[i].uniforms;
      u.uTime.value = time;
      u.uSway.value = sSway.v;
      u.uBreath.value = breath;
      u.uPress.value = sPress.v;
      u.uGlint.value = glint;
      if(mats[i].userData.tint === "stone"){
        u.uDeep.value.copy(cur.stone).multiplyScalar(0.62);
        u.uMid.value.copy(cur.stone);
        u.uPale.value.copy(cur.stone).lerp(cur.rim, 0.34);
      } else if(mats[i].userData.tint === "straw"){
        u.uDeep.value.copy(cur.straw).multiplyScalar(0.4);
        u.uMid.value.copy(cur.straw);
        u.uPale.value.copy(cur.straw).lerp(cur.rim, 0.5);
      } else {
        u.uDeep.value.copy(cur.deep);
        u.uMid.value.copy(cur.mid);
        u.uPale.value.copy(cur.pale);
      }
      u.uRim.value.copy(cur.rim);
    }
    discMat.color.copy(cur.disc);
    glowMat.uniforms.uCol.value.copy(cur.disc);
    glowMat.uniforms.uAmt.value = curGlow;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
