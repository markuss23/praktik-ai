"""Didaktická kvalita AI otázek — pravidla z prompt.md, která jdou ověřit strojově.

Rychlé testy ověřují checker a zpracování výstupu LLM (LLM je mock).
Živý test volá skutečný model (klíče z kořenového .env):
RUN_LLM_TESTS=1 uv run --env-file ../.env pytest tests -k live -s
"""

import os
import re
from unittest.mock import MagicMock, patch

import pytest

from agents.base.llm import LLMConfig
from api.src.assessments.closed_questions.schemas import ClosedQuestionItem
from api.src.assessments.closed_questions_ai.agents.generator import nodes
from api.src.assessments.closed_questions_ai.agents.generator.nodes import (
    GeneratedQuestion,
    GeneratedQuestions,
)

BANNED_OPTIONS = ("všechny uvedené", "žádná z uvedených", "všechny výše", "žádná výše")


def _norm(text: str) -> str:
    return " ".join(text.lower().split()).rstrip(".")


def didactic_issues(questions: list[ClosedQuestionItem], count: int) -> list[str]:
    """Vrátí seznam porušených pravidel (prázdný = sada je v pořádku)."""
    issues = []
    if len(questions) != count:
        issues.append(f"počet otázek {len(questions)} != {count}")

    texts = [_norm(q.question) for q in questions]
    if len(set(texts)) != len(texts):
        issues.append("otázky se opakují")

    for i, q in enumerate(questions, 1):
        opts = [_norm(o) for o in q.options]
        if not 3 <= len(opts) <= 4:
            issues.append(f"Q{i}: {len(opts)} možností místo 3–4")
        if len(set(opts)) != len(opts):
            issues.append(f"Q{i}: duplicitní možnosti")
        if any(b in o for o in opts for b in BANNED_OPTIONS):
            issues.append(f"Q{i}: zakázaná možnost typu 'všechny/žádná z uvedených'")
        if len(re.findall(r"[.?!](\s|$)", q.question.strip())) > 2:
            issues.append(f"Q{i}: otázka má víc než 2 věty")
        # ponytail: hrubá heuristika délky; sémantiku (věrohodné distraktory,
        # porozumění vs. memorování) ověří až LLM-as-judge, pokud bude potřeba
        others = [len(o) for j, o in enumerate(q.options) if j != q.correct_index]
        if len(q.options[q.correct_index]) > 2 * max(others):
            issues.append(f"Q{i}: správná možnost výrazně delší než ostatní")
    return issues


def q(question="Co je fotosyntéza?", options=None, correct_index=0):
    return ClosedQuestionItem(
        question=question,
        options=options
        or ["Tvorba cukrů ze světla", "Rozklad cukrů na energii", "Kvašení cukrů"],
        correct_index=correct_index,
    )


GOOD = [
    q(),
    q(
        "Kde probíhá fotosyntéza?",
        ["V chloroplastech", "V mitochondriích", "V jádře", "V ribozomech"],
        0,
    ),
]


# --- checker ----------------------------------------------------------------


def test_good_set_has_no_issues():
    assert didactic_issues(GOOD, 2) == []


@pytest.mark.parametrize(
    "questions,count,expected",
    [
        (GOOD, 3, "počet otázek"),
        ([q(), q()], 2, "opakují"),
        ([q(options=["Ano", "Ne"])], 1, "2 možností"),
        ([q(options=["a", "b", "c", "d", "e"])], 1, "5 možností"),
        ([q(options=["Dýchání", "dýchání ", "Kvašení"])], 1, "duplicitní"),
        ([q(options=["Dýchání", "Kvašení", "Všechny uvedené"])], 1, "zakázaná"),
        ([q(question="Věta jedna. Věta dvě. Co je to?")], 1, "víc než 2 věty"),
        (
            [
                q(
                    options=[
                        "Proces, při kterém rostliny ze světla, vody a CO2 tvoří cukry",
                        "Dýchání",
                        "Kvašení",
                    ]
                )
            ],
            1,
            "výrazně delší",
        ),
    ],
    ids=[
        "count",
        "duplicate-q",
        "too-few",
        "too-many",
        "dup-option",
        "banned",
        "long-q",
        "long-correct",
    ],
)
def test_checker_catches(questions, count, expected):
    issues = didactic_issues(questions, count)
    assert any(expected in i for i in issues), issues


