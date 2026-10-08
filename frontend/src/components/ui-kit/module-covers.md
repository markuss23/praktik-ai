# Covery modulů — designový systém

Návod, jak nakreslit další cover do [`module-covers.tsx`](./module-covers.tsx),
aby zapadl do série. Není to volná ilustrace: je to systém s pevným plátnem,
pěti tóny, třemi silami tahu a slovníkem tvarů. Když se drží, může každý modul
dostat vlastní motiv a karty pořád vypadají jako jedna rodina.

Živá ukázka: `/ui-kit` → sekce **Card — SVG covery modulů**.

---

## 1. Kánon — co platí vždy

Devět pravidel. Když jedno porušíš, cover vypadá jako cizí obrázek.

| # | Pravidlo |
|---|---|
| 1 | Plátno je vždy `viewBox="0 0 590 226"`. Nic jiného. |
| 2 | Podklad je **jedna plná barva**. Žádný gradient, žádná mřížka, žádná textura. |
| 3 | Barva jde z tokenu přes Tailwind třídu (`fill-primary`), nikdy jako hex v atributu. |
| 4 | Kresba je **linková a bílá**. Plochy se nevybarvují. |
| 5 | Akcent je **jedna** barva a bere se jako `currentColor`. |
| 6 | Akcentem se zvýrazní **jedna věc** — jedna cesta, jeden bod, jeden výsledek. |
| 7 | Tahy mají jen tři síly: `W_MAIN`, `W_SOFT`, `W_ACCENT`. Nic mezi. |
| 8 | Všechny konce a spoje jsou zakulacené (`strokeLinecap`/`strokeLinejoin="round"`). |
| 9 | Motiv je **schéma, ne obrázek**. Kreslí se to, co se v modulu učí, ne jeho ikona. |

Pravidlo 9 je to hlavní. Cover pro Git není logo Gitu — je to graf větví. Cover
pro AI není robot — je to síť s prosvícenou cestou. Kreslí se mechanismus.

---

## 2. Plátno

```
0                                                                    590
0 ┌────────────────────────────────────────────────────────────────────┐
  │  ← ~46 →                                                  ← ~46 →  │
  │        ┌───────────┐   ┌──────────┐   ┌────────────────────┐       │
  │        │  OBJEKT   │ → │ SPOJKA   │ → │      SCHÉMA        │       │
113│        │  46–190   │   │ 196–310  │   │      300–560       │       │
  │        └───────────┘   └──────────┘   └────────────────────┘       │
  │                                                                    │
226└────────────────────────────────────────────────────────────────────┘
```

- **Poměr 590 : 226** sedí s `<CardImage>` (z Figmy 2120:3142). Neměnit.
- **Bezpečná zóna:** kresli mezi `y ≈ 40` a `y ≈ 200`, od okraje nech ~40 px.
  `preserveAspectRatio="xMidYMid slice"` sice při přesném poměru neořezává, ale
  v jiných kontejnerech ano — okraje musí být obětovatelné.
- **Optická osa** je `y ≈ 113`. Kolem ní kompozici vyvažuj.

### Kompoziční rytmus

Série drží stejnou stavbu zleva doprava:

| Zóna | x | Co tam patří | Příklady |
|---|---|---|---|
| **Objekt** | 46–190 | Jeden uzavřený tvar. Ukotví oko. | kruh s trojúhelníkem, čip |
| **Spojka** *(volitelná)* | 196–310 | Symboly, řádky, šipka — vstup do schématu. | π ∑ √x, tři „prompt" řádky + šipka |
| **Schéma** | 300–560 | Diagram, který nese sdělení. Sem jde akcent. | graf funkce, neuronová síť |

Motiv smí zónu přeskočit (Git jede jako jeden graf přes celou šířku), ale
**nikdy nesmí být plátno rovnoměrně zaplněné** — musí být vidět rytmus
těžký ↔ lehký.

---

## 3. Tóny

Tón nese **téma**. Příbuzné kurzy sdílí barvu, jiný obor dostane jinou —
podle barvy se má dát v seznamu poznat rodina.

| tone | podklad | token | akcent | token akcentu | Obor |
|---|---|---|---|---|---|
| `purple` | fialová | `--gradient-r` `#857AD2` | oranžová | `--brand-accent` | matematika, exaktní obory |
| `green` | zelená | `--primary` `#59AC77` | žlutá | `--warning` | AI, data, analytika |
| `blue` | modrá | `--tip` `#383BF5` | oranžová | `--brand-accent` | vývoj, nástroje, verzování |
| `rose` | vínová | `--gradient-l` `#B1475C` | žlutá | `--warning` | *volné* |
| `orange` | oranžová | `--brand-accent` `#F87B1B` | modrá | `--tip` | *volné* |

