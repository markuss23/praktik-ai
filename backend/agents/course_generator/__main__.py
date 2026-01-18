from dotenv import load_dotenv
from langgraph.graph.state import CompiledStateGraph

from agents.course_generator.state import AgentState

from agents.course_generator import create_graph

load_dotenv()


if __name__ == "__main__":
    print("Spouštím Course Generator agenta...")
    app: CompiledStateGraph[AgentState, None, AgentState, AgentState] = create_graph()

    result = app.invoke(
        {"source": "/home/marek/projects/marek/github/praktik-ai/api/kurz_vystup.md"}
    )
