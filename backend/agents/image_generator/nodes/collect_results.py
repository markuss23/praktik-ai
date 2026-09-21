from agents.image_generator.state import ImageGeneratorState


def collect_results_node(state: ImageGeneratorState) -> dict:
    """Fan-in node - jen sejde paralelní větve a zaloguje počet výsledků."""
    print(f"Shromážděno {len(state.get('results', []))} výsledků generování obrázků")
    return {}
