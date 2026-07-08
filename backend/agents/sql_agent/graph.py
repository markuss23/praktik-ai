"""LangGraph SQL agent."""

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from sqlalchemy import text

from agents.base.llm import create_chat_llm, get_llm_config
from agents.sql_agent.state import AgentState

DEFAULT_MODEL = "gpt-5.4"

DEFAULT_PROMPT = """Jsi expert na SQL databáze (PostgreSQL).
Na základě schématu databáze a otázky uživatele vygeneruj syntakticky správný PostgreSQL dotaz.

PRAVIDLA:
- Vrať POUZE samotný SQL dotaz, bez vysvětlení, bez markdown bloků
- Omez výsledky na maximálně 20 řádků (použij LIMIT)
- Dotazuj se pouze na relevantní sloupce, nikdy SELECT *
- NIKDY nepoužívej DML příkazy (INSERT, UPDATE, DELETE, DROP, TRUNCATE)
- Používej správné uvozovky pro identifikátory (\"nazev_tabulky\")
"""


def list_tables(state: AgentState) -> dict:
    """Načte seznam veřejných tabulek z PostgreSQL databáze."""
    result = state["db"].execute(
        text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name"
        )
    )
    return {"tables": [row[0] for row in result.fetchall()]}


def get_schema(state: AgentState) -> dict:
    """Pro každou tabulku načte DDL (sloupce + typy) a 3 ukázkové řádky."""
    db = state["db"]
    parts: list[str] = []

    for table in state["tables"]:
        cols = db.execute(
            text(
                "SELECT column_name, data_type, is_nullable "
                "FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = :t "
                "ORDER BY ordinal_position"
            ),
            {"t": table},
        ).fetchall()

        col_defs = ", ".join(
            f"{c[0]} {c[1].upper()}{'?' if c[2] == 'YES' else ''}" for c in cols
        )
        block = f"TABLE {table} ({col_defs})"

        try:
            rows = db.execute(text(f'SELECT * FROM "{table}" LIMIT 3')).fetchall()
            if rows:
                headers = "\t".join(c[0] for c in cols)
                sample = "\n".join("\t".join(str(v) for v in row) for row in rows)
                block += f"\n-- sample rows:\n-- {headers}\n-- {sample}"
            
        except Exception:
            pass

        parts.append(block)
    return {"schema": "\n\n".join(parts)}


def generate_query(state: AgentState) -> dict:
    """Vygeneruje SQL dotaz na základě schématu a otázky uživatele."""
    cfg = get_llm_config(
        state["db"],
        "sql_agent_generate_query",
        default_model=DEFAULT_MODEL,
        default_prompt=DEFAULT_PROMPT,
    )
    llm = create_chat_llm(cfg.model, temperature=0)

    messages = [
        SystemMessage(content=f"{cfg.prompt}\n\nSCHÉMA DATABÁZE:\n{state['schema']}"),
        HumanMessage(content=state["user_input"]),
    ]

    response = llm.invoke(messages)
    return {"query": str(response.content).strip()}


_FORBIDDEN = {"insert", "update", "delete", "drop", "truncate", "alter", "create"}


def run_query(state: AgentState) -> dict:
    """Spustí SQL dotaz a vrátí výsledek jako string."""
    query = state["query"]
    
    print("Running query:", query)

    first_token = query.strip().split()[0].lower() if query.strip() else ""
    if first_token in _FORBIDDEN:
        return {"answer": f"Chyba: zakázaný příkaz '{first_token.upper()}'"}

    try:
        rows = state["db"].execute(text(query)).fetchall()
        if not rows:
            return {"query_result": "Dotaz nevrátil žádné výsledky."}
        return {"query_result": "\n".join(str(row) for row in rows)}
    except Exception as e:
        return {"query_result": f"Chyba při spuštění dotazu: {e}"}


FORMAT_PROMPT = """Jsi asistent, který převádí surové výsledky SQL dotazu do čitelné odpovědi v češtině.
Odpověz přirozeně a stručně na základě výsledku dotazu. Nepoužívej technický žargon.
Pokud výsledek obsahuje chybu, sděl ji uživateli srozumitelně. Vracej pouze odpoveď, bez formátování."""


def format_answer(state: AgentState) -> dict:
    """Přeloží surový výsledek SQL dotazu do přirozené češtiny."""
    cfg = get_llm_config(
        state["db"],
        "sql_agent_format_answer",
        default_model=DEFAULT_MODEL,
        default_prompt=FORMAT_PROMPT,
    )
    llm = create_chat_llm(cfg.model, temperature=0.3)

    messages = [
        SystemMessage(content=cfg.prompt),
        HumanMessage(
            content=f"Otázka uživatele: {state['user_input']}\n\nVýsledek dotazu:\n{state['query_result']}"
        ),
    ]

    response = llm.invoke(messages)
    return {"answer": str(response.content).strip()}


def create_graph():
    """START → list_tables → get_schema → generate_query → run_query → format_answer → END."""
    workflow = StateGraph(AgentState)

    workflow.add_node("list_tables", list_tables)
    workflow.add_node("get_schema", get_schema)
    workflow.add_node("generate_query", generate_query)
    workflow.add_node("run_query", run_query)
    workflow.add_node("format_answer", format_answer)

    workflow.set_entry_point("list_tables")
    workflow.add_edge("list_tables", "get_schema")
    workflow.add_edge("get_schema", "generate_query")
    workflow.add_edge("generate_query", "run_query")
    workflow.add_edge("run_query", "format_answer")
    workflow.add_edge("format_answer", END)
    return workflow.compile()
