"""
Tests for Domain Classifier.
Verifies proper classification of New-Age Tech Schools vs Legacy Academic institutions,
scientific benchmarks, commercial products, comparisons, and guides.
"""

import pytest
from src.agents.domain_classifier import classify_task_domain


def test_geographic_targeting_pune():
    res = classify_task_domain("Compare and list out the best new-age tech schools in Pune in 2026")
    assert res["domain"] == "ACADEMIC_INSTITUTION"
    assert res["is_new_age_tech"] is True
    assert res["target_geography"] is not None
    assert res["target_geography"]["region"] == "Pune"
    assert "Pune" in res["target_geography"]["city_keywords"]
    assert "Wakad" in res["target_geography"]["city_keywords"]
    assert "Pune" in res["target_geography"]["non_local_disqualification"]


def test_geographic_targeting_delhi():
    res = classify_task_domain("List out the new age tech schools in Delhi in 2026")
    assert res["domain"] == "ACADEMIC_INSTITUTION"
    assert res["is_new_age_tech"] is True
    assert res["target_geography"] is not None
    assert res["target_geography"]["region"] == "Delhi / NCR"
    assert "Delhi" in res["target_geography"]["city_keywords"]
    assert "Noida" in res["target_geography"]["city_keywords"]
    assert "Delhi / NCR" in res["target_geography"]["non_local_disqualification"]


def test_geographic_targeting_bangalore():
    res = classify_task_domain("List out the best new - age tech schools in banglore in 2026")
    assert res["domain"] == "ACADEMIC_INSTITUTION"
    assert res["is_new_age_tech"] is True
    assert res["target_geography"] is not None
    assert res["target_geography"]["region"] == "Bangalore"
    assert "Bangalore" in res["target_geography"]["city_keywords"]
    assert "Electronic City" in res["target_geography"]["city_keywords"]


def test_synthesizer_sanitization_strips_preamble_and_renumbers():
    from src.agents.synthesizer import SynthesizerAgent
    agent = SynthesizerAgent()
    domain_info = classify_task_domain("Compare the best modern tech academies")

    raw_report = """As a Senior Comparative Research Analyst, I have evaluated your inquiry.

# Leading Tech Academies

### 4. Applied Computing Institute
Focus on software architecture and distributed systems.

### 9. Modern AI Academy
Focus on deep learning systems and engineering.
"""
    sanitized = agent.sanitize_report_content(raw_report, domain_info)

    # Robotic preamble must be stripped
    assert "As a Senior Comparative Research Analyst" not in sanitized
    assert "I have evaluated your inquiry" not in sanitized
    # Candidate sections must be sequentially renumbered
    assert "### 1. Applied Computing Institute" in sanitized
    assert "### 2. Modern AI Academy" in sanitized


@pytest.mark.parametrize(
    "query",
    [
        "List out the best new - age tech schools in banglore in 2026",
        "List out some of the best new age tech schools in India in 2026",
        "best new-age tech schools in bangalore",
        "new age tech schools in bangalore",
        "new - age tech schools",
        "new age colleges in bangalore",
        "new age tech schools",
        "modern tech schools in india",
        "applied tech academies Bangalore",
    ],
)
def test_new_age_tech_schools_classification(query: str):
    res = classify_task_domain(query)
    assert res["domain"] == "ACADEMIC_INSTITUTION"
    assert res["is_new_age_tech"] is True
    assert res["display_label"].startswith("New-Age Tech Schools & Applied Academies")


@pytest.mark.parametrize(
    "query",
    [
        "Top engineering colleges in India NIRF rankings",
        "IIT Bombay vs IIT Delhi computer science cutoffs",
        "BITS Pilani admissions process 2026",
    ],
)
def test_traditional_academic_classification(query: str):
    res = classify_task_domain(query)
    assert res["domain"] == "ACADEMIC_INSTITUTION"
    assert res.get("is_new_age_tech") is False


def test_smartphone_commercial_classification():
    task = "Compare and find out the best smartphones in under 50 thousand for student use case"
    res = classify_task_domain(task)
    assert res["domain"] == "COMMERCIAL_PRODUCT"
    assert res["is_commercial_product"] is True


def test_smartphone_enrichment_includes_images_and_cheapest_links():
    from src.agents.synthesizer import SynthesizerAgent
    agent = SynthesizerAgent()
    task = "Compare and find out the best smartphones in under 50 thousand for student use case"
    domain_info = classify_task_domain(task)

    report = """# Best Smartphones Under 50000 for Students in 2026

## Deep-Dive Analysis for Each Option / Product

### 1. OnePlus 12R Smartphone
**Key Technical Specifications:**
- Processor: Snapdragon 8 Gen 2
- Display: 1.5K LTPO4 AMOLED 120Hz
- Battery: 5500 mAh with 100W SuperVOOC

**Real-World Performance & Benchmarks:**
Top-tier battery life and gaming.

### 2. iQOO Neo 9 Pro Smartphone
**Key Technical Specifications:**
- Processor: Snapdragon 8 Gen 2
- Display: 144Hz AMOLED
- Battery: 5160 mAh with 120W FlashCharge

**Real-World Performance & Benchmarks:**
Flagship performance for students.
"""
    enriched = agent.enrich_report_with_product_images(report, task=task, is_commercial=domain_info["is_commercial_product"])
    # Verified product image links must be present
    assert "![OnePlus 12R Smartphone]" in enriched
    assert "![iQOO Neo 9 Pro Smartphone]" in enriched
    # Cheapest purchase deal links must be present
    assert "Where to Buy (Lowest Price & Best Deals)" in enriched
    assert "Amazon (Lowest Price Deals)" in enriched
    assert "price-asc-rank" in enriched
    assert "Flipkart (Lowest Price Deals)" in enriched
    assert "Multi-Store Price Comparison" in enriched
    assert "Student & Brand Offers" in enriched
