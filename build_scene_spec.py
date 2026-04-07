#!/usr/bin/env python3
"""Parse (N)ch0-3.html → chapters/0-3/scene-spec.json
Uses depth-counting to correctly extract nested divs.
"""
import json, re, os

HTML_PATH = "chapters/0-3/(N)ch0-3.html"
OUT       = "chapters/0-3/scene-spec.json"

with open(HTML_PATH, encoding='utf-8') as f:
    raw = f.read()

def strip_tags(html):
    html = re.sub(r'<br\s*/?>', '\n', html)
    html = re.sub(r'<[^>]+>', '', html)
    html = html.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&#39;', "'").replace('&quot;', '"')
    return re.sub(r'[ \t]+', ' ', html).strip()

def extract_divs_by_class(html, cls):
    """Extract all top-level <div class="...cls..."> blocks with proper nesting."""
    pattern = re.compile(r'<div[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>')
    results = []
    for m in pattern.finditer(html):
        start = m.start()
        # Count depth to find matching close tag
        depth = 0
        i = m.start()
        while i < len(html):
            open_m  = re.match(r'<div', html[i:])
            close_m = re.match(r'</div>', html[i:])
            if open_m:
                depth += 1
                i += open_m.end()
            elif close_m:
                depth -= 1
                if depth == 0:
                    results.append(html[start:i + close_m.end()])
                    break
                i += close_m.end()
            else:
                i += 1
    return results

def first_text(html, tag, cls=None):
    if cls:
        p = rf'<{tag}[^>]*class="[^"]*\b{re.escape(cls)}\b[^"]*"[^>]*>(.*?)</{tag}>'
    else:
        p = rf'<{tag}[^>]*>(.*?)</{tag}>'
    m = re.search(p, html, re.DOTALL)
    return strip_tags(m.group(1)) if m else ''

