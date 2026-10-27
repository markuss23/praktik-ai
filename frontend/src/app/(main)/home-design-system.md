# Úvodní stránka — designový systém a styly

Podklad pro **redesign hero sekce**. Popisuje, co na home page už platí, aby nový
hero nebyl cizí prvek na stránce, která má jinak dost pevný rukopis.

Zdroj pravdy je sekce „O projektu" ([`ProjectAboutSection.tsx`](./ProjectAboutSection.tsx)) —
je to nejnovější a nejdotaženější kus landing page. Hero
([`Hero.tsx`](../../components/layout/Hero.tsx)) je naopak nejstarší a systém
zatím nedodržuje; rozdíly jsou vypsané v kapitole 8.

---

## 0. Co je kde

| Soubor | Role |
|---|---|
| [`page.tsx`](./page.tsx) | Skládá stránku: `Hero` → `ChangelogAccordion` → `CourseSection` → `ProjectAboutSection` |
| [`Hero.tsx`](../../components/layout/Hero.tsx) | Hero — **cíl redesignu** |
| [`ProjectAboutSection.tsx`](./ProjectAboutSection.tsx) | „O projektu" — referenční rukopis |
| [`ChangelogAccordion.tsx`](./ChangelogAccordion.tsx) | Bílý accordion s novinkami, hned pod hero |
| [`CourseSection.tsx`](./CourseSection.tsx) | Grid kurzů + filtry |
| [`layout.tsx`](./layout.tsx) | `Header` + `<main max-width: 1440px>` + `Footer` |
| [`globals.css`](../globals.css) | Tokeny, `blob-float`, focus ring, `overflow-x: clip` |
| [`src/components/ui-kit/`](../../components/ui-kit/) | shadcn/base-ui kit (Button, Badge, Card…) — pro hero zatím nepoužitý |

---

## 1. Rámec a mřížka

```
┌─ <html> ── overflow-x: clip ───────────────────────────────────────────────┐
│ ┌─ <main> ── max-width: 1440px, margin: 0 auto ──────────────────────────┐ │
│ │   ├─ 100px ─┤          obsah 1240 px          ├─ 100px ─┤              │ │
│ │                                                                        │ │
│ │   full-bleed sekce se z rámu vylomí: mx-[calc(50%-50vw)]               │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

**Dvě konvence kontejneru žijí vedle sebe:**

| Konvence | Kód | Používá |
|---|---|---|
| Starší (px gutter) | `mx-auto px-4 sm:px-6 lg:px-[100px]` + `max-width: 1440px` | Hero, Changelog, CourseSection, Footer |
| Novější (fluidní) | `mx-auto w-[min(1240px,94vw)]` | ProjectAboutSection |

Obě vychází na stejných **1240 px** obsahu na širokém displeji, jen jinak dýchají
pod 1440 px. Pro nový hero doporučeno **novější**:

```tsx
const container = 'mx-auto w-[min(1240px,94vw)]';

/** Levý okraj shodný s `container` — pro full-bleed sekce, jejichž text má
 *  navazovat na zbytek stránky, zatímco pozadí a obrázek jdou na doraz. */
const containerGutterLeft = 'pl-[calc((100vw_-_min(1240px,94vw))_/_2)]';
```

**Full-bleed**: `<main>` drží 1440 px, takže sekce, která chce pozadí přes celý
viewport, se vylomí přes `mx-[calc(50%-50vw)]`. `html { overflow-x: clip }` v
[`globals.css`](../globals.css) uřízne pár px navíc ze `100vw` (šířka scrollbaru),
aniž by vznikl vodorovný scroll — záměrně `clip`, ne `hidden`, aby dál fungoval
`position: sticky` (sticky `Header`).

**Breakpointy**: používají se pouze Tailwind defaulty — `sm 640`, `md 768`,
`lg 1024`. `lg` je hlavní zlom: teprve tam naskakují offsety, blobs a velká
vertikální rytmika. Pod `lg` se všechno srovná do jednoho sloupce.

---

## 2. Barvy

### 2.1 Tokeny (`globals.css`, `:root`)

Definované v oklch, mapované do Tailwindu přes `@theme inline` → `bg-primary`,
`text-brand-accent`, `ring-gradient-r`…

| Token | Hex | Význam |
|---|---|---|
| `--primary` / `--success` | `#59AC77` | Brandová zelená (Figma „Succes") |
| `--gradient-l` | `#B1475C` | Vínová — levý konec brand gradientu |
| `--gradient-r` | `#857AD2` | Fialová — pravý konec gradientu, zároveň `--ring` |
| `--brand-accent` | `#F87B1B` | Oranžový akcent |
| `--tip` | `#383BF5` | Modrá |
| `--warning` | `#FFBD2E` | Žlutá |
| `--destructive` | `#D5002A` | Červená |
| `--radius` | `10px` | `sm 6` · `md 8` · `lg 10` · `xl 14` · `2xl 18` · `3xl 22` · `4xl 26` |

