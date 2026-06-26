from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.ai.pipelines.research_pipeline import ResearchOrchestrator

router = APIRouter()
orchestrator = ResearchOrchestrator()

@router.post("/companies/{ticker}/research/generate")
async def generate_research(ticker: str):
    return StreamingResponse(
        orchestrator.generate_research_report(ticker),
        media_type="text/event-stream"
    )
