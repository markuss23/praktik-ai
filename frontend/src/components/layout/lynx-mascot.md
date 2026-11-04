# PraktikAI lynx mascot — character sheet & pose prompt

**How to use:** paste this whole file into a new chat, fill in the **New pose**
block at the very bottom, and send. The AI returns the same lynx in the new
pose as a React/SVG component (or a plain SVG, or an image prompt — see §8).

The canonical drawing is [`LynxMascot.tsx`](./LynxMascot.tsx); its full source
is embedded in §9, so this file works even in a chat that cannot see the repo.
If `LynxMascot.tsx` ever changes, replace §9 with the new source.

Poses already in the repo (reuse their arms for similar gestures):
[`LynxMascot`](./LynxMascot.tsx) — waving, home hero ·
[`LynxMascotSearching`](./LynxMascotSearching.tsx) — shrug with open palm +
magnifying glass in a fist, 404 page ·
[`LynxMascotUnplugged`](./LynxMascotUnplugged.tsx) — both fists in front
holding a pulled-apart plug and socket, "oops" open mouth, server error page.

---

## 0. Instructions for the AI — read before drawing

You are re-posing **one fixed character**. You are not designing a lynx.

1. **The head is locked.** Copy every head layer from §9 verbatim — same paths,
   same coordinates, same colours. The only allowed change to the head is one
   wrapping transform for the whole head (tilt/move, see §6.1) and the optional
   expression swaps in §6.2. Never redraw, reshape, widen or "improve" the head.
2. **The body is re-posed, not redesigned.** Arms, legs and tail may get new
   paths for the new pose, built exactly as described in §6 with the sizes in
   §4. Clothing, colours and details stay as in §1.
3. **Palette is closed.** Use only the colours in §2. No gradients, filters,
   masks, clip paths, blur, text or raster images.
4. **Outlines are darker shades of their fill, never black** (except glasses,
   eyelids, ear tips/tufts and tail tip). See §3.
5. **Keep the scale.** viewBox stays `0 0 360 560`; if the pose truly needs
   more room, widen/heighten the viewBox, but never scale the character.
6. Run the checklist in §7 before answering.

---

## 1. Identity — what must never change

**Overall:** anthropomorphic Eurasian lynx, friendly educator. Flat 2D vector,
cute big-head proportions (head ≈ 45 % of total height), front-facing, standing.

**Head**
- Large pointed ears that form the upper sides of the head; pink-brown inner
  ear with three cream fur "flames"; black ear tips; long black three-strand
  tufts fanning up and outward.
- Narrow forehead arc between the ears; one teardrop spot in the middle of the
  forehead, two oval spots and two small spots around it, two spots on each cheek.
- Soft tan eyebrow dashes above the glasses.
- Thin round black glasses (two circles, slightly arched bridge, temple arms
  running to the edge of the head).
- Almond eyes: cream whites, large dark-brown irises looking slightly toward
  the nose, white highlight upper-left, thick upper eyelid with a small outward
  flick, thin lower lid; a light golden patch around each eye.
- Darker golden stripe on the nose bridge between the lenses.
- Broad, rounded pink-brown nose; closed "w" cat smile with corners up; a short
  line from nose to mouth.
- Two long thin whiskers and two dots on each side of the muzzle.
- **Slim face:** the side runs almost straight down from the ear, then
  **three small sharp cheek tufts per side**, overlapping like shingles (top
  two golden, lowest cream), then a short jaw into a **small golden chin** under
  a U-shaped cream line. **No tufts beside the chin, no neck visible.**
- Cream muzzle and lower cheeks. The gold→cream edge is jagged fur with
  **no outline**, so the colours blend.

**Body**
- One-colour **berry-rose blazer**; darker berry lapels, cuffs and waistband band.
- White shirt with pointed collar, bright **orange tie**, orange triangular pocket
  square on the viewer's right chest above a dark welt line, two orange pocket
  flaps, three dark berry buttons just right of the centre line.
- **No trousers:** golden spotted legs, cream belly patch under the jacket hem,
  big rounded feet with three toe lines each.
- Mitten paws with two finger lines and a thumb bump. An open (palm-forward)
  paw shows a pink palm pad and three small pink finger pads.
- Long golden spotted tail with a black tip, coming from behind the right hip.
- Soft grey ground-shadow ellipse under the feet.

---

## 2. Palette — exact values

