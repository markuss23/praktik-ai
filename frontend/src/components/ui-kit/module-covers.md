# Covery modulů — designový systém

Návod, jak nakreslit další cover do [`module-covers.tsx`](./module-covers.tsx),
aby zapadl do série. Cover má pevnou plochu — tónovaný podklad, dva kruhy
a blob uprostřed — a mění se jen **schéma v blobu**. Podle něj se modul pozná,
podle barvy obor.

Vizuálně je to stejný jazyk jako horní plocha onboardingu
([`onboarding.tsx`](./onboarding.tsx) — `OnboardingMedia` + `OnboardingIcon`),
jen místo ikony je v blobu malý diagram.

Živá ukázka: `/ui-kit` → sekce **Card — SVG covery modulů**.

---

## 1. Kánon — co platí vždy

| # | Pravidlo |
|---|---|
| 1 | Plátno je vždy `viewBox="0 0 590 226"`. Nic jiného. |
| 2 | Plochu (podklad, kruhy, blob, stín) kreslí `<CoverFrame>`. Motiv do ní nesahá. |
| 3 | Barva jde jen přes `--cover-tone` (Tailwind `fill-(--cover-tone)`), nikdy jako hex. |
| 4 | Schéma je **bílé** a vejde se do mřížky **±32** kolem středu blobu. |
| 5 | Zvýrazní se **jedna věc** — plně bílá; zbytek je `STROKE_SOFT` nebo obrys. |
| 6 | Tahy mají jen dvě síly: `W_MAIN` a `W_SOFT` (síť smí `W_SOFT − 1` na hrany). |
| 7 | Všechny konce a spoje jsou zakulacené (nastavuje `<CoverFrame>`). |
| 8 | Motiv je **schéma, ne ikona**. Kreslí se mechanismus, ne logo. |

Pravidlo 8 je to hlavní. Cover pro Git není logo Gitu — je to graf větví. Cover
pro AI není robot — je to síť s prosvícenou cestou.

---

## 2. Plocha

```
0                                                                    590
0 ┌────────────────────────────────────────────────────────────────────┐
  │                                              ╭──── obrys r=161 ────│
  │                         ╭──────╮            ╱  (509, 65)           │
113│                        │ BLOB │  ← 172×172, střed (295, 113)       │
  │╭── kruh r=145 ──╮       ╰──────╯                                    │
  ││   (81, 194)    │                                                   │
226└────────────────────────────────────────────────────────────────────┘
```

Vrstvy odspoda — všechno řeší `<CoverFrame>`:

| Vrstva | Jak | Proč |
|---|---|---|
| podklad | `fill-card` | ať pod nádechem neprosvítá `bg-muted` z `<CardImage>` |
| nádech | `fill-(--cover-tone)` × 12 % | = `bg-(--onboarding-tone)/12` |
| kruh vlevo dole | `fill-(--cover-tone)` × 12 %, r 145 | = `-bottom-14 -left-8 size-36` |
| obrys vpravo nahoře | `stroke-(--cover-tone)` × 25 %, r 161, tah 3 | = `-top-12 -right-10 size-40 border-2` |
| blob | `fill-(--cover-tone)` + `feDropShadow` | = `OnboardingIcon` se `shadow-md` |
| schéma | bílá, `scale(GLYPH_SCALE)` | to jediné, co se mezi motivy mění |

Rozměry kruhů jsou rozměry z `OnboardingMedia` přepočítané na výšku 226
(× ~2), takže cover a onboarding vypadají jako jedna rodina.

### Blob

Tvar je přepis `rounded-[62%_38%_51%_49%/44%_58%_42%_56%]` z `OnboardingIcon`
do SVG — čtyři eliptické oblouky, poloměry v `BLOB_RADII`. Když se tvar
dlaždice v onboardingu změní, změň `BLOB_RADII` taky.

Blob má `BLOB_SIZE = 172` (~76 % výšky plátna). V onboardingu je blob menší,
ale tam nese ikonu; schéma potřebuje víc místa.

Stín je SVG filtr, ne CSS `drop-shadow` — CSS filtry na prvcích uvnitř SVG
Safari nespolehlivě kreslí. Id filtru jde z `useId`, aby se víc coverů na
stránce nepralo o jeden `<filter>`.

---

## 3. Tóny

Tón nese **téma**. Příbuzné kurzy sdílí barvu, jiný obor dostane jinou —
podle barvy se má dát v seznamu poznat rodina.

