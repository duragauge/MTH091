#!/usr/bin/env python3
# Created with assistance from GPT-5 Thinking (ChatGPT).

"""
build_book.py — Merge HTML sections into one printable book with optional SVG cover(s).

What it does
------------
• Reads a list of files (sections.txt) and/or positional args IN ORDER.
• Accepts both HTML sections and SVG pages in the list.
   - The first SVG is treated as the COVER automatically, or mark a line "cover: path.svg".
   - Additional SVGs become full-page plates (zero margins).
• Extracts ONLY the main content area from HTML (default selector: div.main-content).
• Wraps each HTML section as <section class="chapter" id="..."> for clean page breaks.
• Emits ONE clean HTML with your head assets and (optionally) Paged.js.
• Optional explicit --cover cover.svg still works and overrides the list.

Typical use
-----------
py -3 .\build_book.py --list sections.txt --out MTH091_book.html --paged

Notes
-----
• Keep everything flat in one folder
• Requires: pip install beautifulsoup4
"""

import argparse
import sys
import re
import html
from pathlib import Path
from bs4 import BeautifulSoup

HTML_DOCTYPE = "<!DOCTYPE html>"
ATTRIBUTION_HTML = (
    "<!-- Compiled using build_book.py (created with ChatGPT assistance). "
    "Page content authored by the course team. -->"
)

# ---------- <head> ----------
DEFAULT_HEAD = """\
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="stylesheet" href="stylesheet.css">
<link rel="stylesheet" href="print.css" media="print">

<!-- MathJax v4 config (define BEFORE loading the script) -->
<script>
  window.MathJax = {{
    tex: {{
      inlineMath: [['$','$'], ['\\\\(','\\\\)']],
      displayMath: [['\\\\[','\\\\]'], ['$$','$$']],
      packages: {{ '[+]': ['html','ams'] }},
      macros: {{
        hint:  ['\\\\class{{hint}}{{#1}}', 1],      // raw-math by default
        thint: ['\\\\class{{hint}}{{\\\\text{{#1}}}}', 1]
      }}
    }},
    loader: {{ load: ['[tex]/html','[tex]/ams'] }}
  }};
</script>
<script id="MathJax-script" async
        src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js"></script>

{paged_assets}
{base_tag}
<title>{title}</title>
"""



# ---------- Paged.js assets ----------
# Include CSS -> BOOT -> JS, and start AFTER MathJax finishes.
PAGED_JS  = '<script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>'
PAGED_CSS = '<link rel="stylesheet" href="https://unpkg.com/pagedjs/dist/pagedjs.css">'
PAGED_BOOT = """<script>
  window.PagedConfig = { auto: false };

  function waitForPaged(){
    return new Promise(resolve => {
      (function check(){ (window.Paged && Paged.Preview) ? resolve() : setTimeout(check, 0); }());
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const run = () => waitForPaged().then(() => new Paged.Preview());
    if (window.MathJax?.startup?.promise) {
      MathJax.startup.promise.then(run);            // MathJax v3/v4
    } else if (window.MathJax?.typesetPromise) {
      MathJax.typesetPromise().then(run);           // fallback
    } else {
      run();                                        // no MathJax present
    }
  });
</script>"""


# ---------- helpers ----------
def resolve_relative(base_dir: Path, p: str) -> Path:
    """Resolve p relative to base_dir if not absolute."""
    path = Path(p.strip())
    return path if path.is_absolute() else (base_dir / path)

def parse_entries(list_file: str | None, sources: list[str] | None):
    """
    Reads entries and returns (entries_list, list_dir).
    entries_list is a list of tuples (kind, Path) where kind ∈ {'html','svg','cover'}.
    Paths from sections.txt are resolved relative to the list file's folder.
    Positional sources are resolved relative to the current working directory.
    """
    entries: list[tuple[str, Path]] = []
    list_dir = Path.cwd()

    def classify_text(s: str) -> tuple[str, Path]:
        sl = s.lower().strip()
        if sl.startswith("cover:") or sl.startswith("cover "):
            if ":" in s:
                p = s.split(":", 1)[1].strip()
            else:
                parts = s.split(None, 1)
                p = parts[1].strip() if len(parts) > 1 else ""
            return ("cover", Path(p))
        if sl.endswith(".svg"):
            return ("svg", Path(s.strip()))
        return ("html", Path(s.strip()))

    if list_file:
        lf = Path(list_file)
        list_dir = lf.resolve().parent
        try:
            lines = lf.read_text(encoding="utf-8").splitlines()
        except FileNotFoundError:
            raise SystemExit(f"[ERROR] Could not find sections list: {list_file}")
        for line in lines:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            kind, p = classify_text(s)
            # resolve relative to list file directory
            entries.append((kind, resolve_relative(list_dir, str(p))))

    for s in (sources or []):
        s = s.strip()
        if not s:
            continue
        kind, p = classify_text(s)
        # resolve relative to current working dir
        entries.append((kind, resolve_relative(Path.cwd(), str(p))))

    if not entries:
        raise SystemExit("No input files provided. Use positional files and/or --list sections.txt")
    return entries, list_dir

def sanitize_id(text: str) -> str:
    text = re.sub(r"<.*?>", "", text or "")
    text = re.sub(r"[\s\t\n\r]+", "-", text.strip().lower())
    text = re.sub(r"[^a-z0-9\-]+", "", text)
    return text or "chapter"

