"""
PDF Report Generator for Synora Autonomous Research Platform.
Converts long-form Markdown research reports, comparison tables, citations, and metadata
into publication-grade, professionally styled PDF documents using ReportLab.
"""

import io
import re
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count
    along with running header and footer.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        page_w, page_h = letter
        margin = 46

        # Running header (pages 2+)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#6259B5"))
            self.drawString(margin, page_h - 32, "SYNORA RESEARCH")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(page_w - margin, page_h - 32, "EXECUTIVE INTELLIGENCE REPORT")

            # Header separator rule
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(margin, page_h - 36, page_w - margin, page_h - 36)

        # Running footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(margin, 36, page_w - margin, 36)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(margin, 24, "Synora Autonomous Research • Think. Investigate. Validate. Synthesize.")

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(page_w - margin, 24, page_str)
        self.restoreState()


def clean_inline_markdown(text: str) -> str:
    """
    Transforms markdown inline syntax (**bold**, *italic*, `code`, [link](url))
    into ReportLab-compatible XML tags while safely escaping raw HTML entities.
    """
    if not text:
        return ""

    # Remove markdown image tags ![alt](url)
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"[Image: \1]", text)

    # Escape HTML special chars first
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    # Bold: **text** or __text__
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"__([^_]+)__", r"<b>\1</b>", text)

    # Italic: *text* or _text_
    text = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)
    text = re.sub(r"(?<!_)_([^_]+)_(?!_)", r"<i>\1</i>", text)

    # Inline code: `code`
    text = re.sub(r"`([^`]+)`", r'<font name="Courier" color="#334155">\1</font>', text)

    # Markdown links: [anchor](url) - restore escaped & in URL if present
    def link_repl(match):
        anchor = match.group(1)
        url = match.group(2).replace("&amp;", "&")
        return f'<a href="{url}" color="#6259B5"><u>{anchor}</u></a>'

    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", link_repl, text)

    return text.strip()


