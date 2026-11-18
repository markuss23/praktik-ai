from pathlib import Path

from agents.podcast_generator.state import PodcastContext

# Model se čte z DB (system_setting, seed.py), prompt z prompt.md
SETTING_KEY = "module_podcast_script"
PROMPT = (Path(__file__).parent / "prompt.md").read_text(encoding="utf-8")


def render_user_prompt(context: PodcastContext) -> str:
    return (
        f"KURZ: {context.course_title}\n"
        f"MODUL: {context.module_title}\n"
        f"CÍLOVÁ SKUPINA: {context.target_name or '-'}\n\n"
        f"OBSAH MODULU:\n{context.learn_block_content or '-'}"
    )
