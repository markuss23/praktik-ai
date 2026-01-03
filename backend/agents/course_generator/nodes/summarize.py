from langchain_core.messages.ai import AIMessage
from langchain_openai import ChatOpenAI

from agents.course_generator.state import AgentState
from agents.course_generator.state import CourseInput


def summarize_content_node(state: AgentState) -> AgentState:
    """Node pro vytvoření sumarizaci kurzu."""
    print("Generání sumarizace kurzu...")

    course_input: CourseInput | None = state.get("course_input")
    source_content = state.get("source_content", "")

    if course_input is None:
        raise ValueError("course_input is not available in state")

    model = ChatOpenAI(model="gpt-4o-mini")
    # llm_structured = model.with_structured_output(Course)
    prompt: str = f"""Vytvoř strukturovaný souhrn pro vzdělávací kurz (max 3000 znaků) holý text bez formátování.

        Kurz: {course_input.title}
        Popis: {course_input.description}

        Obsah:
        {source_content}
    """

    output: AIMessage = model.invoke(prompt)

    state["summarize_content"] = output.content

    print(f"   -> Vytvořen souhrn obsahu kurzu (délka {len(output.content)} znaků)")
    print(f"   -> Náhled souhrnu: {output.content[:200]}...")

    return state