### 2.2 Brand gradient

Jediný gradient značky. Objevuje se v headeru (podtržení aktivní položky),
ve footeru (12px horní pruh), v changelogu (ikona) i v hero (glow ellipsy).

```css
linear-gradient(90deg,  #B1475C 0%, #857AD2 100%)   /* vodorovně */
linear-gradient(135deg, #857AD2 0%, #B1475C 100%)   /* diagonálně, na plochách */
```

### 2.3 Paleta landing page (literály, ne tokeny)

Sekce „O projektu" si vede vlastní rozšířenou paletu zapsanou přímo v hexech.
Je to vědomá odchylka — landing má víc tónů, než kolik jich UI kit potřebuje.

| Hex | Role |
|---|---|
| `#F0F0F0` | Pozadí celé stránky (`layout.tsx`, Hero, Changelog, CourseSection) |
| `#111111` | Základní text na světlém |
| `#555555` | Lead odstavce |
| `#666666` | Body text v kartách |
| `#777777` | Popisky pod čísly (uppercase) |
| `#D6D6D6` | Vlasové oddělovače |
| `#0D2F31` | Tmavý pás „Cíle projektu" (hluboká zelenočerná) |
| `#5AAC78` | Zelená akcentů ⚠️ *o jedničku vedle tokenu `#59AC77`* |
| `#D1E7D9` | Mátová — blobs, ikonová plocha |
| `#298E86` | Petrolejová — jen jako 1,5px obrys kruhu, opacity 0.32 |
| `#857AD2` | Fialová = `--gradient-r` |
| `#F87B1B` | Oranžová = `--brand-accent` (použitá jen pro „∞") |
| `#E4E0F6` | Světle lila blob |
| `#EDEAFA` | Podklad citace |
| `#23203A` | Text citace |
| `#6B60BE` | Podpis pod citací |
| `#14131C` | Podklad pod fotkou |
| `#3C3C3C` | Světlejší konec hero gradientu |
| `#252323` | Kontaktní karta v hero |

### 2.4 Jak se barva používá

- **Pozadí stránky je vždy `#F0F0F0`.** Bílá `#FFF` je vyhrazená pro
  *plovoucí objekty* — changelog accordion, karty kurzů, header, footer.
- **Sytá barva jen v malých dávkách.** Zelená, fialová a oranžová se objevují
  jako čísla, blobs, ikonové plochy a 64px linka — nikdy jako plocha celé sekce.
- **Jediná tmavá plocha na stránce** je pás „Cíle projektu" (`#0D2F31`) —
  plus hero. Dva tmavé bloky stačí; třetí by stránku rozbil na pruhy.
- Text na tmavém jede na `white/65` (lead) a `white/60` (body), nikdy na plné bílé
  kromě nadpisů.

---

## 3. Typografie

### 3.1 Písma

| Proměnná | Font | Stav |
|---|---|---|
| `--font-geist-sans` | Geist (latin, latin-ext) | **Aktivní** — `body { font-family }` |
| `--font-geist-mono` | Geist Mono | Kód |
| `--font-bricolage` / `--font-display` | Bricolage Grotesque 600/700/800 | **Načteno, ale nikde nepoužito** (viz kap. 10) |

Landing page tedy jede celá na **Geistu**. Bricolage je připravený jako displejové
písmo — pokud ho má hero vzít, je to designové rozhodnutí, které pak musí převzít
i nadpisy v „O projektu", jinak vznikne rozpor.

### 3.2 Škála nadpisů

Klíčové pravidlo: **`<h1>` v hero a všechny `<h2>` v „O projektu" sdílí jednu
definici.** V `ProjectAboutSection.tsx` je zapsaná explicitně jako konstanta,
právě aby se držela hero:

```tsx
/** Typografie nadpisů 1:1 podle <h1> v Hero, ať má landing page jeden rukopis.
 *  Drží se i váha (bold, ne extrabold) a leading-tight — bez vlastního
 *  trackingu, Hero žádný nemá. */
const heroTitle =
  'text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl';
```

| Breakpoint | Velikost |
|---|---|
| base | 30 px |
| `sm` | 36 px |
| `md` | 48 px |
| `lg` | 60 px |

Váha `700`, `line-height: 1.25`, **žádný tracking**. Nadpisy se drží na
`max-w-[15ch]` a `text-pretty`.

> ⚠️ **Když v redesignu změníš škálu nadpisu, musíš změnit i `heroTitle`
> v `ProjectAboutSection.tsx`** — nebo záměrně tu vazbu přeříznout a komentář
> u konstanty přepsat. Jinak bude komentář lhát.

### 3.3 Zbytek stupnice

| Prvek | Styl |
|---|---|
| Lead odstavec (světlý) | `19px / 1.62`, `#555555`, `max-w-[520px]`, `text-pretty` |
| Lead odstavec (tmavý) | `17px / 1.68`, `white/65` |
| Body | `16px / 1.62`, `#666666` nebo `white/60`, `max-w-[430px]` |
| Velká čísla | `56px → lg:76px`, **800**, `leading-0.8`, `tracking-[-0.04em]`, `tabular-nums` |
| Popisek pod číslem | `12px`, `uppercase`, `tracking-[0.14em]`, `#777777` |
| Nadpis položky (h3) | `22px → lg:26px`, **700**, `tracking-[-0.02em]`, `leading-1.15` |
| Nadpis karty (h3) | `25px`, **700**, `tracking-[-0.02em]` |
| Duchové číslice | `72px → lg:112px`, **800**, `tracking-[-0.05em]`, `text-transparent`, `[-webkit-text-stroke:1.5px_rgba(154,214,178,0.42)]` |
| Citace | `20px → lg:23px`, **700**, `tracking-[-0.015em]`, `leading-1.42` |
| Podpis citace | `13px`, **700**, `uppercase`, `tracking-[0.1em]` |

Vzorec: **čím větší text, tím zápornější tracking** (−0.015 → −0.05 em).
Malý text jde opačně — uppercase popisky mají tracking kladný (+0.1 až +0.14 em).

---

## 4. Tvarosloví

Stránka má tři tvarové motivy. Nový hero by měl použít alespoň jeden, ať navazuje.

### 4.1 Organické blobs

Nepravidelné `border-radius` se dvěma osami. Vždy `aria-hidden`,
`pointer-events-none`, `absolute`, a **jen od `lg` nahoru** (`hidden lg:block`).

```tsx
rounded-[62%_38%_51%_49%/44%_58%_42%_56%]   // mátový blob vpravo nahoře
rounded-[45%_55%_38%_62%/57%_43%_57%_43%]   // ikonová plocha (zelená)
rounded-[55%_45%_62%_38%/42%_56%_44%_58%]   // ikonová plocha (fialová)
rounded-[58%_42%_47%_53%/43%_55%_45%_57%]
rounded-[48%_52%_62%_38%/55%_42%_58%_45%]
```

Doprovází je **tenké kruhové obrysy** — `rounded-full`, `border-[1.5px]`,
opacity `0.25–0.32`, velikost 190–360 px.

### 4.2 Zkosený pás

Tmavá sekce nemá vodorovné hrany. Řeší se `clip-path` na absolutní vrstvě
(ne na sekci samotné, aby šla animovat nezávisle):

```tsx
[clip-path:polygon(0_5.5vw,100%_0,100%_100%,0_calc(100%-4.5vw))]
```

Horní hrana klesá zleva doprava, spodní stoupá. Sekce se zároveň zatáhne
`-mt-5` pod předchozí, aby nevznikla světlá spára.

### 4.3 Zaoblení a přesahy

| Prvek | Hodnota |
|---|---|
| Hero karta | `24px` |
| Citace | `34px` + `rounded-bl-lg` (jeden roh jiný = „bublina") |
| Obrázek na doraz | `lg:rounded-l-[28px]` — zaoblení jen na vnitřní hraně |
| Akcentová linka | `h-1 w-16 rounded-sm` (`#5AAC78`) — pod nadpisem tmavé sekce |
| Stín citace | `0 24px 60px rgba(20,19,28,0.16)` |
| Rotace citace | `lg:rotate-[-1.4deg]` |

**Přesah přes mřížku je záměrný jazyk stránky**: citace vyjede `lg:mr-[-120px]`
přes fotku, blobs sedí na `-right-[180px]`, obrázek dojíždí na okraj viewportu.
Nic nekončí zarovnaně — kromě textu, ten se drží gutteru.

---

## 5. Prostor a rytmus

### 5.1 Vertikální padding sekcí

| Sekce | Mobil | `lg` |
|---|---|---|
| Hero | `48px` / `48px` | totéž (nemění se) |
| CourseSection | `py-8` → `sm:py-12` | `py-16` |
| O projektu | `py-20` | `pt-130 / pb-60` |
| Cíle projektu | `py-24` | `pt-210 / pb-220` |
| Výstup projektu | `py-24` | `pt-150 / pb-60` |
| Přínos a výzkum | `py-24` | `pt-150 / pb-160` |

Landing sekce dýchají **150–220 px** na desktopu. Hero se svými 48 px je v této
společnosti výrazně utažené.

### 5.2 Rozbité zarovnání

Prvky se schválně neurovnávají na společnou základnu — každý dostane vlastní
`lg:` offset, pod `lg` se všechny ruší:

```tsx
// čísla v řadě
''  ·  'lg:translate-y-[30px]'  ·  'lg:-translate-y-3'  ·  'lg:translate-y-[22px]'
// karty výstupů — schodiště
''  ·  'lg:mt-[76px]'  ·  'lg:mt-[152px]'
// položky cílů — střídavé odsazení
''  ·  'lg:ml-10'  ·  ''  ·  'lg:ml-10'
```

### 5.3 Grid

```tsx
lg:grid-cols-[0.85fr_1.15fr]   // Cíle: text užší, seznam širší, gap 90px
lg:grid-cols-[0.92fr_1.08fr]   // Přínos: text vs. fotka, gap 0
md:grid-cols-3                 // Výstupy, gap 48 → lg:56px
```

Nikdy ne `1fr 1fr` — poměry jsou vždy mírně nesymetrické.

---

## 6. Pohyb

Knihovna: **`motion/react`** (Motion v12). Všechno respektuje
`prefers-reduced-motion`.

### 6.1 Nájezd bloku — jediná scroll animace

```tsx
/** Jediná JS animace sekce: jemný nájezd bloku při scrollu, jednou. */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};
```

Aplikuje se na **celý obsahový blok sekce**, ne na jednotlivé prvky. `once: true`
je pravidlo — nic se při scrollování nahoru nepřehrává znovu.

### 6.2 Počítadla

- Konečná čísla: `duration 1.1`, ease `[0.16, 1, 0.3, 1]` (dojede a zabrzdí).
- „∞": běží do `99` s `easeIn` (zrychluje), pak přeskočí na symbol
  se spring popem (`stiffness 420`, `damping 18`).
- Stagger `i * 0.12 s`.
- Běžící číslice jsou `aria-hidden`; čtečka dostane rovnou výslednou hodnotu
  přes `sr-only`.

### 6.3 Drift pozadí

```css
.blob-float       { animation: blobFloat     20s ease-in-out infinite; }
.blob-float-slow  { animation: blobFloatSlow 24s ease-in-out infinite; }
```

Posun ±20–28 px, rotace ±7–9°. Čistě CSS, vypnuto při reduced motion.

### 6.4 Sazba jinde na stránce

| Kde | Hodnoty |
|---|---|
| Karty kurzů | stagger `0.08`, `{opacity 0, y 20, scale 0.97}` → `0.35s easeOut` |
| Changelog accordion | `height: 0 → auto`, `0.3s easeInOut` |
| Hover tlačítka | `scale 1.05` / tap `0.95` |
| Micro-transitions | `transition-colors`, `transition-shadow`, `transition-all` bez explicitní délky |

---

## 7. Anatomie sekce „O projektu"

Čtyři podsekce v jednom full-bleed obalu
(`bg-[#f0f0f0] text-[#111111]`, `overflow-x-clip`).

### 7.1 O projektu (světlá)
`h2` (heroTitle, `max-w-[15ch]`) → lead 19px → `<dl>` se čtyřmi čísly.
Vpravo mátový blob 560 px a kruhový obrys 190 px.
Čísla: **4 hlavní cíle** (zelená) · **3 klíčové výstupy** (fialová) ·
**2 univerzity** (zelená) · **∞ možností pro výuku** (oranžová).

### 7.2 Cíle projektu (tmavý zkosený pás)
Dvousloupec `0.85fr / 1.15fr`. Vlevo `h2` + 64px zelená linka + odstavec
`white/65`. Vpravo `<ol>` se čtyřmi cíli; každý má duchovou číslici `01–04`
v pozadí (`absolute`, `aria-hidden`, obtah `rgba(154,214,178,0.42)`) a
vlasový oddělovač `border-[#D1E7D9]/20` mezi položkami.

### 7.3 Výstup projektu (světlá)
Tři karty v `md:grid-cols-3`, schodišťově posunuté. Každá: **blob s ikonou 92 px**
(`lucide-react`, `size-9`, `strokeWidth 1.6`) → `h3` 25px → 1px linka `#D6D6D6`
→ odstavec. Barevný pár blobu je vždy jiný: mátová/tmavá, zelená/bílá,
fialová/bílá. Na mobilu karta stojí na střed, od `md` doleva.

### 7.4 Přínos a výzkum (světlá)
Dvousloupec `0.92fr / 1.08fr`, `gap-0`. Vlevo text + citace v lila bublině
(rotovaná, přesahující `-120px` přes fotku, `z-3`). Vpravo `/ucenisai.png`
na doraz pravého okraje, `h-380 → lg:620px`, `object-cover`, `fill`,
`sizes="(max-width: 1024px) 94vw, 60vw"`.

### 7.5 Přístupnost — co sekce drží
- Dekorace (blobs, číslice, ikony) mají vždy `aria-hidden` + `pointer-events-none`.
- Sémantika nese význam: `<dl>/<dt>/<dd>` pro čísla, `<ol>` pro cíle,
  `<blockquote>/<footer>` pro citaci.
- Animovaný text má `sr-only` dvojníka s finální hodnotou.
- Vše dekorativní je `hidden lg:block` — mobil dostane čistý dokument.

---

## 8. Hero dnes — co se v něm rozchází

[`Hero.tsx`](../../components/layout/Hero.tsx) vznikl před zbytkem landing page
a systém nedodržuje. Seznam rozporů, které má redesign vyřešit:

| # | Problém | Jak to má být |
|---|---|---|
| 1 | Skoro všechny styly jsou v `style={{…}}` inline objektech | Tailwind třídy; hexy jen tam, kde není token |
| 2 | Vertikální padding 48 px | Landing dýchá 130–220 px; hero je proti sekcím pod ním stísněný |
| 3 | Kontejner `px-[100px]` + `maxWidth 1440` | Sjednotit na `w-[min(1240px,94vw)]` |
| 4 | Šedý gradient `rgba(0,0,0,.9) → #3C3C3C` — neutrální, mimo paletu | Tmavá plocha stránky je `#0D2F31`; buď ji převzít, nebo vědomě zvolit jinou a zdůvodnit |
| 5 | Dekorace = dvě `blur-3xl` kruhové ellipsy | Jazyk stránky jsou **ostré organické blobs** bez blur + tenké kruhové obrysy |
| 6 | Tvrdé hrany karty (`radius 24px`), nic nepřesahuje | Přesah přes mřížku a zkosená hrana jsou motiv stránky |
| 7 | Kontaktní karta `#252323` je jediné CTA — vizuálně slabá, ne tlačítko | Použít `Button` z [`ui-kit`](../../components/ui-kit/button.tsx), varianta `size="xl"` je z Figmy dělaná právě na hero CTA |
| 8 | Inline SVG obálky místo ikony z `lucide-react` | `<Mail />` — zbytek stránky jede na lucide |
| 9 | Žádná animace | Minimálně `fadeUp`; blobs mohou vzít `.blob-float` |
| 10 | Dekorativní ellipsy nemají `aria-hidden` | Doplnit `aria-hidden` + `pointer-events-none` |
| 11 | `<div>` obal kolem karty s `flex flex-wrap gap-4` neobsahuje nic dalšího | Zbytek po dřívějším CTA — odstranit nebo naplnit |
| 12 | Nadpis je jediná věc, která sedí — škála 1:1 s `heroTitle` | **Zachovat** (viz kap. 3.2) |

---

## 9. Mantinely pro redesign

Co musí zůstat:

1. **`<h1>` škála `text-3xl → lg:text-6xl`, `font-bold`, `leading-tight`, bez trackingu.**
   Změna = nutná změna `heroTitle` v `ProjectAboutSection.tsx`.
2. **Pozadí okolo hero je `#F0F0F0`.** Hero je objekt ležící na téhle šedé, ne
   jiné pozadí stránky.
3. **Hned pod hero přisedá bílý changelog accordion** s `shadow-sm`. Spodní hrana
   hero s ním musí fungovat — mezera nebo návaznost, ne kolize dvou stínů.
4. **Sticky `Header` je bílý, 56 px, se zaoblenými spodními rohy.** Hero pod ním
   začíná; tmavá plocha hned pod bílým headerem potřebuje dýchací mezeru.
5. **Kontaktní e-mail `praktikai@ujep.cz` je funkční obsah**, ne dekorace —
   nesmí z hero zmizet.
6. **Dekorace `aria-hidden` + `hidden lg:block`.** Mobil dostává jen obsah.
7. **`prefers-reduced-motion`** vypíná všechno, co se hýbe.

Co je volné: kompozice, tvar tmavé plochy, přítomnost obrázku, typ CTA,
přítomnost čísel/badge, přesahy.

### Stavební kameny k použití

```tsx
import { motion } from 'motion/react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui-kit/button';

const container = 'mx-auto w-[min(1240px,94vw)]';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

const heroTitle =
  'text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl';
```

Dostupné assety v [`public/`](../../../public/): `logo.svg`, `ucenisai.png`
(už použitá v „Přínos a výzkum" — v hero by se opakovala), `courseai2.png`,
`ujeplogo.svg`, `ostravskalogo.svg`, `tacrlogowide.svg` (loga partnerů —
zatím na landing page nikde, pro hero je to nevyužitá karta).

---

## 10. Známý dluh (neřešit v rámci hero, jen o něm vědět)

| Co | Detail |
|---|---|
| `#5AAC78` vs. `#59AC77` | Landing zelená je o jedničku vedle tokenu `--primary`. Sjednotit na token. |
| `--font-sans` | `@theme inline { --font-sans: var(--font-sans) }` odkazuje sám na sebe — utilita `font-sans` nemá co dosadit. Text drží jen `body { font-family: var(--font-geist-sans) }`. |
| Bricolage Grotesque | Načítá se ze `next/font` (tři řezy), mapuje se na `--font-display`, ale nikde se nepoužívá — platí se za font, který nikdo nevidí. |
| Dvě konvence kontejneru | `px-[100px]/1440` vs. `w-[min(1240px,94vw)]` — viz kap. 1. |
| Inline `style` na landing page | Hero, Changelog, CourseSection i layout míchají `style={{}}` s Tailwindem. |
| `ContactSection` | Zakomentovaná v [`page.tsx`](./page.tsx) — pokud hero převezme kontakt, soubor smazat. |
| UI kit mimo landing | Landing page nepoužívá `Button`, `Badge` ani `Card` z [`ui-kit`](../../components/ui-kit/) — má vlastní ad-hoc prvky. |
