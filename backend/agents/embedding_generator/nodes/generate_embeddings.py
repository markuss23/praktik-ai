"""Node pro generování embeddingů."""
from langchain_openai import OpenAIEmbeddings

from agents.embedding_generator.state import AgentState, ChunkData
from api import models


def generate_embeddings_node(state: AgentState) -> AgentState:
    """Generuje embeddingy pro všechny learn blocky."""
    db = state["db"]
    learn_blocks = state.get("learn_blocks", [])
    
    if not learn_blocks:
        print("Žádné learn blocky k zpracování")
        return {**state, "chunks": [], "total_chunks": 0}
    
    print(f"Generuji embeddingy pro {len(learn_blocks)} learn blocků...")
    
    # Model
    model_name = "text-embedding-3-small"
    embeddings = OpenAIEmbeddings(model=model_name)
    
    all_chunks = []
    
    for learn_block in learn_blocks:
        # Zkontroluj jestli už má embedding
        learn_block_db = db.query(models.LearnBlock).filter_by(
            learn_id=learn_block.learn_id
        ).first()
        
        if learn_block_db and learn_block_db.embedding is not None:
            print(f"  • Learn block {learn_block.learn_id}: už má embedding ✓")
            continue
        
        print(f"  • Learn block {learn_block.learn_id}: generuji embedding")
        
        # Vygeneruj embedding pro celý obsah
        embedding_vector = embeddings.embed_query(learn_block.content)
        
        chunk_data = ChunkData(
            learn_block_id=learn_block.learn_id,
            chunk_index=0,
            chunk_text=learn_block.content,
            embedding=embedding_vector
        )
        all_chunks.append(chunk_data)
    
    print(f" Vygenerováno {len(all_chunks)} embeddingů")
    
    return {
        **state,
        "chunks": all_chunks,
        "total_chunks": len(all_chunks),
        "model_name": model_name,
    }