| Name (constant) | Hex | Used for |
|---|---|---|
| `FUR` | `#E9B860` | fur: head, legs, feet, paws, tail |
| `FUR_LINE` | `#8A5524` | outline of all fur shapes, toe/finger lines |
| `SPOT` | `#C98B3C` | spots, forehead teardrop |
| `CREAM` | `#FBEBC8` | muzzle/lower cheeks, belly patch, ear flames |
| `INK` | `#2A1A10` | glasses, eyelids, ear tips + tufts, tail tip |
| `EAR_INNER` | `#D9A08A` | inner ear |
| `BERRY` | `#B1475C` | blazer body and sleeves |
| `BERRY_DARK` | `#9A3B50` | lapels, cuffs, waistband band |
| `BERRY_LINE` | `#78293B` | blazer outlines, buttons, pocket welt |
| `ORANGE` | `#F87B1B` | tie, pocket square, pocket flaps |
| `ORANGE_LINE` | `#C4570A` | orange outlines |
| `SHIRT` | `#FFFDF7` | shirt and collar |
| `SHIRT_LINE` | `#C9B48A` | shirt outlines |

Literal colours inside the head/paws:

| Hex | Used for |
|---|---|
| `#F7DFAE` | light patch around the eyes |
| `#F6ECD6` | eye whites |
| `#2E1C10` | irises |
| `#FFFFFF` | eye highlights |
| `#5A3415` | lower eyelid, nose outline |
| `#D4907A` | nose fill |
| `#3D2310` | mouth, whiskers, whisker dots |
| `#C27E35` | eyebrows |
| `#D99A48` @ opacity 0.55 | nose-bridge stripe |
| `#EE9A97` | paw pads |
| `#000000` @ opacity 0.14 | ground shadow |

Expression extras (only with §6.2): `#5A2730` open mouth, `#E8808C` tongue.

A **prop** the pose asks for (book, laptop, pointer…) may also use the brand
green `#59AC77` with outline `#468F61`; otherwise reuse the colours above.

---

## 3. Line rules

- Every stroke: `strokeLinejoin="round"`, `strokeLinecap="round"` (the
  `stroke(color, width)` helper in §9 does this).
- Outline colour = darker shade of the fill's family: fur → `FUR_LINE`,
  blazer → `BERRY_LINE`, orange → `ORANGE_LINE`, shirt → `SHIRT_LINE`.
- Widths: fur/blazer outlines **2.6**, lapels/cuffs/shirt **2.2**, toe lines
  **2.2**, finger lines **2**, tie/pocket square **2**, pocket flaps **1.8**,
  inner ear **1.8**, glasses **3.8**, upper eyelid **3.4**, lower eyelid **1.6**,
  mouth **3**, nose **2.6**, whiskers **1.6**, eyebrows **5.5**.
- Colour changes inside one surface (gold→cream on the face, belly patch,
  ear flames, spots) have **no outline**.
- When a cream area covers a fur outline, re-stroke only the outer silhouette
  on top (the reference does this with separate stroke-only paths).

---

## 4. Canvas & proportions

viewBox `0 0 360 560`, character centred on **x = 180**, `overflow="visible"`.

| Landmark | Coordinates |
|---|---|
| Ear-tuft tips | y ≈ 6 |
| Ear tips | (96, 47) · (264, 47) |
| Top of head (forehead) | y = 89 |
| Eyebrows | y ≈ 122–127 |
| Glasses | circles r 27 at (138.5, 163) · (221.5, 163) |
| Nose | x 165–195, y 186–204 |
| Mouth | x 147–213, y 206–217 |
| Cheek tuft tips | (78, 190) (83, 213) (103, 233) · mirror (282, 190) (277, 213) (257, 233) |
| Chin bottom | (180, 259) |
| Shirt collar top | y = 244 |
| Blazer | x 96–264, y 244–423 (waistband 398–423) |
| Hanging sleeve (viewer left) | x 66–110, cuff y 372–390, paw y 389–421 |
| Waving arm | elbow pivot (292, 332); whole forearm tilted `rotate(10 292 332)` |
| Legs | x 120–240, y 410–498 |
| Feet | left x 106–178, right x 182–254, y 486–528 |
| Tail | root ≈ (228, 456), tip ≈ (348, 418) |
| Shadow | ellipse cx 182, cy 533, rx 98, ry 8 |

Sizes to reuse for new limbs: sleeve width ≈ 36–40, cuff ≈ 10–12 tall, closed
mitten paw ≈ 36 × 32, open paw ≈ 42 × 58 (with thumb), leg width ≈ 52, foot
≈ 72 × 42.

---

## 5. Layer order (back → front)

