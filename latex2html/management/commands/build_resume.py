from django.core.management.base import BaseCommand
import pathlib
import re

import pypandoc
from bs4 import BeautifulSoup


class Command(BaseCommand):
    help = "Convert LaTeX resume to an HTML fragment for Django (templates/_resume_content.html)."

    def handle(self, *args, **kwargs):
        app_dir = pathlib.Path(__file__).resolve().parents[2]           # .../latex2html
        project_root = app_dir.parent                                    # repo root
        src = app_dir / "resume_src" / "resume.tex"
        out = app_dir / "templates" / "_resume_content.html"

        if not src.exists():
            raise SystemExit(f"Missing LaTeX source: {src}")

        # Optional: if LaTeX includes PDF images, swap .pdf -> .png for HTML build
        text = src.read_text(encoding="utf-8")
        text = re.sub(r'(\\includegraphics(?:\[[^\]]*\])?\{[^}]+)\.pdf\}', r'\1.png}', text)
        tmp = src.with_suffix(".converted.tex")
        tmp.write_text(text, encoding="utf-8")

        html = pypandoc.convert_file(
            str(tmp),
            to="html5",
            format="latex",
            extra_args=[
                "--quiet",
                "--mathjax",
                # Let Pandoc find images in these dirs
                f"--resource-path={app_dir/'resume_src'}:{project_root/'PNGs'}:{project_root/'PDfs'}",
            ],
        )

        # ---- Minimal, surgical post-processing ----
        html = _fix_math_pipes(html)          # remove \(|\) / \( \mid \) / $|$
        html = _skills_to_chips(html)         # turn “Technical Skills” into chip lists (no other layout changes)

        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        tmp.unlink(missing_ok=True)
        self.stdout.write(self.style.SUCCESS(f"Built {out}"))


# -------- helpers --------

def _fix_math_pipes(s: str) -> str:
    """
    Replace LaTeX inline-math pipes with a plain textual separator.
    Examples seen in Pandoc HTML: \(|\), \( \mid \), \( \textbar \), or $|$.
    """
    patterns = [
        r"\\\(\s*\|\s*\\\)",        # \(|\)
        r"\\\(\s*\\mid\s*\\\)",     # \( \mid \)
        r"\\\(\s*\\textbar\s*\\\)", # \( \textbar \)
        r"\$\s*\|\s*\$",            # $|$
    ]
    for pat in patterns:
        s = re.sub(pat, " | ", s)
    # Drop any empty \( \)
    s = re.sub(r"\\\(\s*\\\)", "", s)
    return s


def _skills_to_chips(html: str) -> str:
    """
    Find the 'Technical Skills' section and convert its label:value text into
    <p><strong>Label</strong></p> + <ul class="skills"><li>…</li></ul> blocks.
    Keeps your existing CSS intact (chips styled via .skills).
    """
    soup = BeautifulSoup(html, "html.parser")

    # 1) locate the heading
    header = None
    for h in soup.find_all(re.compile(r"^h[1-6]$")):
        if h.get_text(strip=True).lower() in {"technical skills", "skills"}:
            header = h
            break
    if not header:
        return html

    # 2) collect nodes until the next heading
    collected = []
    nxt = header.find_next_sibling()
    while nxt and not re.match(r"^h[1-6]$", nxt.name or "", re.I):
        collected.append(nxt)
        nxt = nxt.find_next_sibling()
    if not collected:
        return html

    block_text = " ".join(n.get_text(" ", strip=True) for n in collected)

    labels = ["Languages", "Frameworks", "Developer Tools", "Libraries"]
    found = []
    for label in labels:
        m = re.search(
            rf"{label}\s*:\s*(.+?)(?=(?:{'|'.join(map(re.escape, labels))})\s*:|$)",
            block_text,
            flags=re.I,
        )
        if not m:
            continue
        items = [s.strip() for s in m.group(1).split(",") if s.strip()]
        if items:
            found.append((label, items))
    if not found:
        return html

    # 3) replace the original block with chip lists
    for n in collected:
        n.extract()

    insert_after = header
    for label, items in found:
        p = soup.new_tag("p")
        strong = soup.new_tag("strong")
        strong.string = label
        p.append(strong)
        ul = soup.new_tag("ul", **{"class": "skills"})
        for it in items:
            li = soup.new_tag("li")
            li.string = it
            ul.append(li)
        insert_after.insert_after(ul)
        ul.insert_before(p)
        insert_after = ul  # advance insertion point

    return str(soup)