def extract_main_content(html_text: str, selector: str = "div.main-content") -> tuple[str, str]:
    soup = BeautifulSoup(html_text, "html.parser")
    node = soup.select_one(selector)
    if not node:
        node = soup.select_one("main, #content, .content, article, body")
    if not node:
        node = soup.body or soup

    # Drop scripts/links/styles inside the extracted block (avoid duplicates)
    for tag in node.find_all(["script", "link", "style"]):
        tag.decompose()

    # ID from first heading if possible
    h = node.find(["h1", "h2", "h3", "h4"])
    title = h.get_text(strip=True) if h else ""
    chap_id = sanitize_id(title)
    html_block = f'<section class="chapter" id="{chap_id}">\n{str(node)}\n</section>'
    return html_block, (title or chap_id)

def read_text_or_warn(path: Path) -> str:
    if not path.exists():
        print(f"[WARN] Not found: {path}", file=sys.stderr)
        return ""
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        print(f"[WARN] Could not read {path}: {e}", file=sys.stderr)
        return ""

# ---------- main ----------
def main():
    ap = argparse.ArgumentParser(description="Merge HTML/SVG sections into one printable HTML book")
    ap.add_argument("sources", nargs="*", help="Section files in order (HTML and/or SVG)")
    ap.add_argument("--list", help="Text file listing section paths in order")
    ap.add_argument("--title", default="MTH091 — Algebraic Literacy")
    ap.add_argument("--out", default="MTH091_book.html")
    ap.add_argument("--cover", help="SVG file to inline as the first page (overrides list-detected cover)")
    ap.add_argument("--paged", action="store_true", help="Include Paged.js and its preview CSS")
    ap.add_argument("--base", help="Set a <base href=...> tag in the head (optional)")
    ap.add_argument("--selector", default="div.main-content", help="CSS selector for the main content block in HTML files")
    args = ap.parse_args()

    entries, list_dir = parse_entries(args.list, args.sources)

    # Determine cover SVG (priority: --cover > explicit 'cover:' in list > first svg in list)
    cover_path = Path(args.cover).resolve() if args.cover else None
    if not cover_path:
        for i, (kind, p) in enumerate(entries):
            if kind == "cover":
                cover_path = p
                entries.pop(i)
                break
    if not cover_path:
        for i, (kind, p) in enumerate(entries):
            if kind == "svg":
                cover_path = p
                entries.pop(i)   # remove from normal flow; it's the cover now
                break

    # Build sections
    chapters_html: list[str] = []
    html_count = 0
    svg_count = 0

    # Optional cover (inline SVG)
    cover_html = ""
    if cover_path:
        svg_text = read_text_or_warn(cover_path)
        if svg_text.strip():
            cover_html = f'<section id="cover">\n{svg_text}\n</section>'
            print(f"[INFO] Using cover: {cover_path}")
        else:
            print(f"[WARN] Cover specified but empty/unreadable: {cover_path}", file=sys.stderr)

    # Process remaining entries
    for kind, p in entries:
        text = read_text_or_warn(p)
        if not text.strip():
            continue

        if kind == "html":
            block, _title = extract_main_content(text, selector=args.selector)
            chapters_html.append(block)
            html_count += 1
            print(f"[OK] HTML: {p}")
        elif kind == "svg":
            # Additional SVG pages — full-page, zero margins (reuse @page cover rules).
            block = (
                '<section class="svg-page" style="page: cover; break-after: right;">\n'
                f"{text}\n</section>"
            )
            chapters_html.append(block)
            svg_count += 1
            print(f"[OK] SVG page: {p}")
        else:
            block, _title = extract_main_content(text, selector=args.selector)
            chapters_html.append(block)
            html_count += 1
            print(f"[OK] HTML (fallback): {p}")

    # Build the Paged.js asset block only when requested — CSS -> BOOT -> JS
    paged_assets = (PAGED_CSS + "\n" + PAGED_BOOT + "\n" + PAGED_JS) if args.paged else ""
    base_tag = f'<base href="{html.escape(args.base)}">' if args.base else ""
    head_html = DEFAULT_HEAD.format(
        title=html.escape(args.title),
        paged_assets=paged_assets,
        base_tag=base_tag
    )

    # Compose document (cover OUTSIDE the wrapper so it can be full-bleed)
    final_html = [
    HTML_DOCTYPE,
    '<html lang="en">',
    '<head>',
    head_html,          # <-- this is DEFAULT_HEAD.format(...)
    '</head>',
    '<body>',
    cover_html,
    '\n<section id="blank-page" aria-hidden="true" role="presentation"></section>\n' if cover_html else "",
    '<div class="wrapper book-wrapper">',
    "\n".join(chapters_html),
    ATTRIBUTION_HTML,
    '</div>',
    '</body>',
    '</html>',
]

    # Write output
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if not cover_html and not chapters_html:
        print("[ERROR] No readable inputs found. Nothing to write.", file=sys.stderr)
        sys.exit(2)

    out_path.write_text("\n".join(final_html), encoding="utf-8")
    print(
        f"[DONE] Wrote {out_path.resolve()}  "
        f"(HTML sections: {html_count}, SVG pages: {svg_count}, Cover: {'yes' if cover_html else 'no'})"
    )

if __name__ == "__main__":
    main()
