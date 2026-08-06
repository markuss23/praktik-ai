# UI konvence

Next.js 15 (App Router) + Tailwind v4 + shadcn/ui na Base UI.

## Kde co leží

| Cesta | Co to je |
| --- | --- |
| `src/components/ui-kit/` | shadcn primitiva. Sem píše `shadcn` CLI (viz `components.json` → alias `ui`). Needitovat ručně bez důvodu. |
| `src/components/ui/` | Projektové komponenty (`Modal`, `ConfirmModal`, `Input`, `Dropdown`, `CourseCard`, `Skeletons`, `Toast`, `RichTextEditor`) + `index.ts` barrel. |
| `src/app/globals.css` | Design tokeny (Figma paleta → shadcn sémantické proměnné). Jediné místo pro CSS proměnné. |
| `/ui-kit` (`src/app/ui-kit/page.tsx`) | Živý showcase kitu — všechny varianty a velikosti. |

## Importy

Vždycky z barrelu, ne z konkrétních souborů:

```tsx
import { Button, Card, CardHeader, Dialog, Alert } from "@/components/ui";
```

Nové primitivum se přidává takhle:

```bash
npx shadcn@latest add tooltip     # spadne do src/components/ui-kit/
```

…a pak se **re-exportuje** v `src/components/ui/index.ts`, jinak není přes barrel vidět.

## Tlačítka

Žádné ručně stylované `<button className="px-4 py-2 bg-...">`. Vždycky `Button` z kitu:

```tsx
<Button variant="default" size="sm">Uložit</Button>
<Button variant="outline" size="icon-sm"><Pencil /></Button>
```

- `variant`: `default` | `outline` | `secondary` | `ghost` | `destructive` | `link`
- `size`: `default` | `xs` | `sm` | `lg` | `xl` | `icon` | `icon-xs` | `icon-sm` | `icon-lg`
- Ikona vedle textu se značí `data-icon`, bez sizing tříd — velikost řeší komponenta:

```tsx
<Button>
  <Search data-icon="inline-start" />
  Hledat
</Button>
```

- `Button` nemá `isLoading`. Loading se skládá: `disabled` + spinner jako ikona.

## Styling

- `className` slouží na **layout** (rozměry, mezery, umístění), ne na přebarvování komponent.
- Sémantické tokeny místo raw barev: `bg-primary`, `text-muted-foreground`, `border-border`, `bg-destructive/10`.
  Nikdy `bg-green-500`, `text-gray-700`, `#59AC77`.
- Projektové tokeny navíc: `--success`, `--warning`, `--tip`, `--brand-accent`, `--gradient-l`, `--gradient-r`.
  `--primary` je značková zelená z Figmy (#59AC77).
- Mezery `gap-*` ve flexu, ne `space-x-*` / `space-y-*`.
- Stejná šířka i výška → `size-8`, ne `w-8 h-8`.
- Žádné ruční `dark:` přebarvování — tokeny to řeší samy.
- Žádný ruční `z-index` na overlayích; `Dialog`/`Drawer`/`Select` si stacking řeší samy.

## Na co si dát pozor

- **Toasty** běží na vlastním `ToastProvider` / `useToast` z `src/components/ui/Toast.tsx`, mountovaném v `app/layout.tsx`.
  Kitový Base UI toast (`ui-kit/toast.tsx`) zatím **není** zapojený do aplikace, používá ho jen showcase na `/ui-kit`.
  Pro notifikace v appce tedy `useToast()`, ne `toast()` z kitu.
- **Badge** z kitu (`ui-kit/badge.tsx`) je stavový badge pro tikety (`new` | `open` | `waiting` | `resolved` | `closed`).
  Pro kurzy/moduly jsou `StatusBadge`, `PublishBadge`, `ModuleActiveBadge` v `ui/Badge.tsx`.
- Kit je **Base UI**, ne Radix. Custom trigger se předává přes `render`, ne přes `asChild`.
- Komponenty s `useState` / handlery potřebují `"use client"` (projekt je RSC).

## Skill

V `frontend/.claude/skills/shadcn/` je oficiální shadcn skill (registry, CLI, pravidla kompozice,
`base-vs-radix`, forms, ikony, styling). Před přidáváním nebo opravou komponenty z něj vycházej
a doplň si docs přes `npx shadcn@latest docs <component>`.
