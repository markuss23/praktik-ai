# 🎯 Techniky efektivního promptování

**Modul 2 | Aktivita A4 | Learn**

---

## 🎯 Co se naučíte

Po této lekci budete znát 5 klíčových technik, které promění průměrný prompt v efektivní nástroj. Každou techniku si ukážeme na konkrétních příkladech z učitelské praxe.

---

## 5 klíčových technik promptování

### 1️⃣ JASNOST - Buďte přesní a jednoznačný

**Princip:** Každé slovo má význam. Vyhněte se vágním výrazům.

#### Vágní slova, kterým se vyhnout:
- "nějaký", "trochu", "asi", "možná"
- "zajímavý", "dobrý", "pěkný" (co to konkrétně znamená?)
- "krátký", "dlouhý" (místo toho: počet slov/vět)

#### Příklad transformace:

❌ **VÁGNÍ:**
```
Napiš nějaký text o zvířatech pro děti.
```

✅ **JASNÝ:**
```
Napiš 150 slov dlouhý text o tučňácích pro děti ve věku 8-10 let. 
Vysvětli, kde žijí, co jedí, a uveď jednu překvapivou zajímavost.
```

**Co se změnilo:**
- "nějaký text" → "150 slov dlouhý text"
- "o zvířatech" → "o tučňácích"
- "pro děti" → "pro děti ve věku 8-10 let"
- Přidány konkrétní body, co text má obsahovat

---

### 2️⃣ KONTEXT - Poskytněte potřebné informace

**Princip:** AI neví nic o vaší situaci. Řekněte jí to.

#### Klíčové kontextové informace:
- **Kdo:** Pro koho je to určeno? (věk, úroveň znalostí)
- **Kde:** V jakém prostředí se to použije? (třída, domácí úkol, zkouška)
- **Proč:** Jaký je účel? (naučit nový koncept, procvičit, otestovat)
- **Jak:** Jaká jsou omezení? (čas, prostor, zdroje)

#### Příklad:

❌ **BEZ KONTEXTU:**
```
Vytvoř cvičení na slovní druhy.
```

✅ **S KONTEXTEM:**
```
Vytvoř 10minutové cvičení na rozlišování podstatných jmen a přídavných jmen 
pro žáky 5. třídy ZŠ, kteří mají problém s tímto rozlišováním.
Cvičení bude probíhat na tabletu, takže může být interaktivní.
```

**Proč je kontext důležitý:**
- AI ví, že má jít o krátké cvičení (10 min)
- Zná úroveň (5. třída) a problematiku (obtíže s rozlišováním)
- Může využít interaktivní prvky (tablet)

---

### 3️⃣ PŘÍKLADY - Ukažte, co chcete

**Princip:** Jeden příklad řekne více než 100 slov vysvětlení.

#### Kdy použít příklady:
- Když chcete specifický styl nebo formát
- Když slova nestačí k vysvětlení
- Když chcete konzistentní výstupy

#### Příklad:

❌ **BEZ PŘÍKLADU:**
```
Vytvoř otázky na porozumění textu.
```

✅ **S PŘÍKLADEM:**
```
Vytvoř 5 otázek na porozumění textu ve stejném stylu jako tento příklad:

Příklad otázky:
"V textu se píše, že Martin váhal. Co mohlo být důvodem jeho váhání? 
Opři svou odpověď o konkrétní části textu."

[zde přiložený text, ze kterého mají být otázky]
```

**Bonus tip:** Můžete poskytnout i příklad špatné odpovědi, kterou NECHCETE:
```
NECHCI otázky typu: "Jak se jmenuje hlavní postava?" (příliš jednoduché)
CHCI otázky, které vyžadují přemýšlení a propojování informací.
```

---

### 4️⃣ ROLE - Přiřaďte AI identitu

**Princip:** Když AI dostane roli, lépe chápe perspektivu a tón, který má použít.

#### Efektivní role:
- "Jsi učitel chemie pro střední školy..."
- "Jsi školní psycholog pomáhající studentům s úzkostí..."
- "Jsi zkušený mentor začínajících učitelů..."

#### Příklad:

❌ **BEZ ROLE:**
```
Poraď, jak zvládnout problémového studenta.
```

✅ **S ROLÍ:**
```
Jsi zkušený třídní učitel s 15 lety praxe, který se specializuje 
na práci s náročnými studenty. 

Mám ve třídě studenta, který ruší hodinu vtipkováním a rozptyluje ostatní.
Zkusil jsem s ním mluvit po hodině, ale nezlepšilo se to.

Navrhni 3 konkrétní strategie, jak situaci řešit, a vysvětli 
u každé, proč by mohla fungovat.
```

**Co role přináší:**
- AI ví, z jaké perspektivy má odpovídat
- Odpověď bude praktičtější a zkušenější
- Tón bude vhodný pro situaci

---

### 5️⃣ FORMÁT VÝSTUPU - Specifikujte, jak má odpověď vypadat

**Princip:** Konkrétní formát = předvídatelný a použitelný výstup.

