"""
Real SEC EDGAR integration.
Uses the public SEC EDGAR Full-Text Search and EDGAR REST APIs — no API key required.
Parses actual HTML filings into structured sections.
"""
import logging
import re
from typing import List, Optional, Dict, Any

import httpx
from fastapi import HTTPException
from app.config.settings import settings

logger = logging.getLogger("sec_service")

EDGAR_BASE = "https://data.sec.gov"
EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index"
HEADERS = {"User-Agent": settings.sec_user_agent, "Accept-Encoding": "gzip, deflate"}

SECTION_PATTERNS = [
    ("item1",   r"item\s*1[\.\s]+business"),
    ("item1a",  r"item\s*1a[\.\s]+risk\s*factors?"),
    ("item1b",  r"item\s*1b[\.\s]+unresolved\s*staff\s*comments?"),
    ("item7",   r"item\s*7[\.\s]+management"),
    ("item7a",  r"item\s*7a[\.\s]+quantitative"),
    ("item8",   r"item\s*8[\.\s]+financial\s*statements?"),
]

SECTION_TITLES = {
    "item1":  "Item 1. Business",
    "item1a": "Item 1A. Risk Factors",
    "item1b": "Item 1B. Unresolved Staff Comments",
    "item7":  "Item 7. Management's Discussion & Analysis",
    "item7a": "Item 7A. Quantitative & Qualitative Disclosures",
    "item8":  "Item 8. Financial Statements",
}


async def _get_cik(ticker: str) -> Optional[str]:
    """Resolve ticker → CIK from SEC's company ticker JSON."""
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=HEADERS) as c:
            r = await c.get("https://www.sec.gov/files/company_tickers.json")
            r.raise_for_status()
            data = r.json()
            for entry in data.values():
                if entry.get("ticker", "").upper() == ticker.upper():
                    return str(entry["cik_str"]).zfill(10)
    except Exception as e:
        logger.error(f"CIK lookup failed for {ticker}: {e}")
    return None


async def _get_filings_list(cik: str, form_type: str = "10-K", limit: int = 5) -> List[Dict]:
    """Fetch recent filings metadata from EDGAR submissions endpoint."""
    url = f"{EDGAR_BASE}/submissions/CIK{cik}.json"
    try:
        async with httpx.AsyncClient(timeout=10.0, headers=HEADERS) as c:
            r = await c.get(url)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.error(f"EDGAR submissions failed for CIK {cik}: {e}")
        return []

    recent = data.get("filings", {}).get("recent", {})
    forms   = recent.get("form", [])
    dates   = recent.get("filingDate", [])
    acc_nos = recent.get("accessionNumber", [])
    docs    = recent.get("primaryDocument", [])

    results = []
    for i, form in enumerate(forms):
        if form.upper().startswith(form_type.upper()) and i < len(dates):
            acc = acc_nos[i].replace("-", "")
            doc = docs[i] if i < len(docs) else ""
            results.append({
                "id": acc_nos[i],
                "ticker": data.get("tickers", [""])[0] if data.get("tickers") else "",
                "date": dates[i],
                "type": form,
                "size": "N/A",
                "status": "Available",
                "accession": acc,
                "primary_doc": doc,
                "cik": cik,
            })
            if len(results) >= limit:
                break
    return results


async def _fetch_filing_html(cik: str, accession: str, primary_doc: str) -> Optional[str]:
    """Download the raw HTML of a filing from EDGAR."""
    url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession}/{primary_doc}"
    try:
        async with httpx.AsyncClient(timeout=30.0, headers=HEADERS, follow_redirects=True) as c:
            r = await c.get(url)
            r.raise_for_status()
            return r.text
    except Exception as e:
        logger.error(f"Filing HTML fetch failed: {e}")
        return None


def _parse_sections(html: str) -> List[Dict]:
    """Extract sections from SEC HTML filing using regex anchoring."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        # Remove tables and scripts for cleaner text
        for tag in soup(["script", "style", "table"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
    except Exception:
        text = re.sub(r"<[^>]+>", " ", html)

    text_lower = text.lower()
    found_positions: List[tuple] = []
    for sec_id, pattern in SECTION_PATTERNS:
        for m in re.finditer(pattern, text_lower):
            found_positions.append((m.start(), sec_id))

    found_positions.sort(key=lambda x: x[0])

    sections = []
    for idx, (start, sec_id) in enumerate(found_positions):
        end = found_positions[idx + 1][0] if idx + 1 < len(found_positions) else start + 15000
        chunk = text[start:end].strip()
        # Clean up whitespace
        chunk = re.sub(r"\n{3,}", "\n\n", chunk)
        chunk = re.sub(r" {2,}", " ", chunk)
        content = chunk[:8000]  # cap per section
        if len(content) > 200:
            sections.append({
                "id": sec_id,
                "title": SECTION_TITLES.get(sec_id, sec_id),
                "content": content,
            })

    return sections


class SecService:

    @staticmethod
    async def get_filings(ticker: str) -> Dict:
        cik = await _get_cik(ticker)
        if not cik:
            raise HTTPException(status_code=404, detail=f"SEC EDGAR CIK not found for ticker {ticker}. Verify the ticker symbol.")

        annual = await _get_filings_list(cik, "10-K", 3)
        quarterly = await _get_filings_list(cik, "10-Q", 4)
        all_filings = annual + quarterly
        all_filings.sort(key=lambda x: x["date"], reverse=True)

        if not all_filings:
            raise HTTPException(status_code=404, detail=f"No SEC filings found for {ticker} on EDGAR.")
        return {"filings": all_filings}

    @staticmethod
    async def get_parsed_filing(ticker: str, filing_id: str) -> Dict:
        """Retrieve and parse a specific filing by accession number."""
        cik = await _get_cik(ticker)
        if not cik:
            raise HTTPException(status_code=404, detail=f"CIK not found for {ticker}")

        # filing_id is the accession number with dashes
        accession = filing_id.replace("-", "")

        # Get filing index to find the primary document
        index_url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession}/{filing_id}-index.htm"
        primary_doc = None
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=HEADERS) as c:
                r = await c.get(index_url)
                if r.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(r.text, "lxml")
                    for row in soup.find_all("tr"):
                        cells = row.find_all("td")
                        if len(cells) >= 3:
                            doc_type = cells[2].get_text(strip=True).upper()
                            if "10-K" in doc_type or "10-Q" in doc_type:
                                link = cells[1].find("a")
                                if link:
                                    primary_doc = link.get("href", "").split("/")[-1]
                                    break
        except Exception as e:
            logger.warning(f"Index fetch failed: {e}")

        if not primary_doc:
            # Try common filename patterns
            for candidate in [f"{filing_id}.htm", "form10-k.htm", "form10k.htm", "10k.htm"]:
                primary_doc = candidate
                break

        html = await _fetch_filing_html(cik, accession, primary_doc or f"{filing_id}.htm")
        if not html:
            raise HTTPException(status_code=503, detail=f"Could not retrieve filing document from SEC EDGAR for {ticker}.")

        sections = _parse_sections(html)
        if not sections:
            raise HTTPException(status_code=422, detail=f"Could not parse sections from filing. The document format may be unsupported.")

        return {
            "id": filing_id,
            "ticker": ticker.upper(),
            "type": "10-K",
            "sections": sections,
        }