| tone | token | hex | Obor |
|---|---|---|---|
| `purple` | `--gradient-r` | `#857AD2` | matematika, statistika, exaktní obory |
| `green` | `--primary` | `#59AC77` | AI, data, práce s modely |
| `blue` | `--tip` | `#383BF5` | vývoj, nástroje, verzování |
| `rose` | `--gradient-l` | `#B1475C` | *volné* |
| `orange` | `--brand-accent` | `#F87B1B` | *volné* |

Hexy jsou jen orientační — v kódu se sahá na token, takže se tmavý režim
přebarví sám.

### Přidání tónu

Do `COVER_TONES` přidej řádek, který nastaví `--cover-tone`:

```tsx
const COVER_TONES = {
  // …
  teal: "[--cover-tone:var(--chart-2)]",
} as const
```

- **Token musí být dost sytý, aby na něm držela bílá kresba.** Světlé tokeny
  (`--warning`, `--muted`) se na blob nehodí.
- Stejný tón přidej do `ONBOARDING_TONES` v `onboarding.tsx`, ať sedí obě
  rodiny.
- Do `COVER_TONE_ITEMS` v `app/ui-kit/page.tsx` přidej řádek, ať je tón vidět
  v ukázce.

---

## 4. Tahy a výplně

```tsx
const W_MAIN  = 5    // hlavní kresba — křivka, odbočka, obrys bubliny
const W_SOFT  = 3.5  // podružné — osy, řádky textu, obrys uzlu
const NODE_R  = 6    // uzel / commit / bod v grafu
const GLYPH_SCALE = (BLOB_SIZE * 0.54) / 64  // mřížka ±32 → ~54 % hrany blobu
```

Kresba je drobná, proto jsou tahy tučné jako u ikon — musí držet i při
šířce karty ~350 px (ve trojsloupcovém gridu).

| Barva | Kdy |
|---|---|
| `STROKE` = `#fff` | nosná kresba a **jedna** zvýrazněná věc |
| `STROKE_SOFT` = bílá 55 % | druhý plán — osy, nezvýrazněné sloupce, hrany |
| `fill-(--cover-tone)` | výplň běžného uzlu (aby pod ním neprosvítala linka) |

Čárkování jen pro „odvozené" čáry (odečet z grafu): `strokeDasharray="1 7"` —
s kulatými konci z toho jsou tečky.

---

## 5. Slovník tvarů

### Uzel / commit — `<CoverNode>`

```tsx
<CoverNode x={0} y={16} />        // běžný: výplň blobu, bílý obrys
<CoverNode x={30} y={16} lit />   // zvýrazněný: plně bílý
```

Obrys uzlu dej přes `<g strokeWidth={W_SOFT}>` kolem skupiny uzlů — s `W_MAIN`
uzly na malé kartě slévají.

### Sloupec

`<rect rx="3">` šířky 11, plná výplň (`STROKE_SOFT`, zvýrazněný `STROKE`).
Sloupce jsou jediné plné plochy kromě uzlů a jiskry.

### Pilulka / řádek textu

Čára `W_SOFT` ve `STROKE_SOFT`, různé délky (34 / 22) dělají „text".

### Jiskra — `sparklePath(cx, cy, r)`

Čtyřcípá hvězda, plně bílá. Max jedna na cover. Smí přesahovat mřížku ±32 —
vykukuje z rohu blobu.

---

## 6. Jak přidat nový motiv

Nové motivy bydlí **ve stejném souboru** — `CoverFrame` a `CoverNode` se ven
neexportují schválně, aby se série nerozutekla po repozitáři.

