from agents.course_generator.state import CourseInput

READING_CAP_MAX_MINUTES = 10
SUMMARY_CHARS_PER_TOPIC = 7000


def build_input_block(
    course_input: CourseInput, *, include_summary_limit: bool = False
) -> str:
    """Sestaví vstupní blok pro sumarizátor a plánovač kurzu.

    Pole bez hodnoty se vynechávají, aby se uplatnily výchozí hodnoty
    z oddílu CHYBĚJÍCÍ POLE v promptu. Limit délky souhrnu patří jen sumarizátoru.
    """
    modules_count = course_input.modules_count_ai_generated
    duration_minutes = course_input.duration_minutes

    lines = [
        f"KURZ: {course_input.title}",
        f"POPIS: {course_input.description or ''}",
        f"POČET MODULŮ: {modules_count}",
    ]

    reading_cap_minutes = READING_CAP_MAX_MINUTES
    if duration_minutes is not None:
        lines.append(f"DÉLKA KURZU: {duration_minutes} minut")
        if modules_count > 0:
            minutes_per_module = round(duration_minutes / modules_count)
            lines.append(f"DÉLKA NA MODUL: {minutes_per_module} minut")
            reading_cap_minutes = min(READING_CAP_MAX_MINUTES, minutes_per_module)
    lines.append(f"MAXIMÁLNÍ ČAS NA VÝKLAD: {reading_cap_minutes} minut")

    if include_summary_limit:
        summary_max_chars = SUMMARY_CHARS_PER_TOPIC * max(modules_count, 1)
        lines.append(
            f"MAXIMÁLNÍ DÉLKA SOUHRNU: {summary_max_chars} znaků, "
            f"tj. asi {SUMMARY_CHARS_PER_TOPIC} znaků na téma"
        )

    return "\n".join(lines)
