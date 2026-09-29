from agents.module_image_generator.state import ModuleImageGeneratorState


def collect_results_node(state: ModuleImageGeneratorState) -> dict:
    """Fan-in node - jen sejde paralelní větve a zaloguje počet výsledků."""
    print(
        f"Shromážděno {len(state.get('results', []))} výsledků generování obrázků modulu"
    )
    return {}