1. ground shadow
2. tail (`className="lynx-tail"`)
3. legs, belly patch, leg spots
4. feet, toe lines
5. blazer body (two halves), lapels, waistband band
6. shirt V, tie knot + blade, collar points
7. pocket square + welt, pocket flaps, buttons
8. arms — for each arm: sleeve → cuff → paw → finger lines (a prop goes between
   cuff and paw so the paw holds it in front). A bent arm draws the forearm
   group first and the upper arm on top, so the elbow joint is hidden.
9. **HEAD BLOCK** — everything from `{/* Hlava: …` to the end of the `<svg>`
   in §9 (silhouette, ears, tufts, spots, nose stripe, cream face, re-strokes,
   eye patches, eyes, glasses, eyebrows, nose, mouth, whiskers).

---

## 6. How to re-pose

### 6.1 Head
- Copy the HEAD BLOCK verbatim.
- To tilt or nod, wrap the whole block in one group:
  `<g transform="rotate(DEG 180 230)">…</g>` — pivot under the chin, max ±12°.
  To move it (crouching, jumping), add `translate(dx dy)` to that same group.
- The head always faces the viewer. If the pose implies a side or 3/4 view,
  keep the front-facing head and turn only the body/limbs.

### 6.2 Expressions (only if the pose asks for one)
- **Default:** as in §9.
- **Closed happy eyes:** replace the contents of the `lynx-blink` group with
  ```tsx
  <path d="M121 166 Q140 148 159 166" {...stroke(INK, 3.4)} />
  <path d="M201 166 Q220 148 239 166" {...stroke(INK, 3.4)} />
  ```
- **Wink (viewer-right eye closed):** keep the first six children of the
  `lynx-blink` group (left eye) and replace the right-eye six with
  `<path d="M201 166 Q220 148 239 166" {...stroke(INK, 3.4)} />`.
- **Open-mouth smile:** insert just before the mouth path that starts
  `M180 204 L180 210`:
  ```tsx
  <path d="M161 214 C165 232 195 232 199 214 C191 218 169 218 161 214 Z" fill="#5A2730" {...stroke('#3D2310', 2.4)} />
  <path d="M168 223 C173 219 187 219 192 223 C187 229 173 229 168 223 Z" fill="#E8808C" />
  ```

### 6.3 Arms and paws
- Each arm = upper sleeve + forearm sleeve (`BERRY`, outline `BERRY_LINE`) →
  cuff (`BERRY_DARK`) → paw (`FUR`, outline `FUR_LINE`).
- Hanging arm: reuse the viewer-left arm from §9 (sleeve, cuff, paw, finger lines).
- Waving / raised arm: reuse the viewer-right `rotate(10 292 332)` group and
  the upper-arm path after it; change only the angle if needed.
- Other gestures (pointing, holding, thumbs-up, hands on hips…): draw new sleeve
  paths in the same width, keep a cuff at every wrist, and build paws from the
  two existing paw shapes (closed mitten with two finger lines + thumb bump, or
  open palm with pink pads). A pointing paw = closed mitten plus one rounded
  finger of the same outline.
- Raised paws must not overlap the cheek tufts (keep ≥ 6 units clear of the
  head silhouette).

### 6.4 Legs, feet, tail
- Legs start under the waistband (hip line y ≈ 410, always hidden by the hem).
  For walking/running/sitting draw new leg paths with the same width, leg spots
  and the same foot shape (oval with three toe lines).
- The tail is always present, attached behind the viewer-right hip; its curve
  may change, black tip ≈ last quarter, 3–4 spots.
- Move the ground shadow under whatever touches the ground; drop it for jumps
  (or shrink it).

### 6.5 Clothing
- The blazer stays closed, one colour, symmetric around the body centre. If the
  torso leans, move lapels, shirt V, tie, pocket square, flaps and buttons with
  it as one group.
- No new clothing or accessories unless the pose description asks for them.

### 6.6 Animation hooks (optional)
CSS lives in `src/app/globals.css`; all of it stops under `prefers-reduced-motion`.
- `lynx-blink` on the eye group — keep it (drop it with closed eyes).
- `lynx-tail` on the tail group — keep it; the pivot is CSS
  `transform-origin: 228px 456px` (viewBox units). If the tail root moves,
  say so in the answer.
- `lynx-wave` only on a waving forearm, pivot `292px 332px`. Remove it for
  poses without a wave.

---

## 7. Output format & checklist

**Default output:** a new file `LynxMascot<PoseName>.tsx` exporting
`LynxMascot<PoseName>`, structured exactly like §9: same colour constants,
same `stroke()` helper, one `<svg>` with `viewBox`, `fill="none"`,
`aria-hidden`, `focusable="false"`, `overflow="visible"`, `{...props}`.
Short code comments in Czech, as in the reference. After the code, list in a
few bullets what differs from the reference (moved parts, new paths, expression).

