"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BookMarked,
  Check,
  CircleCheck,
  CircleX,
  Lightbulb,
  Loader2,
  MessageSquareWarning,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui-kit/alert";
import { Badge, type BadgeStatusVariant } from "@/components/ui-kit/badge";
import { StatusSelect } from "@/components/ui-kit/status-select";
import { Button } from "@/components/ui-kit/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardImage,
  CardMeta,
  CardProgress,
  CardStat,
  CardTitle,
} from "@/components/ui-kit/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-kit/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui-kit/dialog";
import { Input } from "@/components/ui-kit/input";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui-kit/segmented-control";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui-kit/tabs";
import { Textarea } from "@/components/ui-kit/textarea";
import { Toaster, toast } from "@/components/ui-kit/toast";
import { Row, Section, ThemeToggle } from "@/components/ui-kit/Showcase";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";
import { czechPlural } from "@/lib/utils";

/** Popisky pro `<Select items>` — bez „vše", aby se uplatnil placeholder. */
const DIFFICULTY_ITEMS: Record<string, string> = Object.fromEntries(
  DIFFICULTY_ORDER.map((difficulty) => [
    difficulty,
    DIFFICULTY_LABELS[difficulty],
  ])
);

/** Filtr obtížnosti z administrace kurzů — `null` je „vše". */
const DIFFICULTY_FILTER_ITEMS: { label: string; value: string | null }[] = [
  { label: "Obtížnost: vše", value: null },
  ...DIFFICULTY_ORDER.map((difficulty) => ({
    label: DIFFICULTY_LABELS[difficulty],
    value: difficulty as string,
  })),
];

const SORT_ITEMS = {
  newest: "Nejnovější",
  oldest: "Nejstarší",
  title: "Podle názvu",
};

export default function UiKitPage() {
  return (
    <Toaster>
      <UiKitContent />
    </Toaster>
  );
}