def parse_section(block):
    spec = {
        "section": first_text(block, 'span', 'section-num') or '?',
        "title":   first_text(block, 'h2') or '',
        "items":   []
    }

    # Process children in document order by scanning for div openings
    # We look for direct class markers
    seen_positions = []

    def add(pos, item):
        seen_positions.append((pos, item))

    # Cards
    for m in re.finditer(r'<div[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>', block):
        inner = extract_divs_by_class(block[m.start():], 'card')
        if inner:
            text = strip_tags(re.sub(r'<div[^>]*class="[^"]*\blabel\b[^"]*"[^>]*>.*?</div>', '', inner[0], flags=re.DOTALL))
            add(m.start(), {"type": "card", "text": text})
            break  # avoid duplicates from nested structure

    for m in re.finditer(r'<div[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>', block):
        divs = extract_divs_by_class(block[m.start():], 'card')
        if divs:
            text = strip_tags(re.sub(r'<div[^>]*class="[^"]*\blabel\b[^"]*"[^>]*>.*?</div>', '', divs[0], flags=re.DOTALL))
            add(m.start(), {"type": "card", "text": text})

    # Analogy
    for m in re.finditer(r'<div[^>]*class="[^"]*\banalogy\b[^"]*"[^>]*>', block):
        divs = extract_divs_by_class(block[m.start():], 'analogy')
        if divs:
            label = first_text(divs[0], 'div', 'label') or '比喻'
            body  = strip_tags(re.sub(r'<div[^>]*class="[^"]*\blabel\b[^"]*"[^>]*>.*?</div>', '', divs[0], flags=re.DOTALL))
            add(m.start(), {"type": "analogy", "label": label, "text": body})

    # Tip box
    for m in re.finditer(r'<div[^>]*class="[^"]*\btip-box\b[^"]*"[^>]*>', block):
        divs = extract_divs_by_class(block[m.start():], 'tip-box')
        if divs:
            label = first_text(divs[0], 'div', 'label') or '提示'
            body  = strip_tags(re.sub(r'<div[^>]*class="[^"]*\blabel\b[^"]*"[^>]*>.*?</div>', '', divs[0], flags=re.DOTALL))
            add(m.start(), {"type": "tip", "label": label, "text": body})

    # Quiz box
    for m in re.finditer(r'<div[^>]*class="[^"]*\bquiz-box\b[^"]*"[^>]*>', block):
        divs = extract_divs_by_class(block[m.start():], 'quiz-box')
        if divs:
            label = first_text(divs[0], 'div', 'label') or '想一想'
            body  = strip_tags(re.sub(r'<div[^>]*class="[^"]*\blabel\b[^"]*"[^>]*>.*?</div>', '', divs[0], flags=re.DOTALL))
            add(m.start(), {"type": "quiz", "label": label, "text": body})

    # Method cards
    for m in re.finditer(r'<div[^>]*class="[^"]*\bmethod-card\b[^"]*"[^>]*>', block):
        divs = extract_divs_by_class(block[m.start():], 'method-card')
        if divs:
            d = divs[0]
            add(m.start(), {
                "type":  "method",
                "badge": first_text(d, 'span', 'method-badge'),
                "name":  first_text(d, 'div', 'method-name'),
                "desc":  strip_tags(re.search(r'<p[^>]*class="[^"]*method-desc[^"]*"[^>]*>(.*?)</p>', d, re.DOTALL).group(1)) if re.search(r'class="[^"]*method-desc', d) else '',
                "pros":  first_text(d, 'div', 'method-pros'),
                "cons":  first_text(d, 'div', 'method-cons'),
            })

    # SDLC steps
    for m in re.finditer(r'<div[^>]*class="[^"]*\bsdlc-step\b[^"]*"[^>]*>', block):
        steps = []
        for sm in re.finditer(r'<div[^>]*class="[^"]*\bsdlc-step\b[^"]*"[^>]*>', block):
            divs = extract_divs_by_class(block[sm.start():], 'sdlc-step')
            if divs:
                d = divs[0]
                title = first_text(d, 'div', 'sdlc-title') or strip_tags(d)
                subtitle = first_text(d, 'span', 'sdlc-subtitle') or ''
                # Remove subtitle from title
                title = title.replace(subtitle, '').strip()
                desc = first_text(d, 'div', 'sdlc-desc') or ''
                steps.append({"title": title, "subtitle": subtitle, "desc": desc})
        if steps:
            add(m.start(), {"type": "sdlc_steps", "steps": steps})
        break  # only add once

    # SDLC detailed items (sdlc-item with title/desc)
    for m in re.finditer(r'<div[^>]*class="[^"]*\bsdlc-item\b[^"]*"[^>]*>', block):
        items = []
        for sm in re.finditer(r'<div[^>]*class="[^"]*\bsdlc-item\b[^"]*"[^>]*>', block):
            divs = extract_divs_by_class(block[sm.start():], 'sdlc-item')
            if divs:
                d = divs[0]
                items.append({
                    "num":   first_text(d, 'div', 'sdlc-dot') or first_text(d, 'div', 'sdlc-num') or '',
                    "title": first_text(d, 'div', 'sdlc-title') or '',
                    "desc":  first_text(d, 'div', 'sdlc-desc') or first_text(d, 'p', '') or '',
                })
        if items:
            add(m.start(), {"type": "sdlc_items", "items": items})
        break

    # Review items
    for m in re.finditer(r'<div[^>]*class="[^"]*\breview-item\b[^"]*"[^>]*>', block):
        items = []
        for sm in re.finditer(r'<div[^>]*class="[^"]*\breview-item\b[^"]*"[^>]*>', block):
            divs = extract_divs_by_class(block[sm.start():], 'review-item')
            if divs:
                d = divs[0]
                items.append({
                    "num":  first_text(d, 'span', 'review-num') or '',
                    "text": strip_tags(re.sub(r'<span[^>]*>.*?</span>', '', d, flags=re.DOTALL)),
                })
        if items:
            add(m.start(), {"type": "review_items", "items": items})
        break

    # Sort by document position and deduplicate
    seen_positions.sort(key=lambda x: x[0])
    seen_texts = set()
    for _, item in seen_positions:
        key = item.get('text','') or item.get('name','') or str(item.get('type',''))
        if key not in seen_texts:
            seen_texts.add(key)
            spec["items"].append(item)

    return spec

# Extract section blocks using depth counting
sections = extract_divs_by_class(raw, 'section')
specs = [parse_section(s) for s in sections]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(specs, f, ensure_ascii=False, indent=2)

print(f"✓ {OUT}")
for s in specs:
    print(f"  Section {s['section']}: {s['title']}")
    for item in s['items']:
        t = item['type']
        label = item.get('name') or item.get('label') or ''
        text_preview = (item.get('text','') or '')[:60].replace('\n',' ')
        print(f"    [{t}] {label} {text_preview}")
