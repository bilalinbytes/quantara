"""Research pipeline — delegates to multi-agent orchestrator."""
from app.ai.pipelines.agent_orchestrator import AgentOrchestrator


class ResearchOrchestrator(AgentOrchestrator):
    """Alias for backward compatibility with research API router."""
    pass
