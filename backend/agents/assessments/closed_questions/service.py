"""
Interakční formát 'Uzavřené otázky'.

Průběh: při startu se z lektorovy sady vybere (a zamíchá) sada otázek,
student je prochází po jedné tahem ``option``. Po každé odpovědi dostane
okamžitou zpětnou vazbu, po poslední otázce se spočítá skóre proti
``pass_threshold`` a session končí ve stavu ``passed``/``failed``.

Formát nepoužívá LLM — vyhodnocení je deterministické. Správné odpovědi
žijí jen v ``settings_snapshot`` a klientovi se nikdy neposílají; view
obsahuje pouze texty možností v zamíchaném pořadí.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone

from agents.assessments.base import BaseAssessmentService, TurnResult, register
from agents.assessments.closed_questions.settings import ClosedQuestionsSettings
from agents.assessments.schemas import (
    ClosedQuestionView,
    OptionTurnInput,
    ResultView,
    TurnInput,
)
from api.enums import AssessmentSessionStatus, AssessmentTurnRole


@register
class ClosedQuestionsService(BaseAssessmentService):
    type_code = "closed_questions"
    settings_schema = ClosedQuestionsSettings

    async def start(self) -> TurnResult:
        cfg: ClosedQuestionsSettings = self.settings

        # Výběr a pořadí otázek — indexy do settings_snapshot.questions.
        # Ukládá se do result, aby refresh stránky nevylosoval jinou sadu.
        question_order = list(range(len(cfg.questions)))
        random.shuffle(question_order)
        if cfg.num_questions is not None:
            question_order = question_order[: cfg.num_questions]

        # Permutace možností per otázka: option_orders[i][j] = původní index
        # možnosti zobrazené na pozici j u i-té otázky.
        option_orders: list[list[int]] = []
        for question_index in question_order:
            order = list(range(len(cfg.questions[question_index].options)))
            if cfg.shuffle_options:
                random.shuffle(order)
            option_orders.append(order)

        self.update_result(
            question_order=question_order,
            option_orders=option_orders,
            current=0,
            correct_count=0,
            last_answer_correct=None,
        )
        self.add_turn(
            AssessmentTurnRole.system,
            content=f"Vybráno {len(question_order)} otázek",
            payload={"question_order": question_order},
        )

        return TurnResult(
            status=AssessmentSessionStatus.in_progress,
            view=self._question_view(),
        )

    async def handle_turn(self, turn: TurnInput) -> TurnResult:
        if not isinstance(turn, OptionTurnInput):
            raise ValueError(
                f"Formát 'Uzavřené otázky' nepodporuje tah '{turn.kind}' — "
                "očekává se tah 'option'"
            )

        cfg: ClosedQuestionsSettings = self.settings
        result = self.session.result or {}
        current: int = result["current"]
        question_order: list[int] = result["question_order"]
        option_orders: list[list[int]] = result["option_orders"]

        question = cfg.questions[question_order[current]]
        option_order = option_orders[current]
        if turn.option_index >= len(option_order):
            raise ValueError(
                f"Otázka má jen {len(option_order)} možností "
                f"(posláno option_index={turn.option_index})"
            )

        # Přemapování zobrazené pozice zpět na původní index možnosti
        chosen_original_index = option_order[turn.option_index]
        is_correct = chosen_original_index == question.correct_index

        self.add_turn(
            AssessmentTurnRole.student,
            content=question.options[chosen_original_index],
            payload={
                "question_index": question_order[current],
                "selected_option_index": chosen_original_index,
                "is_correct": is_correct,
            },
        )

        correct_count = result["correct_count"] + int(is_correct)
        current += 1
        self.update_result(
            current=current,
            correct_count=correct_count,
            last_answer_correct=is_correct,
        )

        if current < len(question_order):
            return TurnResult(
                status=AssessmentSessionStatus.in_progress,
                view=self._question_view(),
            )
        return self._finish(correct_count, len(question_order))

    def current_view(self):
        if self.session.status != AssessmentSessionStatus.in_progress:
            return self._result_view()
        return self._question_view()

    # ---------- interní ----------

    def _finish(self, correct_count: int, total: int) -> TurnResult:
        cfg: ClosedQuestionsSettings = self.settings
        score = round(correct_count / total * 100, 1)
        is_passed = score >= cfg.pass_threshold * 100

        self.session.score = score
        self.session.is_passed = is_passed
        self.session.finished_at = datetime.now(timezone.utc)

        return TurnResult(
            status=(
                AssessmentSessionStatus.passed
                if is_passed
                else AssessmentSessionStatus.failed
            ),
            view=self._result_view(correct_count=correct_count, total=total),
        )

    def _question_view(self) -> ClosedQuestionView:
        cfg: ClosedQuestionsSettings = self.settings
        result = self.session.result or {}
        current: int = result["current"]
        question_order: list[int] = result["question_order"]

        question = cfg.questions[question_order[current]]
        option_order = result["option_orders"][current]

        return ClosedQuestionView(
            question=question.question,
            options=[question.options[i] for i in option_order],
            question_number=current + 1,
            total_questions=len(question_order),
            last_answer_correct=result.get("last_answer_correct"),
        )

    def _result_view(
        self, correct_count: int | None = None, total: int | None = None
    ) -> ResultView:
        result = self.session.result or {}
        if correct_count is None:
            correct_count = result.get("correct_count", 0)
        if total is None:
            total = len(result.get("question_order", []))

        verdict = "Úspěšně splněno" if self.session.is_passed else "Nesplněno"
        return ResultView(
            score=self.session.score,
            is_passed=self.session.is_passed,
            message=f"{verdict} — {correct_count} z {total} otázek správně.",
        )
