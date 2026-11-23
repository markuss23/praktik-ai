# Kompetence (`competences`)

Diagnostika kompetencí KRAUU ze skóre dokončených testů. Student vidí svůj profil (silné a slabé oblasti, růst). Superadmin vidí agregaci přes všechny uživatele. Nic se neukládá, vše se počítá při dotazu.

## Pojmy

| Pojem | Význam |
| --- | --- |
| Zdroj | Modul (nebo kurz u `course_final`), ze kterého skóre pochází. |
| Vstup | Skóre z prvního dokončeného `pretest` na konfiguraci. |
| Výstup | Skóre z posledního dokončeného `assessment` nebo `course_final` na konfiguraci. |
| `delta` / `paired_delta` | Výstup minus vstup. U statistik jen přes uživatele, kteří mají obojí. |
| `krauu_from_course` | Modul nemá vlastní KRAUU (nebo jde o `course_final`), použily se kompetence kurzu. |
| Historie | Všechny dokončené sessions dané kompetence včetně `practice` a opakovaných pokusů. `answers`, `correct`, `avg_elapsed_s` jsou z `assessment_turn`. U starších sessions jsou `null`. |

## Endpointy

| Endpoint | Kdo | Co vrací |
| --- | --- | --- |
| `GET /competences/my` | `user` | Profil přihlášeného uživatele po kompetencích: vstup, výstup, delta, zdroje, historie. |
| `GET /competences/stats?course_id=` | `superadmin` | Po kompetencích: počty uživatelů, průměry vstupu a výstupu, párová delta, `answer_accuracy`, rozpad po zdrojích. |

## Pravidla

- Počítá se jen session, která je aktivní, má `finished_at` a `score` a není `abandoned`. Kurz musí být aktivní.
- Session se mapuje na KRAUU modulu. Když modul žádné nemá, nebo jde o `course_final`, použijí se KRAUU kurzu.
- Více konfigurací na stejném zdroji se zprůměruje. Hodnota uživatele za kompetenci = průměr přes zdroje. Statistika = průměr přes uživatele.
- `users` zahrnuje i uživatele, kteří mají u kompetence jen `practice`.
- Výstup obsahuje jen kompetence, ke kterým existují data, seřazené podle `code`. Úplný číselník je v `catalogs`.
