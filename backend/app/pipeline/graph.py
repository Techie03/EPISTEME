import logging
from langgraph.graph import StateGraph, END
from app.pipeline.models import GraphState
from app.pipeline.nodes import (
    claim_extractor_node,
    rag_verifier_node,
    trust_scanner_node,
    intelligence_synthesizer_node
)

logger = logging.getLogger("episteme.graph")

def create_pipeline() -> StateGraph:
    """
    Constructs and returns the compiled LangGraph pipeline.
    Flow: Claim Extraction -> RAG Verification -> Trust Scanner -> Intelligence Synthesizer -> End
    """
    workflow = StateGraph(GraphState)

    # Register nodes
    workflow.add_node("claim_extractor", claim_extractor_node)
    workflow.add_node("rag_verifier", rag_verifier_node)
    workflow.add_node("trust_scanner", trust_scanner_node)
    workflow.add_node("intelligence_synthesizer", intelligence_synthesizer_node)

    # Set entry point
    workflow.set_entry_point("claim_extractor")

    # Connect nodes linearly
    workflow.add_edge("claim_extractor", "rag_verifier")
    workflow.add_edge("rag_verifier", "trust_scanner")
    workflow.add_edge("trust_scanner", "intelligence_synthesizer")
    workflow.add_edge("intelligence_synthesizer", END)

    logger.info("Compiled LangGraph research verification workflow successfully.")
    return workflow.compile()

# Compile a default pipeline instance
pipeline_app = create_pipeline()