1. **Napiš si jednou větou, co se v modulu učí.** Ne název kurzu — ten
   mechanismus. („Data se seskupí a porovnají.")
2. **Najdi nejjednodušší schéma té věty.** Co by ses nakreslil na tabuli
   třemi tahy? Ve 64×64 se vejde jedna myšlenka, ne dvě.
3. **Rozhodni, co je ta jedna zvýrazněná věc** — ta bude plně bílá.
4. **Vyber tón** podle oboru (tabulka výš). Nový obor = nový tón.
5. **Nakresli to** podle šablony níž.
6. **Přidej do ukázky** — `COVER_MOTIFS` a `COVER_MOTIF_ITEMS` v
   `app/ui-kit/page.tsx` — a projdi checklist.

### Šablona

```tsx
/** Kroky schématu — souřadnice v mřížce ±32 kolem středu blobu. */
const TOPIC_STEPS = [-24, 0, 24]

/**
 * Téma modulu — co schéma ukazuje a co je zvýrazněné.
 */
function TopicCover(props: CoverProps) {
  return (
    <CoverFrame {...props}>
      <path d="M-30 0H30" stroke={STROKE_SOFT} strokeWidth={W_SOFT} />
      <g strokeWidth={W_SOFT}>
        {TOPIC_STEPS.map((x, i) => (
          <CoverNode key={x} x={x} y={0} lit={i === TOPIC_STEPS.length - 1} />
        ))}
      </g>
    </CoverFrame>
  )
}
```

Souřadnice: počátek je střed blobu, `y` roste dolů. Nakonec doplň export.

### Konvence v kódu

- Souřadnice, které spolu musí souhlasit, dej do konstanty (`GIT_MERGE_X`) —
  ne dvakrát do path stringu.
- Opakující se prvky generuj `.map()`em nad polem (viz `NET_LAYERS`,
  `STATS_BARS`).
- Komentář nad skupinou říká **co to je v realitě** („odbočka a merge zpět"),
  ne co dělá SVG.

---

## 7. Hotové motivy a zásobník

| Motiv | Schéma | Zvýrazněné | tone |
|---|---|---|---|
| `MathCover` | graf funkce v osách s odečtem | bod na křivce | `purple` |
| `StatsCover` | sloupcový graf | nejvyšší sloupec | `purple` |
| `AiCover` | neuronová síť 2–3–2 | prosvícená cesta | `green` |
| `PromptCover` | bublina s řádky promptu | jiskra odpovědi | `green` |
| `GitCover` | graf větví s mergem | merge commit | `blue` |

Návrhy na další:

| Modul | Schéma | Zvýrazněné | tone |
|---|---|---|---|
| Tabulky / Excel | mřížka 3×3 buněk | výsledná buňka | `purple` |
| Práce se zdroji | uzly s odkazy do středu | ověřený zdroj | `rose` |
| Prezentace | tři slidy za sebou | aktuální slide | `rose` |
| Kyberbezpečnost | zámek / štít s klíčovou dírkou | klíčová dírka | `blue` |
| Projektové řízení | tři sloupce kanbanu s kartičkami | hotová kartička | `orange` |
| Komunikace v týmu | dvě překrývající se bubliny | odpověď | `orange` |
| Jazyk / lingvistika | strom větného rozboru | kořen | `rose` |

Pravidlo pro tón: **nejdřív se podívej, jestli obor už tón má.** Druhý kurz
o AI musí být zelený, i kdyby se ti to esteticky nehodilo.

---

## 8. Kontrola před commitem

- [ ] Motiv nesahá na plochu — jen kreslí do `<CoverFrame>`.
- [ ] Žádný hex v atributu, barva jen přes `--cover-tone`.
- [ ] Zvýrazněná je **jedna** věc a je jasné, která.
- [ ] Běžné uzly mají výplň blobu — pod nimi nic neprosvítá.
- [ ] Schéma se vejde do ±32 (jiskra smí přesáhnout).
- [ ] Zmenši na ~240 px šířky: pozná se motiv? Když ne, je moc detailní.
- [ ] Přepni `/ui-kit` do tmavého režimu — cover musí držet.
- [ ] Vyzkoušej ho ve **všech pěti tónech** (řádek `tone` v ui-kitu).
- [ ] `npx eslint` a `npx tsc --noEmit` čisté.

### Rychlý náhled bez prohlížeče

`sharp` (už je v `node_modules`) umí SVG → PNG, takže jde udělat kontaktní
list bez spouštění Next.js. Komponentu vyrenderuj přes `jiti` (`jsx: true`,
alias `@` → `src`) a `react-dom/server`, a v markupu nahraď třídy hexy —
`sharp` nezná CSS proměnné ani Tailwind:

```js
markup
  .replace(/class="fill-card"/g, 'fill="#fff"')
  .replace(/class="fill-\(--cover-tone\)"/g, 'fill="#857AD2"')
  .replace(/class="stroke-\(--cover-tone\)"/g, 'stroke="#857AD2"')
```

---

## 9. Časté chyby

| Chyba | Proč vadí | Správně |
|---|---|---|
| Ikona místo schématu | vypadá to jako clipart, karty se neliší | kresli mechanismus |
| Dvě myšlenky v jednom blobu | na malé kartě z toho je šum | jedno schéma |
| Hex napsaný do `fill` | nepřebarví se v tmavém režimu | `fill-(--cover-tone)` |
| Bílých věcí víc stejně silně | oko neví, kam se dívat | jedna plně bílá, zbytek 55 % |
| Průsvitná výplň uzlu | linka pod ním prosvítá | `<CoverNode>` |
| Uzly s obrysem `W_MAIN` | na malé kartě se slijí | `<g strokeWidth={W_SOFT}>` |
| CSS `drop-shadow` na blob | Safari ho uvnitř SVG nekreslí | filtr v `<CoverFrame>` |
| Nový obor recykluje cizí tón | barva přestane nést význam | přidej tón |
