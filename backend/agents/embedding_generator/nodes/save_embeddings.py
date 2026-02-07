"""Node pro uložení embeddingů do databáze."""
from agents.embedding_generator.state import AgentState
from api import models


def save_embeddings_node(state: AgentState) -> AgentState:
    """Uloží vygenerované embeddingy přímo do learn_block tabulky."""
    db = state["db"]
    chunks = state.get("chunks", [])
    
    if not chunks:
        print("Žádné embeddingy k uložení")
        return {
            **state,
            "blocks_processed": 0,
            "chunks_created": 0,
        }
    
    print(f"Ukládám {len(chunks)} embeddingů do databáze...")
    
    blocks_processed = 0
    
    for chunk in chunks:
        # Najdi learn block a ulož embedding
        learn_block = db.query(models.LearnBlock).filter_by(
            learn_id=chunk.learn_block_id
        ).first()
        
        if not learn_block:
            print(f"Learn block {chunk.learn_block_id} nenalezen, přeskakuji")
            continue
        
        # Ulož embedding přímo do learn_block
        learn_block.embedding = chunk.embedding
        blocks_processed += 1
        print(f"Learn block {chunk.learn_block_id}: uložen embedding")
    
    # Commit všech změn
    db.commit()
    
    print(f"Uloženo {blocks_processed} embeddingů")
    
    return {
        **state,
        "blocks_processed": blocks_processed,
        "chunks_created": len(chunks),
    }
