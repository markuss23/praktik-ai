# 📐 Struktura a formátování promptu

**Modul 3 | Aktivita A7 | Learn**

---

## 🎯 Co se naučíte

Po této lekci budete vědět, jak strukturovat a formátovat prompty tak, aby byly přehledné, snadno čitelné pro AI i pro vás samotné. Naučíte se, kdy použít krátký prompt a kdy dlouhý komplexní.

---

## Proč struktura záleží?

### Představte si dva scénáře:

**Scénář A:** Dostanete email s jedním dlouhým odstavcem bez mezer, kde je všechno namícháno dohromady...

**Scénář B:** Dostanete email s jasnou strukturou, oddělenými sekcemi, odrážkami...

**Který email se vám lépe čte a reaguje na něj?** 

Stejně tak funguje AI - strukturovaný prompt je pro ni snazší "pochopit" a odpovědět přesně.

---

## Základní struktura efektivního promptu

### 📋 Osvědčená šablona:

```
[1. ROLE/KONTEXT]
Kdo jsi / v jaké situaci se nacházíme

[2. ÚKOL]
Co konkrétně má AI udělat

[3. POŽADAVKY/OMEZENÍ]
Pravidla, která je nutné dodržet

[4. FORMÁT VÝSTUPU]
Jak má výsledek vypadat

[5. PŘÍKLADY] (volitelné)
Ukázka požadovaného výstupu
```

### Příklad použití šablony:

```
[ROLE]
Jsi konzultant pro vzdělávací technologie pomáhající učitelům 
integrovat digitální nástroje do výuky.

[ÚKOL]
Navrhni 3 způsoby, jak využít tablety ve výuce dějepisu pro 8. třídu 
při tématu "První světová válka".

[POŽADAVKY]
- Každá aktivita trvá max. 20 minut
- Studenti pracují ve skupinách 3-4
- Škola má 10 tabletů k dispozici
- Musí využívat bezplatné aplikace

[FORMÁT]
Pro každou aktivitu uveď:
1. Název aktivity
2. Potřebné aplikace/nástroje
3. Krok za krokem instrukce
4. Vzdělávací cíl

[PŘÍKLAD]
Podobně jako když jsme dělali aktivitu s virtuální prohlídkou muzea.
```

---

## 🎨 Formátovací techniky

### 1️⃣ **Odstavce a mezery**

❌ **Špatně:**
```
Vytvoř test z matematiky na téma procenta obsahuje 10 otázek 5 jednoduchých 3 střední 2 těžké každá otázka má 4 možnosti odpovědi správná odpověď je vždy jedna...
```

✅ **Dobře:**
```
Vytvoř test z matematiky na téma procenta.

Požadavky:
- Celkem 10 otázek
- 5 jednoduchých, 3 střední obtížnosti, 2 těžké
- Každá otázka má 4 možnosti odpovědi
- Správná odpověď je vždy jedna

Pro každou otázku uveď i správnou odpověď s krátkým vysvětlením.
```

**Proč to funguje:** AI jasně vidí oddělené požadavky.

---

### 2️⃣ **Odrážky a seznamy**

Používejte pro:
- Výčty požadavků
- Kritéria
- Kroky postupu
- Příklady

```
Vytvoř plán hodiny na téma "Fotosyntéza" s těmito prvky:
• Úvodní aktivita (5 min) - aktivizace
• Výklad nového učiva (15 min) - s vizualizací
• Skupinová práce (20 min) - experiment
• Shrnutí a reflexe (5 min)
```

---

### 3️⃣ **Číslování**

Používejte pro:
- Pořadí kroků
- Priority
- Části struktury

```
Vytvoř zpětnou vazbu k eseji studenta v tomto pořadí:
1. Začni pozitivní poznámkou (co se povedlo)
2. Vyber 2-3 hlavní oblasti ke zlepšení
3. Pro každou oblast:
   a) Vysvětli problém
   b) Uveď konkrétní příklad z textu
   c) Navrhni, jak to zlepšit
4. Zakonči povzbuzením
```