Hexy jsou jen orientační — v kódu se sahá na token, takže se tmavý režim
přebarví sám.

### Přidání tónu

Do `COVER_TONES` přidej dvojici tříd:

```tsx
const COVER_TONES = {
  // …
  teal: { bg: "fill-chart-2", accent: "text-warning" },
} as const
```

Podmínky nového tónu:

- **Podklad musí být tmavší než bílá kresba.** Světlé tokeny (`--warning`,
  `--background`, `--muted`) se na podklad nehodí — bílá linka na nich zmizí.
- **Akcent musí být čitelný na podkladu i vedle bílé.** Oranžová na zelené je
  slabá, proto má `green` žlutou.
- Do `COVER_TONE_ITEMS` v `app/ui-kit/page.tsx` přidej řádek, ať je tón vidět
  v ukázce.

---

## 4. Tahy

```tsx
const W_MAIN   = 3.5   // hlavní kresba — obrys objektu, osy, hlavní linka
const W_SOFT   = 2.25  // podružné — piny, čárkované vodicí čáry, pilulky, rysky
const W_ACCENT = 4.5   // jediná zvýrazněná cesta
```

Nic mezi tím. Když tah nevíš zařadit, je to `W_SOFT`.

| Barva tahu | Kdy |
|---|---|
| `STROKE` = `rgba(255,255,255,0.92)` | nosná kresba |
| `STROKE_SOFT` = `rgba(255,255,255,0.5)` | druhý plán, vodicí čáry, rysky |
| `currentColor` | akcent — jen jednou v kompozici |

Čárkování se používá jen pro „odvozené" čáry (odečet z grafu, nedotažená
větev): `strokeDasharray="6 8"`, `"5 7"` nebo `"10 9"`.

---

## 5. Slovník tvarů

Stavební prvky. Používej je znovu — z toho vzniká rodinná podoba.

### Uzel / commit

Kruh vyplněný **barvou podkladu** (ne průhledný!) s bílým obrysem. Neprůhlednost
je důležitá: linka pod uzlem nesmí prosvítat.

```tsx
const { bg } = coverTone(props.tone)
// běžný uzel
<circle cx={x} cy={y} r="10" className={bg} stroke={STROKE} strokeWidth={W_MAIN} />
// zvýrazněný uzel
<circle cx={x} cy={y} r="10" fill="currentColor" stroke={STROKE} strokeWidth={W_MAIN} />
```

Poloměry v sérii: `7` (bod v grafu), `10` (uzel sítě), `11` (commit), `8` (vedlejší).

### Pilulka / řádek textu

```tsx
<rect x="206" y="76" width="76" height="15" rx="7.5" stroke={STROKE_SOFT} strokeWidth={W_SOFT} />
```

`rx` = polovina výšky. Různé šířky (76 / 56 / 68) dělají „text".

### Šipka

```tsx
<path d="M288 111h20M301 104l8 7-8 7" stroke="currentColor" strokeWidth={W_MAIN} />
```

Hrot je vždy dvě čáry pod ~40°, délka 8. Pro osy stejný recept:
`M323 53l7-13 7 13` (nahoru), `M533 181l13 7-13 7` (doprava).

### Rám / deska

```tsx
<rect x="62" y="64" width="108" height="108" rx="20" />   // vnější
<rect x="88" y="90" width="56" height="56" rx="12" />     // vnitřní, STROKE_SOFT
```

Vnější `rx` 16–20, vnitřní 10–12.

### Piny / rysky

Krátké čáry 14–16 dlouhé, `STROKE_SOFT`, `W_SOFT`, po třech nebo pěti:

```tsx
<path d="M88 64V48M116 64V48M144 64V48" />
```

### Jiskra

Čtyřcípá hvězda, jediný plný tvar v celé sérii. Max jedna na cover.

```tsx
<path d="M188 42l6 14.5L208 63l-14 6.5L188 84l-6-14.5L168 63l14-6.5z" fill="currentColor" />
```

Zobecněně pro střed `(cx, cy)`, poloměr `r` a pas `k = 0.29 × r`:

