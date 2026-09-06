# MUSŌ 無双

A front page for a luxury clothing house that does not exist — a Kyoto atelier
that dyes in natural indigo and stitches by hand. The centrepiece is a seated
rōnin, built in WebGL, who watches your cursor.

**This was made for fun.** MUSŌ is not a real brand, nothing here is for sale,
and none of it is affiliated with any company. The prices, the vat temperatures
and the stockist cities are invented. It exists because the idea of a masterless
swordsman selling coats was too good to leave alone.

> Live:https://muso-eta.vercel.app/

---

## The interesting part: the rōnin is not a model file

There is no `.glb` in this repo. The figure is generated in the browser at load
time from lathe profiles and a crease function, then shaded with a custom GLSL
material — three posterised bands plus a fresnel rim, and no three.js lights in
the scene at all, so the art direction is exact rather than negotiated with a
renderer.

Because it is a rig rather than a single welded mesh, the parts can move
independently. Cursor response runs on damped springs:

| Input | Response |
|---|---|
| Cursor position | Hat and head yaw toward you, clamped and heavy |
| — | Torso follows at a third of the turn, one spring behind |
| Cursor **velocity** | Robe hem shears sideways, then springs back |
| — | Camera and moon parallax against each other |
| Mouse down | The figure takes weight and dips |
| Cursor at rest 2.6 s | An idle drift takes over, so it never freezes |
| Touch device | Idle drift runs permanently |

## The entrance

The site opens on a shoji screen (障子) that slides apart when you click it —
kumiko lattice over washi, wooden kamachi frames, recessed hikite finger pulls,
and light from the room beyond growing as the doors part.

Everyone crosses the threshold, however they arrived. A deep link like
`/#atelier` is remembered rather than used to skip the doors — the page is
pinned to the top while they are shut (against both a reload restoring the old
scroll position and the browser jumping to the fragment), and the section is
scrolled to and focused once they open.

It is crossed once per browser session, and it is `display:none` in CSS until
`gate.js` raises it — so a visitor without JavaScript is never shut out of the
site. On the keyboard, focus opens on the door, Enter/Space/Escape crosses it,
and Tab is held so focus cannot wander behind the screen.

## Other traditional elements

Placed where they carry meaning rather than as decoration:

| Motif | Where | Why there |
|---|---|---|
| **Seigaiha** 青海波 | Aizome section | Literally "blue sea waves" — indigo |
| **Kumiko** 組子 | Section dividers | Echoes the joinery of the entrance |
| **Mon** 家紋 | Gate, nav, footer | A kasa over the horizon — the house crest |
| **Kanji numerals** 一二三四 | Atelier sequence, menu | The steps are an ordered sequence |

## Other things worth a look

- **Day / night (昼 / 夜)** is not a dark-mode afterthought. Switching relights
  the 3D scene, turns the moon into the light source, and warms the straw down.
  The palette is eased across the change rather than swapped.
- **Product cards hold two records of one garment** — a photograph at rest, and
  the atelier's technical flat on hover. Hover alone would hide the flats from
  keyboard and touch users, so the frame is a real `<button>` with `aria-pressed`.
- **The aizome ladder** is the actual traditional dip-count progression, from
  甕覗 (kamenozoki, 1 dip) to 褐色 (kachi-iro, 60).
- Everything respects `prefers-reduced-motion`, and the page renders without
  JavaScript — reveals are only armed once JS is present.

## Running it

No build step, no dependencies. It is static files.

```bash
npx --yes serve .
```

Then open the printed URL. Opening `index.html` directly from the filesystem
mostly works, but a server is better — some browsers restrict WebGL and font
loading on `file://`.

## Structure

```
index.html              markup only
assets/
  css/muso.css          tokens, layout, both themes, traditional motifs
  js/gate.js            the shoji entrance — loads first, ahead of three.js
  js/muso.js            theme, nav, reveals, and the WebGL rōnin
  img/                  photography (see credits)
  favicon.svg           the kasa brim eclipsing the moon
vercel.json             cache headers for static assets
```

`three.js` is loaded from a CDN, pinned to r128. There is nothing to install.

## Deploying

Vercel needs no configuration for this — it is a static site with no build
command. Import the repository at [vercel.com/new](https://vercel.com/new),
leave the framework preset as **Other**, and deploy. Every push to `main`
redeploys automatically.

## Credits

- Photography from [Unsplash](https://unsplash.com), used under the Unsplash
  License. Attribution is not required by that license; if you take this
  further, adding per-photographer credits is the decent thing to do.
- [three.js](https://threejs.org) (MIT) for the WebGL rig.
- Type: **Bodoni Moda**, **Shippori Mincho** and **Zen Kaku Gothic New**, all
  from Google Fonts under the SIL Open Font License.
- The rōnin's pose, the straw kasa and the bone moon come from a reference
  illustration; the geometry here is an interpretation, not a reconstruction.

## A note on licensing

No `LICENSE` file is included on purpose — the code and the photography sit
under different terms. The code is yours to license however you like; the images
remain under the Unsplash License regardless of what you choose.