---

### 4️⃣ **Vizuální oddělovače**

Pro dlouhé prompty používejte vizuální oddělení sekcí:

```
=== KONTEXT ===
[zde kontext]

=== ÚKOL ===
[zde úkol]

=== FORMÁT VÝSTUPU ===
[zde formát]
```

Nebo:

```
--- ROLE ---
[role]

--- ČAS A MATERIÁLY ---
[omezení]

--- OČEKÁVANÝ VÝSTUP ---
[formát]
```

---

### 5️⃣ **Zvýraznění klíčových informací**

Použijte kapitálky, VERZÁLKY nebo **tučné písmo** pro důležité body:

```
Vytvoř pracovní list na slovní úlohy.

DŮLEŽITÉ:
- Všechny výsledky musí být CELÁ ČÍSLA
- Situace musí být z každodenního života 10letých dětí
- NEPOUŽÍVEJ příklady s penězi (děti nemají kapesné)
```

---

## 📏 Krátký vs. dlouhý prompt - kdy použít?

### ⚡ KRÁTKÝ PROMPT (1-3 věty)

**Kdy použít:**
- Jednoduchý, přímočarý úkol
- Jasné téma bez nuancí
- Nízká potřeba kontroly nad výstupem

**Příklady:**
```
"Vysvětli Pythagorovu větu jednoduše pro 7. třídu."

"Dej mi 5 příkladů na slovesa pohybu v angličtině."

"Vytvoř krátkou básničku o podzimu pro děti."
```

**Výhody:**
✅ Rychlé napsání
✅ Přehledné
✅ Stačí na jednoduché úkoly

**Nevýhody:**
❌ Menší kontrola nad výsledkem
❌ AI může "hádat" vaše požadavky
❌ Výsledek může být překvapivý

---

### 📚 DLOUHÝ PROMPT (5+ vět, strukturovaný)

**Kdy použít:**
- Komplexní úkol s více požadavky
- Potřebujete specifický formát
- Důležitá je přesnost a kvalita
- Použijete výstup ve své práci

**Příklad:**
```
ROLE: Jsi učitel matematiky specializující se na žáky s dyskalkulií.

KONTEXT: Tvořím individuální plán pro žáka 6. třídy, který má problémy 
s prostorovou představivostí a porozuměním geometrickým tvarům.

ÚKOL: Navrhni 5 postupných aktivit (od nejjednodušší po složitější), 
které pomohou žákovi pochopit vlastnosti trojúhelníků.

POŽADAVKY:
- Každá aktivita 10-15 minut
- Používá hmatové a vizuální pomůcky
- Postupuje od konkrétního k abstraktnímu
- Zahrnuje pozitivní zpětnou vazbu

FORMÁT PRO KAŽDOU AKTIVITU:
1. Název
2. Potřebné pomůcky
3. Krok za krokem postup
4. Co žák pochopí (cíl)
5. Jak poznat, že žák rozumí (indikátor úspěchu)
```

**Výhody:**
✅ Velká kontrola nad výsledkem
✅ Přesný, použitelný výstup
✅ Méně potřeba oprav a iterací

**Nevýhody:**
❌ Zabere více času na napsání
❌ Může být "overkill" pro jednoduché věci

---

## 🎯 Pravidlo rozhodování

```
JEDNODUCHÝ úkol + NÍZKÉ nároky na přesnost = KRÁTKÝ prompt
       ↓
"Dej mi 3 nápady na projekt z biologie."

KOMPLEXNÍ úkol + VYSOKÉ nároky na přesnost = DLOUHÝ prompt
       ↓
[Strukturovaný prompt s role, kontextem, požadavky, formátem]
```

---

## 💡 Praktické tipy

### ✅ DĚLEJTE:

1. **Používejte konzistentní formátování**
   - Pokud používáte odrážky, držte se jich
   - Pokud číslujete, dělejte to systematicky

