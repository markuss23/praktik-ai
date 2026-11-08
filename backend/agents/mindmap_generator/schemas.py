"""Strom myšlenkové mapy (structured output z LLM) a převod na mermaid.

Bez závislostí na DB a LLM — importuje ho i api/src/modules/schemas.py.
Tři pevné úrovně místo rekurze: rekurzivní schéma dělá s json_schema problémy.
"""

import re

from pydantic import BaseModel, Field


class MindMapBranch(BaseModel):
    label: str = Field(description="Pojem větve, 1–4 slova.")
    children: list[str] = Field(description="2–4 podpojmy, každý 1–5 slov.")


class MindMap(BaseModel):
    root: str = Field(description="Hlavní téma modulu, 1–4 slova.")
    branches: list[MindMapBranch] = Field(description="5–7 hlavních větví.")


# Znaky, které v mermaid mindmap mění tvar uzlu nebo rozbijí parser
_UNSAFE = re.compile(r"[()\[\]{}\"`<>]")


def _clean(text: str) -> str:
    return " ".join(_UNSAFE.sub(" ", text).split()) or "-"


def to_mermaid(mindmap: MindMap) -> str:
    """Složí text pro mermaid `mindmap`. Štítky se očistí, výstup je vždy platný."""
    lines = ["mindmap", f"  root(({_clean(mindmap.root)}))"]
    for branch in mindmap.branches:
        lines.append(f"    {_clean(branch.label)}")
        lines.extend(f"      {_clean(child)}" for child in branch.children)
    return "\n".join(lines)