```
M cx,cy-r  L cx+k,cy-k  L cx+r,cy  L cx+k,cy+k
L cx,cy+r  L cx-k,cy+k  L cx-r,cy  L cx-k,cy-k  Z
```

(Cover pro AI má `cx=188`, `cy=63`, `r≈21`, `k=6`.)

### Symboly

Serif kurzíva, bílá na 70 %, velikost 30–46. Jen tam, kde je symbol součástí
oboru (matematika, chemie, měna). Nikdy víc než tři.

```tsx
<g fill="rgba(255,255,255,0.7)" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic">
  <text x="206" y="96" fontSize="46">π</text>
</g>
```

### Prach

Pět teček `r` 2–3 do prázdných rohů. Vždy přes `<CoverDust>`, nikdy ručně.

```tsx
<CoverDust points={[[58, 52, 3], [286, 60, 2.5], [180, 198, 2.5], [566, 128, 3], [64, 180, 2]]} />
```

---

## 6. Jak přidat nový motiv

Nové motivy bydlí **ve stejném souboru** — `CoverFrame` a `CoverDust` se ven
neexportují schválně, aby se série nerozutekla po repozitáři.

### Postup

1. **Napiš si jednou větou, co se v modulu učí.** Ne název kurzu — ten
   mechanismus. („Data se filtrují a agregují do výsledku.")
2. **Najdi schéma té věty.** Co by ses nakreslil na tabuli? To je pravá část.
3. **Vyber objekt do levé zóny** — nástroj nebo nosič tématu.
4. **Rozhodni, co je ta jedna zvýrazněná věc**, a dej jí akcent.
5. **Vyber tón** podle oboru (viz tabulku výš). Nový obor = nový tón.
6. **Nakresli to** podle šablony níž.
7. **Přidej do ukázky** v `app/ui-kit/page.tsx` a zkontroluj podle checklistu.

### Šablona

```tsx
/** Souřadnice, ze kterých se schéma poskládá — ne magická čísla v cestách. */
const TOPIC_STEPS = [
  { x: 330, label: "vstup" },
  { x: 440, label: "zpracování" },
  { x: 540, label: "výstup" },
]

/**
 * Téma modulu — co je vlevo, co je vpravo a co nese akcent.
 */
function TopicCover(props: CoverProps) {
  const { bg } = coverTone(props.tone)

  return (
    <CoverFrame {...props}>
      <g
        fill="none"
        stroke={STROKE}
        strokeWidth={W_MAIN}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* objekt (46–190) */}
        <rect x="62" y="64" width="108" height="108" rx="20" />

        {/* spojka (196–310) */}
        <path d="M288 111h20M301 104l8 7-8 7" stroke="currentColor" />

        {/* schéma (300–560) */}
        <path d="M330 113h210" stroke={STROKE_SOFT} strokeWidth={W_SOFT} />
      </g>

      {/* uzly — poslední krok akcentem */}
      <g stroke={STROKE} strokeWidth={W_MAIN}>
        {TOPIC_STEPS.map((step, i) =>
          i === TOPIC_STEPS.length - 1 ? (
            <circle key={step.x} cx={step.x} cy="113" r="10" fill="currentColor" />
          ) : (
            <circle key={step.x} cx={step.x} cy="113" r="10" className={bg} />
          )
        )}
      </g>

      <CoverDust points={[[58, 52, 3], [286, 60, 2.5], [560, 186, 3]]} />
    </CoverFrame>
  )
}
```

Nakonec doplň export: `export { AiCover, GitCover, MathCover, TopicCover, … }`.

### Konvence v kódu

- Souřadnice, které se opakují nebo spolu musí souhlasit, dej do konstanty
  (`GIT_MERGE_X`) — ne dvakrát do path stringu.
- Opakující se prvky generuj `.map()`em nad polem, ne copy-paste (viz
  `NET_LAYERS`).
- Komentář nad skupinou říká **co to je v realitě** („odbočka a merge zpět"),
  ne co dělá SVG.

---

## 7. Zásobník motivů

Návrhy pro další moduly — schéma a tón. Ber jako startovní bod.

| Modul | Objekt (vlevo) | Schéma (vpravo) | Akcent | tone |
|---|---|---|---|---|
| Statistika a data | krabicový graf | sloupce s proloženou křivkou | nejvyšší sloupec | `purple` |
| Tabulky / Excel | mřížka buněk | vzorec → výsledek přes šipku | výsledná buňka | `purple` |
| Prompt engineering | tři pilulky promptu | větvení odpovědí | vybraná větev | `green` |
| Práce se zdroji | otevřená kniha | uzly s odkazy do centra | ověřený zdroj | `rose` |
| Prezentace | plátno se slidem | timeline slidů | aktuální slide | `rose` |
| Kyberbezpečnost | štít / zámek | tok požadavků, jeden zablokovaný | zablokovaný | `blue` |
| Projektové řízení | deska se sloupci | úkoly plynoucí zleva doprava | hotový úkol | `orange` |
| Komunikace v týmu | dvě bubliny | vlákno odpovědí | vyřešené vlákno | `orange` |
| Jazyk / lingvistika | kniha se symboly | strom větného rozboru | kořen | `rose` |

Pravidlo pro tón: **nejdřív se podívej, jestli obor už tón má.** Druhý kurz
o AI musí být zelený, i kdyby se ti to esteticky nehodilo.

---

## 8. Kontrola před commitem

- [ ] Podklad je jedna plná barva z tokenu (žádný hex v atributu).
- [ ] Akcent je použitý **jednou** a je jasné, co zvýrazňuje.
- [ ] Všechny uzly mají neprůhlednou výplň — pod nimi nic neprosvítá.
- [ ] Tahy jsou jen 3.5 / 2.25 / 4.5.
- [ ] Kresba se vejde mezi `y` 40–200 a ~40 px od bočních okrajů.
- [ ] Kompozice není rovnoměrně zaplněná — je vidět těžká a lehká část.
- [ ] Zmenši na ~200 px šířky: pozná se motiv? Když ne, je moc detailní.
- [ ] Přepni `/ui-kit` do tmavého režimu — cover musí držet.
- [ ] Vyzkoušej ho ve **všech pěti tónech** (řádek `tone` v ui-kitu). Motiv
      nesmí fungovat jen na jednom podkladu.
- [ ] `npx eslint` a `npx tsc --noEmit` čisté.

### Rychlý náhled bez prohlížeče

`sharp` (už je v `node_modules`) umí SVG → PNG, takže se dá udělat kontaktní
list všech tónů bez spouštění Next.js:

```js
const sharp = require("./node_modules/sharp");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 590 226" width="590" height="226">…</svg>`;
sharp(Buffer.from(svg)).png().toFile("cover.png");
```

Do SVG dosaď hexy z tabulky tónů (`sharp` nezná CSS proměnné ani Tailwind).

---

## 9. Časté chyby

| Chyba | Proč vadí | Správně |
|---|---|---|
| Gradient nebo mřížka na pozadí | rozbíjí plochý styl série | jedna plná barva |
| Hex napsaný do `fill` | nepřebarví se v tmavém režimu | Tailwind třída nad tokenem |
| Akcent na třech místech | oko neví, kam se dívat | jedna zvýrazněná věc |
| Průsvitná výplň uzlu | linka pod ním prosvítá, vypadá to špinavě | `className={bg}` |
| Tenké tahy (1–2) | na kartě zmizí | minimum `W_SOFT` = 2.25 |
| Ikona místo schématu | vypadá to jako clipart, ne jako série | kresli mechanismus |
| Rovnoměrně rozprostřená kresba | mrtvá kompozice | drž rytmus objekt → schéma |
| Nový obor recykluje cizí tón | barva přestane nést význam | přidej tón |

---

## 10. Když to má vygenerovat AI

Kdyby covery měl kreslit obrázkový model místo ruky, drž ten samý systém.
Nejlíp na to sedí **Recraft V3** — umí vektor a vlastní styl natrénovaný
z ukázek (nahraj tři hotové covery jako referenci). Alternativy: Midjourney
v7 s `--sref` (jen rastr), Nano Banana pro rychlé iterace.

Šablona promptu:

```
Flat vector cover illustration, 590x226 landscape, single solid
{BARVA_PODKLADU} background, no gradient, no texture, no grid.
White 3px line-art diagram of {MECHANISMUS MODULU}, rounded caps and joins.
One element highlighted in {AKCENT} as the focal point.
Composition: closed object on the left third, schematic diagram on the right
two thirds, generous empty space. A few small white dots in empty corners.
No text, no logos, no shadows, no 3D, no photorealism.
```

Za `{MECHANISMUS MODULU}` patří ta věta z kroku 1 v kapitole 6 — ne název
kurzu. Výstup pak projeď checklistem z kapitoly 8; co neprojde, dokresli ručně.
