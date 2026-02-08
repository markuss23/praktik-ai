"""Nodes pro embedding generator."""
from agents.embedding_generator.nodes.load_course_data import load_course_data_node
from agents.embedding_generator.nodes.generate_embeddings import generate_embeddings_node
# from agents.embedding_generator.nodes.save_embeddings import save_embeddings_node

__all__ = [
    "load_course_data_node",
    "generate_embeddings_node",
    # "save_embeddings_node",
]