# --- zpracování výstupu LLM (mock) -------------------------------------------


def run_generate(generated: list[GeneratedQuestion], count: int) -> dict:
    llm = MagicMock()
    llm.with_structured_output.return_value.invoke.return_value = GeneratedQuestions(
        questions=generated
    )
    with (
        patch.object(nodes, "get_llm_config", return_value=LLMConfig("m", "")),
        patch.object(nodes, "create_chat_llm", return_value=llm),
    ):
        return nodes.generate_questions(
            {
                "db": None,
                "course_id": 1,
                "module_id": 1,
                "count": count,
                "learn_content": "text",
            }
        )


def gq(question="Q?", options=("a", "b", "c"), correct_index=0):
    return GeneratedQuestion(
        question=question, options=list(options), correct_index=correct_index
    )


def test_generate_trims_to_requested_count():
    out = run_generate([gq(f"Q{i}?") for i in range(5)], count=3)
    assert len(out["questions"]) == 3


def test_generate_skips_invalid_questions():
    out = run_generate(
        [gq("OK?"), gq("Mimo?", correct_index=7), gq("Jedna?", options=["a"])],
        count=3,
    )
    assert [x.question for x in out["questions"]] == ["OK?"]


def test_generate_all_invalid_returns_error():
    out = run_generate([gq(correct_index=9)], count=1)
    assert "error" in out and "questions" not in out


def test_shuffle_keeps_correct_answer():
    out = run_generate([gq(f"Q{i}?", ("x", "y", "z", "w"), 2) for i in range(20)], 20)
    for item in out["questions"]:
        assert item.options[item.correct_index] == "z"
    # bez zamíchání by byla správná vždy na indexu 2 — šance na to je (1/4)^20
    assert {item.correct_index for item in out["questions"]} != {2}


# --- živý test se skutečným LLM -----------------------------------------------

LEARN_CONTENT = """## Fotosyntéza
Fotosyntéza je proces, při kterém rostliny, řasy a některé bakterie přeměňují
světelnou energii na chemickou. Probíhá v chloroplastech, které obsahují
zelené barvivo chlorofyl. Z oxidu uhličitého a vody vzniká glukóza a jako
vedlejší produkt se uvolňuje kyslík.

## Světelná a temnostní fáze
Ve světelné fázi se na thylakoidních membránách štěpí voda a vzniká ATP
a NADPH. V temnostní fázi (Calvinův cyklus) ve stromatu chloroplastu se
pomocí ATP a NADPH váže oxid uhličitý do organických látek. Temnostní fáze
světlo přímo nepotřebuje, ale závisí na produktech světelné fáze.

## Význam
Fotosyntéza je zdrojem většiny kyslíku v atmosféře a základem potravních
řetězců. Rychlost fotosyntézy ovlivňuje intenzita světla, koncentrace CO2
a teplota."""


@pytest.mark.skipif(not os.getenv("RUN_LLM_TESTS"), reason="RUN_LLM_TESTS=1 zapne")
def test_live_generated_questions_are_didactically_sound():
    model = os.getenv("LLM_TEST_MODEL", "claude-opus-5-5")
    count = 5
    with patch.object(nodes, "get_llm_config", return_value=LLMConfig(model, "")):
        out = nodes.generate_questions(
            {
                "db": None,
                "course_id": 1,
                "module_id": 1,
                "count": count,
                "learn_content": LEARN_CONTENT,
            }
        )

    assert "error" not in out, out.get("error")
    questions = out["questions"]
    for item in questions:
        print(item.question, item.options, "->", item.options[item.correct_index])
    assert didactic_issues(questions, count) == []