function UiKitContent() {
  const [status, setStatus] = useState<BadgeStatusVariant>("new");
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [sort, setSort] = useState<string>("newest");
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [tab, setTab] = useState<"courses" | "materials">("courses");

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">UI Kit</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Testovací stránka pro sjednocení stylů komponent.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <Section
          title="Button"
          description="shadcn base-nova / @base-ui/react — varianty, velikosti a stavy."
        >
          <Row label="variant">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </Row>

          <Row label="size">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">
              <ArrowRight data-icon="inline-start" />
              Začít kurz
            </Button>
          </Row>

          <Row label="size (icon)">
            <Button size="icon-xs" aria-label="Přidat">
              <Plus />
            </Button>
            <Button size="icon-sm" aria-label="Přidat">
              <Plus />
            </Button>
            <Button size="icon" aria-label="Přidat">
              <Plus />
            </Button>
            <Button size="icon-lg" aria-label="Přidat">
              <Plus />
            </Button>
          </Row>

          <Row label="s ikonou">
            <Button>
              <Plus data-icon="inline-start" />
              Vytvořit kurz
            </Button>
            <Button variant="outline">
              Pokračovat
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="secondary">
              <Check data-icon="inline-start" />
              Uloženo
            </Button>
            <Button variant="destructive">
              <Trash2 data-icon="inline-start" />
              Smazat
            </Button>
          </Row>

          <Row label="stavy">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled outline
            </Button>
            <Button disabled>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Načítání…
            </Button>
            <Button aria-invalid>Invalid</Button>
          </Row>

          <Row label="odkaz">
            <Button render={<a href="/ui-kit" />}>Button jako &lt;a&gt;</Button>
          </Row>

          <Row label="full width" className="block">
            <Button className="w-full">Celá šířka</Button>
          </Row>
        </Section>

        <Section
          title="Alert"
          description="Pět variant podle Figma (697:1823). Barvy jdou přes tokeny --warning / --tip / --success / --destructive."
        >
          <Row label="warning" className="block">
            <Alert variant="warning">
              <TriangleAlert />
              <AlertDescription>
                <strong>Důležité:</strong> AI není člověk. Nemá vlastní názor,
                emoce ani odpovědnost. Vždy je to pouze nástroj
              </AlertDescription>
            </Alert>
          </Row>

          <Row label="tip" className="block">
            <Alert variant="tip">
              <Lightbulb />
              <AlertTitle>Tip pro promptování:</AlertTitle>
              <AlertDescription>
                Buďte konkrétní. Místo &bdquo;Vytvoř test&ldquo; zkuste
                &bdquo;Vytvoř test z přírodopisu pro 5. třídu na téma rostliny,
                5 otázek ABC.&ldquo;
              </AlertDescription>
            </Alert>
          </Row>

          <Row label="success" className="block">
            <Alert variant="success">
              <CircleCheck />
              <AlertDescription>
                <strong>Důležité:</strong> AI není člověk. Nemá vlastní názor,
                emoce ani odpovědnost. Vždy je to pouze nástroj
              </AlertDescription>
            </Alert>
          </Row>

          <Row label="error" className="block">
            <Alert variant="error">
              <CircleX />
              <AlertDescription>
                <strong>Důležité:</strong> AI není člověk. Nemá vlastní názor,
                emoce ani odpovědnost. Vždy je to pouze nástroj
              </AlertDescription>
            </Alert>
          </Row>

          <Row label="info" className="block">
            <Alert variant="info">
              <MessageSquareWarning />
              <AlertDescription>
                <strong>Důležité:</strong> AI není člověk. Nemá vlastní názor,
                emoce ani odpovědnost. Vždy je to pouze nástroj
              </AlertDescription>
            </Alert>
          </Row>

          <Row label="s akcí" className="block">
            <Alert variant="success">
              <CircleCheck />
              <AlertTitle>Nová verze materiálu</AlertTitle>
              <AlertDescription>
                Autor od vašeho posledního otevření provedl změny.
              </AlertDescription>
              <AlertAction>
                <Button size="xs" variant="outline">
                  Zobrazit
                </Button>
              </AlertAction>
            </Alert>
          </Row>
        </Section>

        <Section
          title="Toast"
          description="Base UI toast přebarvený na paletu alertů — stejné ikony, tint i rádius."
        >
          <Row label="typy">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast.add({
                  type: "success",
                  title: "Kurz publikován",
                  description: "Studenti k němu mají přístup.",
                })
              }
            >
              Success
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast.add({
                  type: "error",
                  title: "Uložení selhalo",
                  description: "Zkontrolujte připojení a zkuste to znovu.",
                })
              }
            >
              Error
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast.add({
                  type: "warning",
                  title: "Nepublikované změny",
                  description: "Máte rozpracovaný modul.",
                })
              }
            >
              Warning
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast.add({
                  type: "info",
                  title: "Nová verze materiálu",
                  description: "Autor provedl změny.",
                })
              }
            >
              Info
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                toast.add({
                  type: "loading",
                  title: "Generuji test…",
                })
              }
            >
              Loading
            </Button>
          </Row>

          <Row label="s akcí">
            <Button
              size="sm"
              onClick={() =>
                toast.add({
                  type: "success",
                  title: "Materiál uložen",
                  description: "Můžete pokračovat v úpravách.",
                  actionProps: { children: "Zobrazit" },
                })
              }
            >
              Toast s tlačítkem
            </Button>
          </Row>
        </Section>

        <Section
          title="Badge"
          description="Stavové pilulky podle Figma (2092:4916) — tint 15 % a plná barva textu."
        >
          <Row label="variant">
            <Badge variant="new">Nové</Badge>
            <Badge variant="open">Otevřené</Badge>
            <Badge variant="waiting">Čeká na uživatele</Badge>
            <Badge variant="resolved">Vyřešené</Badge>
            <Badge variant="closed">Zavřené</Badge>
          </Row>

          <Row label="jako odkaz">
            <Badge variant="open" render={<a href="/ui-kit" />}>
              Otevřené
            </Badge>
          </Row>

          <Row label="state picker">
            <StatusSelect value={status} onValueChange={setStatus} />
            <span className="text-muted-foreground text-xs">
              vybráno: <code>{status}</code>
            </span>
          </Row>
        </Section>

        <Section
          title="Segmented control"
          description="Sjednocený přepínač nad shadcn ToggleGroup (Base UI). Dvě i více možností, vždy zůstane jedna aktivní. solid = filtry, soft = přepínání sekcí."
        >
          <Row label="solid">
            <SegmentedControl size="sm" value={range} onValueChange={setRange}>
              <SegmentedControlItem value="7d">7 dní</SegmentedControlItem>
              <SegmentedControlItem value="30d">30 dní</SegmentedControlItem>
              <SegmentedControlItem value="90d">90 dní</SegmentedControlItem>
              <SegmentedControlItem value="all">Vše</SegmentedControlItem>
            </SegmentedControl>
            <span className="text-muted-foreground text-xs">
              vybráno: <code>{range}</code>
            </span>
          </Row>

          <Row label="soft">
            <SegmentedControl variant="soft" value={tab} onValueChange={setTab}>
              <SegmentedControlItem value="courses">Kurzy</SegmentedControlItem>
              <SegmentedControlItem value="materials">
                Materiály
              </SegmentedControlItem>
            </SegmentedControl>
            <span className="text-muted-foreground text-xs">
              vybráno: <code>{tab}</code>
            </span>
          </Row>

          <Row label="size">
            <SegmentedControl size="sm" defaultValue="courses">
              <SegmentedControlItem value="courses">Kurzy</SegmentedControlItem>
              <SegmentedControlItem value="materials">
                Materiály
              </SegmentedControlItem>
            </SegmentedControl>
            <SegmentedControl defaultValue="courses">
              <SegmentedControlItem value="courses">Kurzy</SegmentedControlItem>
              <SegmentedControlItem value="materials">
                Materiály
              </SegmentedControlItem>
            </SegmentedControl>
          </Row>

          <Row label="celá šířka" className="block">
            <SegmentedControl
              variant="soft"
              defaultValue="courses"
              className="w-full"
            >
              <SegmentedControlItem value="courses" className="flex-1">
                Kurzy
              </SegmentedControlItem>
              <SegmentedControlItem value="materials" className="flex-1">
                Materiály
              </SegmentedControlItem>
            </SegmentedControl>
          </Row>

          <Row label="disabled">
            <SegmentedControl size="sm" defaultValue="30d" disabled>
              <SegmentedControlItem value="7d">7 dní</SegmentedControlItem>
              <SegmentedControlItem value="30d">30 dní</SegmentedControlItem>
              <SegmentedControlItem value="90d">90 dní</SegmentedControlItem>
            </SegmentedControl>
          </Row>
        </Section>

        <Section
          title="Input & Textarea"
          description="Pole z shadcn (Base UI). Focus je šedý prstenec z --ring — a stejný vzhled nově dostávají i nestylované <input>/<select>/<textarea> v celé appce, viz pravidlo v globals.css."
        >
          <Row label="input">
            <Input placeholder="Název kurzu" className="max-w-xs" />
            <Input defaultValue="test" className="max-w-xs" />
          </Row>

          <Row label="stavy">
            <Input placeholder="Disabled" disabled className="max-w-xs" />
            <Input placeholder="Invalid" aria-invalid className="max-w-xs" />
          </Row>

          <Row label="textarea" className="block">
            <Textarea
              placeholder="Stručný popis kurzu…"
              className="max-w-md"
              rows={3}
            />
          </Row>

          <Row label="nativní <input>" className="block">
            {/* Bez jediné focus třídy — prstenec přidává globální pravidlo. */}
            <input
              type="text"
              defaultValue="test"
              className="w-full max-w-md rounded-lg border px-2.5 py-1 text-sm"
            />
          </Row>
        </Section>

        <Section
          title="Tabs"
          description="Base UI tabs ve variantě line — podtržení aktivní záložky. Pro přepínání seznamů, počet se přidává jako Badge vedle názvu."
        >
          <Row label="line + počty" className="block">
            <Tabs defaultValue="unresolved" className="max-w-md">
              <TabsList variant="line" className="w-full justify-start border-b">
                <TabsTrigger value="unresolved" className="flex-none">
                  Nevyřešené
                  <Badge variant="meta" className="px-1.5">
                    1
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="resolved" className="flex-none">
                  Vyřešené
                  <Badge variant="meta" className="px-1.5">
                    0
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="unresolved" className="py-3">
                <p className="text-muted-foreground">
                  Jedna nevyřešená připomínka.
                </p>
              </TabsContent>
              <TabsContent value="resolved" className="py-3">
                <p className="text-muted-foreground">
                  Žádné vyřešené připomínky.
                </p>
              </TabsContent>
            </Tabs>
          </Row>

          <Row label="default" className="block">
            <Tabs defaultValue="content" className="max-w-md">
              <TabsList>
                <TabsTrigger value="content">Obsah</TabsTrigger>
                <TabsTrigger value="tests">Testy</TabsTrigger>
                <TabsTrigger value="settings">Nastavení</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="py-3">
                <p className="text-muted-foreground">Moduly kurzu.</p>
              </TabsContent>
              <TabsContent value="tests" className="py-3">
                <p className="text-muted-foreground">Otázky a varianty.</p>
              </TabsContent>
              <TabsContent value="settings" className="py-3">
                <p className="text-muted-foreground">Publikace a přístupy.</p>
              </TabsContent>
            </Tabs>
          </Row>
        </Section>

        <Section
          title="Select"
          description="Base UI select — popup se šířkou triggeru a zarovnáním na vybranou položku (jako nativní select). Náhrada za <select> ve filtrech."
        >
          <Row label="obtížnost">
            <Select
              items={DIFFICULTY_FILTER_ITEMS}
              value={difficulty}
              onValueChange={(next) => setDifficulty(next as string | null)}
            >
              <SelectTrigger className="w-56" aria-label="Obtížnost">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DIFFICULTY_FILTER_ITEMS.map((item) => (
                    <SelectItem key={item.value ?? "all"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">
              vybráno: <code>{difficulty ?? "vše"}</code>
            </span>
          </Row>

          <Row label="size">
            <Select
              items={SORT_ITEMS}
              value={sort}
              onValueChange={(next) => setSort(next as string)}
            >
              <SelectTrigger size="sm" aria-label="Řazení (sm)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(SORT_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              items={SORT_ITEMS}
              value={sort}
              onValueChange={(next) => setSort(next as string)}
            >
              <SelectTrigger aria-label="Řazení">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(SORT_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Row>

          <Row label="se skupinami">
            <Select items={DIFFICULTY_ITEMS}>
              <SelectTrigger className="w-56" aria-label="Obtížnost podle úrovně">
                <SelectValue placeholder="Vyberte obtížnost" />
              </SelectTrigger>
              {/* Skupiny se štítky se nezarovnávají na vybranou položku —
                  popup se otevře pod triggerem. */}
              <SelectContent alignItemWithTrigger={false} align="start">
                <SelectGroup>
                  <SelectLabel>Základní</SelectLabel>
                  {DIFFICULTY_ORDER.slice(0, 3).map((value) => (
                    <SelectItem key={value} value={value}>
                      {DIFFICULTY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Pokročilé</SelectLabel>
                  {DIFFICULTY_ORDER.slice(3).map((value) => (
                    <SelectItem key={value} value={value}>
                      {DIFFICULTY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Row>

          <Row label="stavy">
            <Select items={SORT_ITEMS} value="newest" disabled>
              <SelectTrigger aria-label="Řazení (disabled)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(SORT_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select items={DIFFICULTY_ITEMS}>
              <SelectTrigger aria-invalid aria-label="Obtížnost (invalid)">
                <SelectValue placeholder="Vyberte obtížnost" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="start">
                <SelectGroup>
                  {DIFFICULTY_ORDER.map((value) => (
                    <SelectItem key={value} value={value}>
                      {DIFFICULTY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Row>
        </Section>

        <Section
          title="Card"
          description="Kurzová karta podle Figma (2120:3141): cover 590×226, gradientový titulek, šedé meta pilulky, linka a patička. Sloty: Image / Header / Title / Description / Action / Content / Meta / Stat / Progress / Footer."
        >
          <Row label="kurz" className="block">
            <Card className="max-w-sm">
              <CardImage>
                <Image
                  src="/courseai2.png"
                  alt=""
                  fill
                  sizes="384px"
                  className="object-cover"
                />
              </CardImage>
              <CardHeader>
                <CardTitle gradient>Jak komunikovat s AI?</CardTitle>
                <CardDescription>
                  V kurzu Jak komunikovat s AI se dozvíte, jak psát jasné a
                  účinné zadání, aby vám AI dávala přesné a praktické odpovědi k
                  vaší práci.
                </CardDescription>
              </CardHeader>
              <CardMeta>
                <Badge variant="meta">86 minut</Badge>
                <Badge variant="meta">Začátečník</Badge>
              </CardMeta>
              <CardFooter>
                <CardStat>
                  <BookMarked />
                  0/4 modulů
                </CardStat>
                <Button size="sm">
                  <ArrowRight data-icon="inline-start" />
                  Začít kurz
                </Button>
              </CardFooter>
            </Card>
          </Row>

          <Row label="kurz s postupem" className="block">
            <Card className="max-w-sm">
              <CardImage>
                <Image
                  src="/courseai2.png"
                  alt=""
                  fill
                  sizes="384px"
                  className="object-cover"
                />
              </CardImage>
              <CardHeader>
                <CardTitle gradient>Jak komunikovat s AI?</CardTitle>
                <CardDescription>
                  V kurzu Jak komunikovat s AI se dozvíte, jak psát jasné a
                  účinné zadání, aby vám AI dávala přesné a praktické odpovědi k
                  vaší práci.
                </CardDescription>
              </CardHeader>
              <CardMeta>
                <Badge variant="meta">86 minut</Badge>
                <Badge variant="meta">Začátečník</Badge>
              </CardMeta>
              <CardFooter className="flex-col items-stretch gap-4">
                <CardProgress value={1} max={3} />
                <Button size="sm" className="self-end">
                  <ArrowRight data-icon="inline-start" />
                  Pokračovat
                </Button>
              </CardFooter>
            </Card>
          </Row>

          <Row label="progress" className="block">
            <div className="max-w-sm space-y-4 rounded-md border border-foreground/20 p-3">
              <CardProgress value={0} max={3} />
              <CardProgress value={2} max={4} />
              <CardProgress value={5} max={5} hint="Dokončeno" />
            </div>
          </Row>

          <Row label='size="sm"' className="block">
            <Card size="sm" className="max-w-sm">
              <CardHeader>
                <CardTitle>Kompaktní varianta</CardTitle>
                <CardDescription>Menší vnitřní odsazení</CardDescription>
                <CardAction>
                  <Button size="icon-sm" variant="ghost" aria-label="Možnosti">
                    <Plus />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Vhodné do postranních panelů a seznamů.
                </p>
              </CardContent>
              <CardFooter>
                <CardStat>
                  <BookMarked />
                  8 modulů · 4 hodiny
                </CardStat>
              </CardFooter>
            </Card>
          </Row>
        </Section>

        <Section
          title="Card — Obsah ke schválení (admin /admin/review)"
          description="Karta ze seznamu obsahu ke schválení. Stav jako Badge, název, počet modulů a autor; položky ke kontrole mají navíc CTA přes celou šířku. Karty drží stejnou výšku, tlačítko je zarovnané dolů."
        >
          <Row label="ke kontrole" className="block">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Diskurzní konektory v češtině", modules: 4 },
                { title: "HIstoriografie", modules: 3 },
                { title: "Franz Kafka", modules: 3 },
                { title: "Základy statistiky pro studium a výzkum", modules: 3 },
              ].map((course) => (
                <Card size="sm" key={course.title} className="h-full">
                  <CardMeta>
                    <Badge variant="new">Ke kontrole</Badge>
                  </CardMeta>
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                    <CardStat>
                      <BookMarked />
                      {course.modules}{" "}
                      {czechPlural(course.modules, "modul", "moduly", "modulů")}
                    </CardStat>
                    <p className="text-muted-foreground truncate text-xs">
                      Autor: Lucie Zušťáková
                    </p>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button size="sm" className="w-full">
                      <ArrowRight data-icon="inline-start" />
                      Začít kurz
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Row>

          <Row label="schváleno" className="block">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Git a verzování kódu – od základů ke spolupráci", modules: 5 },
                { title: "Jak efektivně využívat NotebookLM ke studiu", modules: 3 },
                { title: "Kava", modules: 12 },
                { title: "Test kurz Garant - manuální zadání", modules: 1 },
              ].map((course) => (
                <Card size="sm" key={course.title} className="h-full">
                  <CardMeta>
                    <Badge variant="resolved">Schváleno</Badge>
                  </CardMeta>
                  <CardHeader>
                    <CardTitle>{course.title}</CardTitle>
                    <CardStat>
                      <BookMarked />
                      {course.modules}{" "}
                      {czechPlural(course.modules, "modul", "moduly", "modulů")}
                    </CardStat>
                    <p className="text-muted-foreground truncate text-xs">
                      Autor: Radun Silver v CS2
                    </p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </Row>
        </Section>

        <Section
          title="Dialog"
          description="Postavený na @base-ui/react — portál, overlay a animace jsou součástí."
        >
          <Row label="základní">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" />}>
                Otevřít dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Smazat modul?</DialogTitle>
                  <DialogDescription>
                    Tato akce je nevratná. Modul i jeho materiály budou trvale
                    odstraněny.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Zrušit
                  </DialogClose>
                  <DialogClose render={<Button variant="destructive" />}>
                    Smazat
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger render={<Button />}>Bez zavíracího X</DialogTrigger>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Publikovat kurz</DialogTitle>
                  <DialogDescription>
                    Kurz se zpřístupní všem studentům ve vaší organizaci.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="ghost" />}>
                    Zpět
                  </DialogClose>
                  <DialogClose render={<Button />}>Publikovat</DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Row>
        </Section>
      </div>
    </main>
  );
}
