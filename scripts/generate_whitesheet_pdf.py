#!/usr/bin/env python3
"""
Generate the investor whitesheet PDF from the markdown source.

Dependencies:
- reportlab (install inside the repo venv: `.venv/bin/pip install reportlab`)
- system font: DejaVuSans (available on most Debian/Ubuntu systems)
"""

from pathlib import Path
from typing import List, Tuple

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parent.parent
MARKDOWN_PATH = ROOT / "docs" / "whitesheet_investor_pl.md"
PDF_PATH = ROOT / "docs" / "whitesheet_investor_pl.pdf"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")


def load_markdown() -> str:
    if not MARKDOWN_PATH.exists():
        raise FileNotFoundError(f"Markdown source not found at {MARKDOWN_PATH}")
    return MARKDOWN_PATH.read_text(encoding="utf-8")


def parse_markdown(md: str) -> List[Tuple[str, str]]:
    """
    Tiny markdown parser that understands:
    - # / ## headings,
    - paragraphs,
    - bullet lists starting with "- ".
    Returns a list of tuples (kind, text).
    """
    items: List[Tuple[str, str]] = []
    bullets: List[str] = []

    def flush_bullets():
        nonlocal bullets
        if bullets:
            items.append(("list", "\n".join(bullets)))
            bullets = []

    for raw_line in md.splitlines():
        line = raw_line.rstrip()
        if line.startswith("# "):
            flush_bullets()
            items.append(("h1", line[2:].strip()))
            continue
        if line.startswith("## "):
            flush_bullets()
            items.append(("h2", line[3:].strip()))
            continue
        if line.startswith("- "):
            bullets.append(line[2:].strip())
            continue
        if line.strip() == "":
            flush_bullets()
            items.append(("spacer", ""))
            continue

        flush_bullets()
        items.append(("p", line.strip()))

    flush_bullets()
    return items


def build_story(tokens: List[Tuple[str, str]]) -> list:
    font_regular = FONT_DIR / "DejaVuSans.ttf"
    font_bold = FONT_DIR / "DejaVuSans-Bold.ttf"
    if not font_regular.exists() or not font_bold.exists():
        raise FileNotFoundError("DejaVuSans fonts not found; install fonts-dejavu.")

    pdfmetrics.registerFont(TTFont("DejaVuSans", str(font_regular)))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(font_bold)))

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
          name="BulenH1",
          parent=styles["Heading1"],
          fontName="DejaVuSans-Bold",
          fontSize=20,
          leading=24,
          spaceAfter=10,
      )
    )
    styles.add(
        ParagraphStyle(
          name="BulenH2",
          parent=styles["Heading2"],
          fontName="DejaVuSans-Bold",
          fontSize=14,
          leading=18,
          spaceAfter=6,
      )
    )
    styles.add(
        ParagraphStyle(
          name="BulenBody",
          parent=styles["BodyText"],
          fontName="DejaVuSans",
          fontSize=11,
          leading=15,
          spaceAfter=6,
      )
    )
    story = []

    for kind, text in tokens:
        if kind == "h1":
            story.append(Paragraph(text, styles["BulenH1"]))
            story.append(Spacer(1, 6))
        elif kind == "h2":
            story.append(Paragraph(text, styles["BulenH2"]))
        elif kind == "p":
            story.append(Paragraph(text, styles["BulenBody"]))
        elif kind == "list":
            bullets = [
                ListItem(Paragraph(item, styles["BulenBody"]), leftIndent=12, bulletColor="#20232c")
                for item in text.split("\n")
            ]
            story.append(
                ListFlowable(
                    bullets,
                    bulletType="bullet",
                    start="bullet",
                    bulletFontName="DejaVuSans",
                    bulletFontSize=8,
                    leftIndent=0,
                )
            )
        elif kind == "spacer":
            story.append(Spacer(1, 4))

    return story


def main():
    tokens = parse_markdown(load_markdown())
    story = build_story(tokens)
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=56,
        bottomMargin=48,
        title="BulenCoin – whitesheet inwestorski",
        author="BulenCoin",
        subject="BulenCoin inwestorski whitesheet",
    )
    doc.build(story)
    print(f"PDF saved to {PDF_PATH}")


if __name__ == "__main__":
    main()
