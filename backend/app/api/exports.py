from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.market_data import MarketDataService, AIService
import io
import csv
from datetime import datetime

# reportlab PDF imports
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/exports", tags=["exports"])

@router.get("/research/{ticker}/pdf")
async def export_research_pdf(ticker: str, db: Session = Depends(get_db)):
    ticker_upper = ticker.upper()
    
    # Fetch report contents (simulated using AI service detail or custom report layout)
    profile = await MarketDataService.get_profile(ticker_upper)
    if not profile:
        raise HTTPException(status_code=404, detail="Company not found")
        
    ai_analysis = await AIService.generate_financial_analysis(ticker_upper)
    
    # Setup PDF structure in-memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54)
    story = []
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom Palette
    brand_blue = colors.HexColor("#3b82f6")
    slate_dark = colors.HexColor("#0f172a")
    text_dark = colors.HexColor("#1e293b")
    border_light = colors.HexColor("#e2e8f0")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=slate_dark,
        spaceAfter=12
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=brand_blue,
        spaceAfter=20
    )
    
    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=slate_dark,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_dark,
        spaceAfter=10
    )

    # Document Header
    story.append(Paragraph(f"QUANTARA RESEARCH LABS", subtitle_style))
    story.append(Paragraph(f"Institutional Research Report: {ticker_upper}", title_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')} | Sector: {profile.get('sector', 'N/A')}", body_style))
    story.append(Spacer(1, 15))
    
    # Overview Table
    summary_data = [
        [Paragraph("<b>Company</b>", body_style), Paragraph(profile.get("name", "N/A"), body_style),
         Paragraph("<b>Market Cap</b>", body_style), Paragraph(profile.get("market_cap", "N/A"), body_style)],
        [Paragraph("<b>CEO</b>", body_style), Paragraph(profile.get("ceo", "N/A"), body_style),
         Paragraph("<b>Founded</b>", body_style), Paragraph(profile.get("founded", "N/A"), body_style)]
    ]
    t = Table(summary_data, colWidths=[80, 160, 90, 150])
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, border_light),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Executive Summary
    story.append(Paragraph("Executive Summary", h2_style))
    story.append(Paragraph(ai_analysis.get("executive_summary", "No details available."), body_style))
    
    # Financial Margins Analysis
    story.append(Paragraph("Margin & Profitability Performance", h2_style))
    story.append(Paragraph(ai_analysis.get("margin_analysis", "No details available."), body_style))
    
    # Cash Flow Assessment
    story.append(Paragraph("Free Cash Flow Generation", h2_style))
    story.append(Paragraph(ai_analysis.get("cash_flow_analysis", "No details available."), body_style))
    
    # Key Risks
    story.append(Paragraph("Material Risks & Structural Headwinds", h2_style))
    story.append(Paragraph(ai_analysis.get("financial_risks", "No details available."), body_style))
    
    # Growth Outlook
    story.append(Paragraph("Strategic Expansion & Growth Drivers", h2_style))
    story.append(Paragraph(ai_analysis.get("growth_opportunities", "No details available."), body_style))
    
    # Conclusion
    story.append(Paragraph("Overall Financial Health Assessment", h2_style))
    story.append(Paragraph(ai_analysis.get("overall_health", "No details available."), body_style))
    
    # Build Document
    doc.build(story)
    
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename={ticker_upper}_research_report.pdf"}
    )

@router.get("/research/{ticker}/markdown")
async def export_research_markdown(ticker: str):
    ticker_upper = ticker.upper()
    profile = await MarketDataService.get_profile(ticker_upper)
    ai_analysis = await AIService.generate_financial_analysis(ticker_upper)
    
    md_content = f"""# Quantara Investment Research Report: {ticker_upper}
*Generated on {datetime.now().strftime('%Y-%m-%d')}*

## 🏢 Company Profile
* **Company**: {profile.get('name', 'N/A')}
* **Sector**: {profile.get('sector', 'N/A')}
* **Industry**: {profile.get('industry', 'N/A')}
* **CEO**: {profile.get('ceo', 'N/A')}
* **Market Capitalization**: {profile.get('market_cap', 'N/A')}

## 📑 Executive Summary
{ai_analysis.get('executive_summary', 'N/A')}

## 📊 Margins & Profitability
{ai_analysis.get('margin_analysis', 'N/A')}

## 💸 Cash Flow Assessment
{ai_analysis.get('cash_flow_analysis', 'N/A')}

## ⚠️ Material Risks
{ai_analysis.get('financial_risks', 'N/A')}

## 🚀 Growth Opportunities
{ai_analysis.get('growth_opportunities', 'N/A')}

## 🛡️ Financial Health Summary
{ai_analysis.get('overall_health', 'N/A')}
"""
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={ticker_upper}_research_report.md"}
    )

@router.get("/financials/{ticker}/csv")
async def export_financials_csv(ticker: str):
    ticker_upper = ticker.upper()
    financials = await MarketDataService.get_financials(ticker_upper)
    
    if not financials or "annual" not in financials:
        raise HTTPException(status_code=404, detail="Financial statements not found")
        
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    keys = financials["annual"][0].keys()
    writer.writerow([key.replace("_", " ").title() for key in keys])
    
    # Rows
    for period in financials["annual"]:
        writer.writerow([period[key] for key in keys])
        
    response = Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={ticker_upper}_annual_financials.csv"}
    )
    return response