If I ask for **plain SVG**: resolve the constants to hex, expand `stroke()` and
`fur` into `stroke`, `stroke-width`, `stroke-linejoin`, `stroke-linecap`
attributes, and drop `className` and React-only props.

**Checklist before answering**
- [ ] HEAD BLOCK identical to §9 (apart from one wrapping transform / §6.2 swap).
- [ ] Only §2 colours; outlines are the darker shade, black only where §3 allows.
- [ ] Stroke widths from §3, round joins and caps everywhere.
- [ ] Same scale; the figure is not squashed, stretched or re-proportioned.
- [ ] Blazer one berry colour with darker lapels/cuffs/band; orange tie, square,
      flaps; three buttons; no trousers; spotted legs; tail with black tip.
- [ ] Three sharp cheek tufts per side, slim face, golden chin, no chin tufts.
- [ ] Nothing new pokes out between the head and the shoulders.
- [ ] No gradients, filters, masks, clip paths, text or images.

---

## 8. Image-generator prompt (when an SVG is not needed)

Image generators will not match the vector exactly; use §9 for exact results.
For a quick raster, paste this and append the pose:

> Flat 2D vector mascot of an anthropomorphic Eurasian lynx teacher, cute
> big-head proportions, front-facing. Golden-tan fur (#E9B860) with small darker
> tan spots and a teardrop spot on the forehead. Large pointed ears forming the
> upper sides of the head, pink-brown inner ears with three cream fur flames,
> black ear tips with long black three-strand tufts. Slim face with a cream
> muzzle and lower cheeks that blend into the gold through jagged fur, three small
> sharp cheek tufts per side, small golden chin. Thin round black glasses, almond
> eyes with cream whites, large dark-brown irises looking slightly toward the
> nose, white highlights, thick upper eyelid with a small outward flick, soft tan
> eyebrow dashes. Broad pink-brown rounded nose, closed "w" cat smile, two long
> thin whiskers and two dots per side. Single-colour berry-rose blazer (#B1475C)
> with darker berry lapels, cuffs and waistband, white shirt collar, bright orange
> tie (#F87B1B), orange pocket square and two orange pocket flaps, three dark
> buttons. No trousers: golden spotted legs, cream belly patch, big rounded feet
> with toe lines, mitten paws, long spotted tail with a black tip. Smooth clean
> outlines in darker shades of each colour (brown around fur, dark berry around
> the blazer), minimal flat shading, no gradients, no text, plain white
> background. **Pose:** …

---

## 9. Reference source — `LynxMascot.tsx` (canonical, do not modify)

```tsx
import type { SVGProps } from 'react';

// Obrysy jsou vždy tmavší odstín výplně, ne jedna černá — měkčí,
// „kreslený" rukopis maskota.
const FUR = '#E9B860';
const FUR_LINE = '#8A5524';
const SPOT = '#C98B3C';
const CREAM = '#FBEBC8';
const INK = '#2A1A10';
const EAR_INNER = '#D9A08A';

const BERRY = '#B1475C';
const BERRY_DARK = '#9A3B50';
const BERRY_LINE = '#78293B';
const ORANGE = '#F87B1B';
const ORANGE_LINE = '#C4570A';
const SHIRT = '#FFFDF7';
const SHIRT_LINE = '#C9B48A';

const stroke = (color: string, width = 2.6) =>
  ({
    stroke: color,
    strokeWidth: width,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  }) as const;

const fur = stroke(FUR_LINE);

/**
 * Maskot PraktikAI — rys v obleku, plochá vektorová ilustrace.
 *
 * Čistě dekorativní: význam nese text vedle něj, proto `aria-hidden`.
 * Mávání (`.lynx-wave`), mrkání (`.lynx-blink`) a švihání ocasem
 * (`.lynx-tail`) jsou CSS animace v `globals.css`; při
 * `prefers-reduced-motion` stojí.
 */
export function LynxMascot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 360 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      overflow="visible"
      {...props}
    >
      {/* Stín pod nohama */}
      <ellipse cx="182" cy="533" rx="98" ry="8" fill="#000" opacity="0.14" />

      {/* Ocas s černou špičkou — švihá kolem kořene */}
      <g className="lynx-tail">
        <path
          d="M224 470 C252 486 300 482 326 462 C342 450 352 432 348 418 C346 406 332 404 326 414 C318 432 300 448 276 452 C256 455 240 450 228 444 Z"
          fill={FUR}
          {...fur}
        />
        <path
          d="M318 437 C322 429 323 420 326 414 C332 404 346 406 348 418 C352 432 344 448 333 458 C330 450 326 442 318 437 Z"
          fill={INK}
          {...stroke(INK, 2)}
        />
        <g fill={SPOT}>
          <ellipse cx="258" cy="466" rx="4" ry="3" />
          <ellipse cx="282" cy="467" rx="4.5" ry="3.2" />
          <ellipse cx="302" cy="456" rx="4" ry="3" />
          <ellipse cx="270" cy="458" rx="2.6" ry="2" />
        </g>
      </g>

      {/* Nohy — bez kalhot, srst s puntíky a krémové bříško */}
      <path
        d="M120 410 L240 410 C242 440 240 470 236 498 L188 498 C186 472 184 454 180 448 C176 454 174 472 172 498 L124 498 C120 470 118 440 120 410 Z"
        fill={FUR}
        {...fur}
      />
      <path d="M138 411 C142 432 160 444 180 444 C200 444 218 432 222 411 Z" fill={CREAM} />
      <g fill={SPOT}>
        <ellipse cx="134" cy="440" rx="4" ry="3" />
        <ellipse cx="150" cy="462" rx="4.4" ry="3.2" />
        <ellipse cx="136" cy="478" rx="3.4" ry="2.6" />
        <ellipse cx="160" cy="484" rx="2.6" ry="2" />
        <ellipse cx="226" cy="440" rx="4" ry="3" />
        <ellipse cx="210" cy="462" rx="4.4" ry="3.2" />
        <ellipse cx="224" cy="478" rx="3.4" ry="2.6" />
        <ellipse cx="200" cy="484" rx="2.6" ry="2" />
      </g>

      {/* Tlapky */}
      <path
        d="M106 512 C104 494 124 486 142 486 C160 486 178 492 178 510 C178 524 164 528 142 528 C120 528 106 524 106 512 Z"
        fill={FUR}
        {...fur}
      />
      <path
        d="M254 512 C256 494 236 486 218 486 C200 486 182 492 182 510 C182 524 196 528 218 528 C240 528 254 524 254 512 Z"
        fill={FUR}
        {...fur}
      />
      <path
        d="M127 515 L128 527 M141 515 L141 528 M155 515 L154 527 M233 515 L232 527 M219 515 L219 528 M205 515 L206 527"
        {...stroke(FUR_LINE, 2.2)}
      />

      {/* Sako — celé vínové */}
      <path
        d="M180 250 L180 422 L108 422 C100 422 96 416 96 408 L96 286 C96 264 112 250 134 246 L154 244 Z"
        fill={BERRY}
        {...stroke(BERRY_LINE)}
      />
      <path
        d="M180 250 L206 244 L226 246 C248 250 264 264 264 286 L264 408 C264 416 260 422 252 422 L180 422 Z"
        fill={BERRY}
        {...stroke(BERRY_LINE)}
      />
      {/* Klopa vlevo */}
      <path d="M154 244 L140 252 L168 332 L180 346 L180 340 Z" fill={BERRY_DARK} {...stroke(BERRY_LINE, 2.2)} />
      <path d="M206 244 L220 252 L192 332 L180 346 L180 340 Z" fill={BERRY_DARK} {...stroke(BERRY_LINE, 2.2)} />
      {/* Pás dole */}
      <path
        d="M96 398 L264 398 L264 408 C264 416 260 423 251 423 L109 423 C100 423 96 416 96 408 Z"
        fill={BERRY_DARK}
        {...stroke(BERRY_LINE)}
      />

      {/* Košile, límeček, kravata */}
      <path d="M154 244 L206 244 L180 340 Z" fill={SHIRT} {...stroke(SHIRT_LINE, 2.2)} />
      <path d="M172 276 L188 276 L185 288 L175 288 Z" fill={ORANGE} {...stroke(ORANGE_LINE, 2)} />
      <path d="M175 288 L185 288 L192 326 L180 340 L168 326 Z" fill={ORANGE} {...stroke(ORANGE_LINE, 2)} />
      <path d="M155 244 L178 264 L166 280 L148 258 Z" fill={SHIRT} {...stroke(SHIRT_LINE, 2.2)} />
      <path d="M205 244 L182 264 L194 280 L212 258 Z" fill={SHIRT} {...stroke(SHIRT_LINE, 2.2)} />

      {/* Kapesníček, kapsy, knoflíky */}
      <path d="M212 318 L221 305 L231 318 Z" fill={ORANGE} {...stroke(ORANGE_LINE, 2)} />
      <path d="M207 319 L236 319" {...stroke(BERRY_LINE, 2.4)} />
      <rect x="117" y="369" width="37" height="7" rx="2" fill={ORANGE} {...stroke(ORANGE_LINE, 1.8)} />
      <rect x="206" y="369" width="37" height="7" rx="2" fill={ORANGE} {...stroke(ORANGE_LINE, 1.8)} />
      <g fill={BERRY_LINE}>
        <circle cx="192" cy="346" r="3.4" />
        <circle cx="192" cy="366" r="3.4" />
        <circle cx="192" cy="386" r="3.4" />
      </g>

      {/* Rukávy s manžetami a tlapky */}
      <path
        d="M110 254 C86 258 72 278 70 306 L66 378 C66 382 70 384 74 384 L100 386 C104 386 106 383 106 379 L110 300 Z"
        fill={BERRY}
        {...stroke(BERRY_LINE)}
      />
      <path
        d="M66 372 L106 374 L106 384 C106 388 103 390 99 390 L72 388 C68 388 65 385 65 381 Z"
        fill={BERRY_DARK}
        {...stroke(BERRY_LINE, 2.2)}
      />
      <path
        d="M70 389 C66 399 66 412 76 418 C84 422 96 421 102 414 C106 408 106 399 104 389 Z"
        fill={FUR}
        {...fur}
      />
      <path d="M81 410 L82 419 M91 410 L91 420 M102 398 C109 400 109 409 103 411" {...stroke(FUR_LINE, 2)} />

      {/* Pravá paže mává: rameno → loket, předloktí s tlapkou se otáčí kolem lokte.
          Vnější skupina ho v klidu vyklopí ven, aby tlapka nevjela do hřívy;
          CSS animace (transform) jede na vnitřní a s atributem se nepere. */}
      <g transform="rotate(10 292 332)">
        <g className="lynx-wave">
          <path
            d="M276 330 L296 258 C298 249 306 244 315 246 C324 248 329 256 327 265 L308 336 Z"
            fill={BERRY}
            {...stroke(BERRY_LINE)}
          />
          <path
            d="M293 271 L324 279 L327 265 C329 256 324 248 315 246 C306 244 298 249 296 258 Z"
            fill={BERRY_DARK}
            {...stroke(BERRY_LINE, 2.2)}
          />
          <ellipse cx="297" cy="235" rx="6" ry="8.5" transform="rotate(-28 297 235)" fill={FUR} {...fur} />
          <path
            d="M302 251 C296 242 294 230 297 220 C296 210 302 204 308 206 C310 199 319 198 322 203 C327 199 335 203 334 211 C338 220 337 238 330 249 C322 255 308 256 302 251 Z"
            fill={FUR}
            {...fur}
          />
          <path d="M308 206 L309 214 M322 203 L321 212" {...stroke(FUR_LINE, 2)} />
          <g fill="#EE9A97">
            <ellipse cx="317" cy="234" rx="8.5" ry="7" />
            <circle cx="304" cy="213" r="2.4" />
            <circle cx="315" cy="208" r="2.4" />
            <circle cx="327" cy="212" r="2.4" />
          </g>
        </g>
      </g>
      <path
        d="M250 254 C272 258 286 274 294 296 L304 320 C309 334 300 346 288 346 C278 346 272 340 268 332 L252 300 Z"
        fill={BERRY}
        {...stroke(BERRY_LINE)}
      />

      {/* Hlava: velké uši tvoří boky hlavy, po stranách hříva srsti, zlatá brada */}
      <path
        d="M180 89 C194 89 205 91 214.5 95 C232 80 250 60 264 47 C276 62 278 92 270 120 C266 130 265 140 267 148 Q271 162 272 172 Q276 180 282 190 Q277 188 272 187 Q277 201 277 213 Q272 210 266 207 Q265 221 257 233 Q254 228 248 225 C244 238 224 247 208 248 C201 255 191 259 180 259 C169 259 159 255 152 248 C136 247 116 238 112 225 Q106 228 103 233 Q95 221 94 207 Q88 210 83 213 Q83 201 88 187 Q83 188 78 190 Q84 180 88 172 Q89 162 93 148 C95 140 94 130 90 120 C82 92 84 62 96 47 C110 60 128 80 145.5 95 C155 91 166 89 180 89 Z"
        fill={FUR}
        {...fur}
      />

      {/* Uši: růžový vnitřek, bílé plaménky srsti, tmavá špička a chomáčky */}
      <path d="M90 76 L97 124 L130 103 Z" fill={EAR_INNER} {...stroke(FUR_LINE, 1.8)} />
      <path
        d="M104 122 C100 110 98 98 97 86 C103 96 108 104 112 110 C109 102 107 96 106 88 C112 97 117 104 121 108 C119 103 117 99 116 94 C121 99 125 102 129 105 Z"
        fill={CREAM}
      />
      <path d="M270 76 L263 124 L230 103 Z" fill={EAR_INNER} {...stroke(FUR_LINE, 1.8)} />
      <path
        d="M256 122 C260 110 262 98 263 86 C257 96 252 104 248 110 C251 102 253 96 254 88 C248 97 243 104 239 108 C241 103 243 99 244 94 C239 99 235 102 231 105 Z"
        fill={CREAM}
      />
      <g fill={INK}>
        <path d="M96 47 C89 56 86 68 85.6 80 Q101 71 115.4 66 C109 59 103 53 96 47 Z" />
        <path d="M90 52 C85 34 80 18 73.5 6.5 C86 18 96 32 102 48 Z" />
        <path d="M96 47 C93 36 90 26 87 17 C97 26 102 36 104 50 Z" />
        <path d="M88 58 C81 46 75 36 68.4 29 C79 34 89 42 97 52 Z" />
        <path d="M264 47 C271 56 274 68 274.4 80 Q259 71 244.6 66 C251 59 257 53 264 47 Z" />
        <path d="M270 52 C275 34 280 18 286.5 6.5 C274 18 264 32 258 48 Z" />
        <path d="M264 47 C267 36 270 26 273 17 C263 26 258 36 256 50 Z" />
        <path d="M272 58 C279 46 285 36 291.6 29 C281 34 271 42 263 52 Z" />
      </g>

      {/* Puntíky: kapka na čele, menší skvrny okolo a na lících */}
      <g fill={SPOT}>
        <path d="M174 98 Q180 95 186 98 Q184 110 180 120 Q176 110 174 98 Z" />
        <ellipse cx="160.5" cy="104" rx="3.6" ry="2.4" transform="rotate(-25 160.5 104)" />
        <ellipse cx="199.5" cy="104" rx="3.6" ry="2.4" transform="rotate(25 199.5 104)" />
        <ellipse cx="165" cy="118" rx="2.2" ry="3" />
        <ellipse cx="195" cy="118" rx="2.2" ry="3" />
        <ellipse cx="102" cy="173" rx="4" ry="3" />
        <ellipse cx="106.5" cy="190" rx="3.4" ry="2.6" />
        <ellipse cx="258" cy="173" rx="4" ry="3" />
        <ellipse cx="253.5" cy="190" rx="3.4" ry="2.6" />
      </g>

      {/* Tmavší hřbet nosu mezi skly */}
      <path d="M173 168 Q180 165 187 168 L190 188 L170 188 Z" fill="#D99A48" opacity="0.55" />

      {/* Krémový čenich a spodní líce. Horní hrana je zubatá srst bez obrysu,
          zlatá tak do krémové přechází plynule. Na každé straně 3 ostré
          chomáče: 1–2 zlaté, 3 krémový; čelist pak jde rovnou do zlaté brady. */}
      <path d="M180 186 C186 186 192 188 196 192 C199 195 204 196 210 196 Q216 198 219 204 Q222 199 228 199 Q234 201 238 208 Q242 202 248 202 Q253 204 256 210 Q261 206 266 207 Q265 221 257 233 Q254 228 248 225 C244 238 224 247 208 248 Q203 242 202 230 C196 237 189 240 180 240 C171 240 164 237 158 230 Q157 242 152 248 C136 247 116 238 112 225 Q106 228 103 233 Q95 221 94 207 Q99 206 104 210 Q107 204 112 202 Q118 202 122 208 Q126 201 132 199 Q138 199 141 204 Q144 198 150 196 C156 196 161 195 164 192 C168 188 174 186 180 186 Z" fill={CREAM} />
      {/* Obrys znovu přes krémovou — jen vnější hrana hlavy, brada a cípy. */}
      <path d="M267 148 Q271 162 272 172 Q276 180 282 190 Q277 188 272 187 Q277 201 277 213 Q272 210 266 207 Q265 221 257 233 Q254 228 248 225 C244 238 224 247 208 248" {...fur} />
      <path
        d="M208 248 Q203 242 202 230 C196 237 189 240 180 240 C171 240 164 237 158 230 Q157 242 152 248"
        {...fur}
      />
      <path d="M208 248 C201 255 191 259 180 259 C169 259 159 255 152 248" {...fur} />
      <path d="M152 248 C136 247 116 238 112 225 Q106 228 103 233 Q95 221 94 207 Q88 210 83 213 Q83 201 88 187 Q83 188 78 190 Q84 180 88 172 Q89 162 93 148" {...fur} />

      {/* Světlé okolí očí */}
      <ellipse cx="139" cy="164" rx="21" ry="17" fill="#F7DFAE" />
      <ellipse cx="221" cy="164" rx="21" ry="17" fill="#F7DFAE" />

      {/* Oči — mandlové, linka s „křidélkem", zorničky k nosu; mrkají */}
      <g className="lynx-blink">
        <path d="M120 158 C124 150 132 147 140 147 C150 147 157 152 159 160 C158 170 151 177 142 177 C131 177 122 168 120 158 Z" fill="#F6ECD6" />
        <circle cx="144" cy="163" r="9.5" fill="#2E1C10" />
        <circle cx="141.5" cy="159.5" r="2.8" fill="#fff" />
        <circle cx="146.5" cy="166.5" r="1.2" fill="#fff" />
        <path d="M121 161 C125 171 133 177 142 177 C151 177 157 170 159 161" {...stroke('#5A3415', 1.6)} />
        <path d="M118 157 C123 149 131 146 140 146 C150 146 157 151 159.5 159 M120 156 L114 152" {...stroke(INK, 3.4)} />

        <path d="M240 158 C236 150 228 147 220 147 C210 147 203 152 201 160 C202 170 209 177 218 177 C229 177 238 168 240 158 Z" fill="#F6ECD6" />
        <circle cx="216" cy="163" r="9.5" fill="#2E1C10" />
        <circle cx="213.5" cy="159.5" r="2.8" fill="#fff" />
        <circle cx="218.5" cy="166.5" r="1.2" fill="#fff" />
        <path d="M239 161 C235 171 227 177 218 177 C209 177 203 170 201 161" {...stroke('#5A3415', 1.6)} />
        <path d="M242 157 C237 149 229 146 220 146 C210 146 203 151 200.5 159 M240 156 L246 152" {...stroke(INK, 3.4)} />
      </g>

      {/* Kulaté brýle */}
      <g {...stroke(INK, 3.8)}>
        <circle cx="138.5" cy="163" r="27" />
        <circle cx="221.5" cy="163" r="27" />
        <path d="M165.5 161 Q180 157 194.5 161" />
        <path d="M112.4 156 L93 149 M247.6 156 L267 149" />
      </g>

      {/* Obočí — měkké hnědé čárky */}
      <path d="M132 126 Q140 122 149 124.5 M211 124.5 Q220 122 228 126" {...stroke('#C27E35', 5.5)} />

      {/* Nos, úsměv a vousky */}
      <path
        d="M165 192 C164 187 168 186 172 186.5 C176 187 184 187 188 186.5 C192 186 196 187 195 192 C194 197 186 202 180 204 C174 202 166 197 165 192 Z"
        fill="#D4907A"
        {...stroke('#5A3415', 2.6)}
      />
      <path
        d="M180 204 L180 210 M147 206 C151 213 158 217 166 217 C173 217 178 214 180 210 C182 214 187 217 194 217 C202 217 209 213 213 206"
        {...stroke('#3D2310', 3)}
      />
      <g {...stroke('#3D2310', 1.6)}>
        <path d="M154 198 Q132 197 109 202" />
        <path d="M155 204 Q135 207 117 217" />
        <path d="M206 198 Q228 197 251 202" />
        <path d="M205 204 Q225 207 243 217" />
      </g>
      <g fill="#3D2310">
        <circle cx="158" cy="200.5" r="1.5" />
        <circle cx="160.5" cy="206" r="1.5" />
        <circle cx="202" cy="200.5" r="1.5" />
        <circle cx="199.5" cy="206" r="1.5" />
      </g>
    </svg>
  );
}

export default LynxMascot;
```

---

## New pose — fill this in and send

```
POSE NAME:   (e.g. Pointing, Reading, Thinking, Celebrating)
DESCRIPTION: (what the body does — which paw where, legs, lean, head tilt)
PROPS:       none | (e.g. green book in the viewer-left paw)
EXPRESSION:  default | closed happy eyes | wink | open-mouth smile
ANIMATION:   keep blink + tail | add wave | none
OUTPUT:      React component (default) | plain SVG | image prompt
CANVAS:      360×560 (default) | (only if the pose needs more room)
```