#### Běžné formáty:
- **Seznam** - odrážky, číslované body
- **Tabulka** - strukturovaná data
- **Krok za krokem** - postupy, návody
- **Šablona** - s místy k vyplnění
- **Dialog** - konverzace mezi postavami
- **Osnova** - hierarchická struktura

#### Příklad 1: Tabulka

```
Vytvoř tabulku porovnávající fotosyntézu a dýchání rostlin.
Tabulka má mít 3 sloupce: Proces, Vstupy, Výstupy
a 2 řádky: Fotosyntéza, Dýchání
```

#### Příklad 2: Krok za krokem

```
Vytvoř podrobný postup, jak naučit žáky základní školy dělení se zbytkem.
Formát:
Krok 1: [název kroku]
   Aktivita: [co dělají žáci]
   Učitel říká: [přesná slova]
   Příklad: [konkrétní příklad]

[opakuj pro kroky 2-5]
```

#### Příklad 3: Šablona s místy k vyplnění

```
Vytvoř šablonu pro žáky, jak napsat recenzi knihy.
Formát šablony:

RECENZE KNIHY
Název knihy: _______________
Autor: _______________

1. O čem kniha je (2-3 věty):
[prostor pro odpověď]

2. Moje oblíbená postava a proč:
[prostor pro odpověď]

[atd.]
```

---

## 🎨 Kombinace technik = Mocný prompt

**Nejlepší výsledky dostanete, když techniky kombinujete!**

### Příklad komplexního promptu:

```
[ROLE]
Jsi učitelka anglického jazyka se specializací na tvůrčí psaní 
pro střední školy.

[KONTEXT]
Potřebuji vytvořit domácí úkol pro studenty 2. ročníku střední školy. 
Právě jsme probírali popisný jazyk a metafory. Mají 1 týden na zpracování.

[ÚKOL S JASNOSTÍ]
Vytvoř zadání tvůrčího úkolu, kde studenti napíší 300-400 slov dlouhý popis 
místa, které je pro ně důležité. V popisu musí použít minimálně 3 metafory 
a 5 smyslových detailů (co vidí, slyší, cítí, voní, co se dotýkají).

[FORMÁT]
Zadání strukturuj takto:
1. Úvodní motivace (2-3 věty, proč je úkol důležitý)
2. Přesné pokyny (co, jak dlouze, jaké prvky musí obsahovat)
3. Hodnotící kritéria (5 bodů, na co se budu dívat)
4. Jeden inspirativní příklad dobře napsané věty s metaforou

[PŘÍKLAD]
Podobně jako v úkolu na popis postavy z minulé hodiny, kde studenti 
používali přirovnání.
```

**Co tento prompt má:**
✅ Roli (učitelka s expertizou)
✅ Kontext (úroveň studentů, co se učili, časový rámec)
✅ Jasnost (přesný počet slov, konkrétní prvky)
✅ Formát výstupu (strukturované zadání)
✅ Odkaz na příklad (minulý úkol)

---

## 💡 Rychlý checklist dobrého promptu

Když píšete prompt, zeptejte se:

- [ ] Je **JASNÉ**, co chci? (konkrétní slova, čísla, termíny)
- [ ] Poskytl jsem dostatek **KONTEXTU**? (kdo, kde, proč, jak)
- [ ] Pomohl by mi **PŘÍKLAD**? (ukázat formát nebo styl)
- [ ] Má AI správnou **ROLI**? (perspektiva, expertíza)
- [ ] Specifikoval jsem **FORMÁT** výstupu? (seznam, tabulka, dialog...)

Pokud na všech 5 je ✅, váš prompt je silný! 💪

---

## 🎓 Aplikace ve výuce

### Kdy použít jakou techniku:

**Příprava materiálů:**
- JASNOST + FORMÁT → precizní materiály
- Příklad: "Vytvoř 10 příkladů na slovní úlohy s rovnicemi. Formát: situace, otázka, správný výsledek."

**Přizpůsobení obsahu:**
- KONTEXT + ROLE → adekvátní úroveň
- Příklad: "Jsi učitel biologie. Vysvětli fotosyntézu pro žáky 6. třídy, kteří vidí tento koncept poprvé."

**Generování testů:**
- PŘÍKLADY + FORMÁT → konzistentní otázky
- Příklad: "Vytvoř 5 otázek ve stejném formátu jako tato ukázková otázka: [ukázka]"

**Zpětná vazba studentům:**
- ROLE + KONTEXT → vhodný tón a hloubka
- Příklad: "Jsi mentor. Student je citlivý na kritiku. Poraď mu, jak zlepšit esej, bez demotivace."

---

## 📝 Zkuste si to

Než půjdete dál:

1. **Která technika vás nejvíce překvapila?**
2. **Kde ve své práci byste mohli použít kombinaci technik?**
3. **Zkuste v hlavě zformulovat prompt na přípravu vaší příští hodiny - obsahuje všech 5 technik?**

---

**Další krok:** V aktivitě A5 budete přepisovat slabé prompty pomocí těchto technik. Je čas si to vyzkoušet!