def generate_workflow_pdf(
    task_title: str,
    workflow_id: str,
    created_at: str,
    tokens: int,
    status: str,
    markdown_content: str,
    sources: Optional[List[Dict[str, Any]]] = None,
) -> bytes:
    """
    Builds a complete, publication-ready PDF document from research outputs
    and returns the binary PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=46,
        rightMargin=46,
        topMargin=46,
        bottomMargin=46,
    )

    available_width = letter[0] - 92  # 612 - 92 = 520 pt

    # Setup Typographic Styles
    base_styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=base_styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        alignment=0,
        spaceAfter=6,
    )

    h1_style = ParagraphStyle(
        "Heading1",
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2",
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=colors.HexColor("#334155"),
        spaceBefore=11,
        spaceAfter=5,
        keepWithNext=True,
    )

    h3_style = ParagraphStyle(
        "Heading3",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#6259B5"),
        spaceBefore=9,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        fontName="Helvetica",
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=5,
    )

    bullet_style = ParagraphStyle(
        "BulletItem",
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3.5,
    )

    quote_style = ParagraphStyle(
        "QuoteBlock",
        parent=body_style,
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#475569"),
        leftIndent=16,
        spaceBefore=3,
        spaceAfter=4,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#1E293B"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#FFFFFF"),
    )

    meta_label_style = ParagraphStyle(
        "MetaLabel",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748B"),
    )

    meta_val_style = ParagraphStyle(
        "MetaValue",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )

    flowables = []

    # 1. Synora Header Banner
    header_table_data = [
        [
            Paragraph("<b>SYNORA</b> <font color='#12B9D5'>RESEARCH</font>", ParagraphStyle(
                "BrandLogo", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.HexColor("#101116")
            )),
            Paragraph(f"<b>STATUS:</b> <font color='#16A34A'>{status.upper()}</font>", ParagraphStyle(
                "StatusBadge", fontName="Helvetica", fontSize=9, leading=12, alignment=2, textColor=colors.HexColor("#334155")
            )),
        ]
    ]
    header_table = Table(header_table_data, colWidths=[available_width * 0.7, available_width * 0.3])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    flowables.append(header_table)

    flowables.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#12B9D5"), spaceBefore=3, spaceAfter=8))

    # 2. Document Title
    clean_title = task_title if task_title else "Autonomous Research Synthesis"
    flowables.append(Paragraph(clean_inline_markdown(clean_title), title_style))
    flowables.append(Spacer(1, 4))

    # 3. Metadata Card Table
    meta_data = [
        [
            Paragraph("Workflow ID:", meta_label_style),
            Paragraph(f"<code>{workflow_id}</code>", meta_val_style),
            Paragraph("Date Generated:", meta_label_style),
            Paragraph(str(created_at)[:19].replace("T", " "), meta_val_style),
        ],
        [
            Paragraph("Tokens Consumed:", meta_label_style),
            Paragraph(f"{tokens:,}", meta_val_style),
            Paragraph("Verification Level:", meta_label_style),
            Paragraph("Source-Backed (Multi-Agent)", meta_val_style),
        ]
    ]
    meta_table = Table(
        meta_data,
        colWidths=[available_width * 0.22, available_width * 0.28, available_width * 0.24, available_width * 0.26],
    )
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    flowables.append(meta_table)
    flowables.append(Spacer(1, 10))

    # 4. Parse Markdown Content into Flowables
    lines = markdown_content.splitlines()
    in_table = False
    table_rows = []

    def flush_table(rows: List[List[str]]):
        if not rows:
            return
        # Ensure rectangular grid
        max_cols = max(len(r) for r in rows)
        if max_cols == 0:
            return
        col_w = available_width / max_cols

        formatted_table_data = []
        for r_idx, row in enumerate(rows):
            # Pad row if short
            padded_row = row + [""] * (max_cols - len(row))
            formatted_row = []
            for cell in padded_row:
                style = table_header_style if r_idx == 0 else table_cell_style
                formatted_row.append(Paragraph(clean_inline_markdown(cell), style))
            formatted_table_data.append(formatted_row)

        t = Table(formatted_table_data, colWidths=[col_w] * max_cols)
        t_style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E1B4B")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]
        # Alternating row background for data rows
        for i in range(1, len(formatted_table_data)):
            bg = colors.HexColor("#FFFFFF") if i % 2 != 0 else colors.HexColor("#F8FAFC")
            t_style.append(("BACKGROUND", (0, i), (-1, i), bg))

        t.setStyle(TableStyle(t_style))
        flowables.append(Spacer(1, 4))
        flowables.append(t)
        flowables.append(Spacer(1, 6))

    for raw_line in lines:
        line = raw_line.strip()

        # Handle Markdown Tables
        if line.startswith("|") and line.endswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            # Ignore divider row | :--- | :--- |
            if all(re.match(r"^:?-+:?$", c) for c in cells if c):
                continue
            table_rows.append(cells)
            in_table = True
            continue
        elif in_table:
            flush_table(table_rows)
            table_rows = []
            in_table = False

        if not line:
            flowables.append(Spacer(1, 3))
            continue

        # Horizontal rule
        if re.match(r"^(-{3,}|\*{3,}|_{3,})$", line):
            flowables.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#E2E8F0"), spaceBefore=6, spaceAfter=6))
            continue

        # Headings
        if line.startswith("# "):
            h_text = clean_inline_markdown(line[2:])
            flowables.append(Paragraph(h_text, h1_style))
        elif line.startswith("## "):
            h_text = clean_inline_markdown(line[3:])
            flowables.append(Paragraph(h_text, h1_style))
        elif line.startswith("### "):
            h_text = clean_inline_markdown(line[4:])
            flowables.append(Paragraph(h_text, h2_style))
        elif line.startswith("#### "):
            h_text = clean_inline_markdown(line[5:])
            flowables.append(Paragraph(h_text, h3_style))
        elif line.startswith(("* ", "- ", "• ")):
            b_text = f"• {clean_inline_markdown(line[2:])}"
            flowables.append(Paragraph(b_text, bullet_style))
        elif re.match(r"^\d+\.\s+", line):
            m = re.match(r"^(\d+\.)\s+(.+)$", line)
            if m:
                num_prefix, rest = m.group(1), m.group(2)
                flowables.append(Paragraph(f"<b>{num_prefix}</b> {clean_inline_markdown(rest)}", bullet_style))
            else:
                flowables.append(Paragraph(clean_inline_markdown(line), body_style))
        elif line.startswith(">"):
            q_text = clean_inline_markdown(line.lstrip(">").strip())
            flowables.append(Paragraph(f"<i>“{q_text}”</i>", quote_style))
        else:
            flowables.append(Paragraph(clean_inline_markdown(line), body_style))

    # Flush remaining table if ends with table
    if in_table and table_rows:
        flush_table(table_rows)

    # 5. Verified Sources Appendix if provided
    if sources:
        flowables.append(Spacer(1, 8))
        flowables.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#12B9D5"), spaceBefore=8, spaceAfter=8))
        flowables.append(Paragraph("Verified Sources & Evidence Citations", h1_style))
        for idx, src in enumerate(sources, start=1):
            s_title = src.get("title", f"Source {idx}")
            s_url = src.get("url", "#")
            s_domain = src.get("domain", "")
            s_snippet = src.get("snippet", "").strip()

            item_p = f"<b>{idx}. <a href='{s_url}' color='#6259B5'><u>{clean_inline_markdown(s_title)}</u></a></b> — <i>{clean_inline_markdown(s_domain)}</i>"
            flowables.append(Paragraph(item_p, bullet_style))
            if s_snippet:
                flowables.append(Paragraph(f"“{clean_inline_markdown(s_snippet)}”", quote_style))

    # Build document with running canvas
    doc.build(flowables, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
