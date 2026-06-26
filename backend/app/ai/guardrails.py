import re
from fastapi import HTTPException, status

# Standard keywords that indicate prompt injection attempts
PROMPT_INJECTION_KEYWORDS = [
    r"ignore\s+previous\s+instructions",
    r"reveal\s+system\s+prompt",
    r"system\s+prompt",
    r"you\s+are\s+now\s+an\s+assistant\s+that",
    r"bypass\s+safety",
    r"disregard\s+instructions",
    r"new\s+rule",
    r"ignore\s+above"
]

def validate_user_query(query: str) -> str:
    """
    Scans user queries for potential prompt injection attempts.
    Raises an HTTP 400 Bad Request if a violation is detected.
    """
    if not query:
        return query
        
    query_lower = query.lower()
    for pattern in PROMPT_INJECTION_KEYWORDS:
        if re.search(pattern, query_lower):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guardrail violation: Input contains blocked phrases or command override indicators."
            )
            
    return query
