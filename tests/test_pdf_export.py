"""
Unit tests for PDF export functionality.
"""

from src.tools.pdf_generator import generate_workflow_pdf


def test_generate_workflow_pdf_basic():
    task_title = "Modern Applied Tech Academies Analysis"
    workflow_id = "wf_test_12345"
    created_at = "2026-11-16T00:00:00Z"
    tokens = 12500
    status = "COMPLETED"
    markdown_content = """# Deep Research Analysis

Executive overview of modern applied technology academies.

## Institutional Comparison Matrix

| Academy | Category | Median CTC | Internships |
| :--- | :--- | :--- | :--- |
| Applied Technology Academy A | Residential Academy | 20-25 LPA | Paid Corporate |
| Modern Tech Institute B | Modern Academy | 12-18 LPA | 6-12 Months |
| Advanced Software School C | Work-Integrated | 8-15 LPA | 2 Years |

### 1. Applied Technology Academy A
* **Academic Pedagogy:** Advanced AI and software engineering.
* **Admissions:** Merit-based technical assessment.

> "A disruptive model in higher technical education."

## Sources & Citations
* [Academy Official Portal](https://example.edu)
"""
    sources = [
        {
            "title": "Academy Official Portal",
            "url": "https://example.edu",
            "domain": "example.edu",
            "snippet": "Curriculum details and placement disclosures.",
        }
    ]

    pdf_bytes = generate_workflow_pdf(
        task_title=task_title,
        workflow_id=workflow_id,
        created_at=created_at,
        tokens=tokens,
        status=status,
        markdown_content=markdown_content,
        sources=sources,
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")