2. **Oddělte sekce**
   - Role ≠ Úkol ≠ Formát
   - Každá má své místo

3. **Používejte bílé místo**
   - Mezery mezi odstavci
   - Prázdné řádky mezi sekcemi

4. **Buďte konzistentní v terminologii**
   - Pokud řeknete "žáci", neměňte to na "studenty"
   - Pokud řeknete "aktivita", neměňte to na "cvičení"

5. **Testujte a iterujte**
   - První verze nemusí být dokonalá
   - Upravte, co nefunguje

### ❌ NEDĚLEJTE:

1. **Nedávejte vše do jednoho odstavce**
   - Je to nečitelné pro AI i pro vás

2. **Nepřehánějte to s formátováním**
   - Příliš mnoho **tučného** nebo VERZÁLEK je rušivé

3. **Nemíchejte různé formátovací styly**
   - Buď odrážky, nebo čísla - ne oboje najednou bezúčelně

4. **Nezapomínejte na to, kdo prompt čte**
   - Vy za měsíc
   - Kolega, kterému ho pošlete
   - AI, která ho zpracovává

---

## 📝 Šablony pro rychlý start

### Šablona 1: Příprava výukového materiálu

```
ROLE: [Jakou expertízu má AI mít]
PŘEDMĚT: [Předmět a téma]
CÍLOVÁ SKUPINA: [Věk, úroveň, speciální potřeby]

ÚKOL:
Vytvoř [typ materiálu] na téma [téma].

POŽADAVKY:
- [požadavek 1]
- [požadavek 2]
- [požadavek 3]

FORMÁT:
[Jak má výsledek vypadat]
```

### Šablona 2: Hodnocení a zpětná vazba

```
KONTEXT:
Student: [charakteristika studenta]
Zadání bylo: [původní zadání]
Student odevzdal: [popis nebo text práce]

ÚKOL:
Poskytni zpětnou vazbu zaměřenou na:
1. [aspekt 1]
2. [aspekt 2]
3. [aspekt 3]

TÓN: [povzbuzující/kritický/neutrální]
DÉLKA: [krátká/střední/detailní]
```

### Šablona 3: Řešení problému ve třídě

```
SITUACE:
[Popis problému ve třídě]

KONTEXT:
- Věk žáků: [věk]
- Velikost třídy: [počet]
- Speciální okolnosti: [pokud existují]

CO POTŘEBUJI:
[Konkrétní typ řešení - strategie, aktivita, plán...]

KRITÉRIA:
- Musí být realizovatelné v [časový rámec]
- Dostupné zdroje: [co máte k dispozici]
- Preferovaný přístup: [pokud máte]
```

---

## 🎓 Cvičení na závěr

Než půjdete dál, zkuste:

1. **Vezměte svůj poslední "špatný" prompt**
   - Který prompt jste nedávno použili a výsledek nebyl ideální?
   - Jak byste ho přestrukturovali s dnešními znalostmi?

2. **Vytvořte si vlastní šablonu**
   - Pro typ úkolu, který děláte nejčastěji
   - Bude vám sloužit dlouhodobě

3. **Porovnejte krátký vs. dlouhý**
   - Zkuste stejný úkol napsat jako krátký (3 věty) a dlouhý (strukturovaný) prompt
   - Zamyslete se, která verze by dala lepší výsledek

---

## 💡 Co si zapamatovat

✅ **Struktura = čitelnost**
- Pro AI i pro vás

✅ **Formátování pomáhá**
- Odrážky, čísla, mezery, zvýraznění

✅ **Krátký ≠ špatný**
- Někdy je krátký prompt dost

✅ **Dlouhý ≠ komplikovaný**
- Strukturovaný prompt je snazší zpracovat

✅ **Šablony šetří čas**
- Vytvořte si vlastní pro opakující se úkoly

---

**Další krok:** V aktivitě A8 budete vytvářet svůj první strukturovaný prompt pro výukovou aktivitu. S AI Mentorem po boku to zvládnete! 💪
