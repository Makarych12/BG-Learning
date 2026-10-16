# -*- coding: utf-8 -*-
"""Generate 305 unique, non-templated voice scenarios."""
import json
from pathlib import Path

scenarios = []

def add(sid, theme, theme_title, level, title, situation, p_bg, p_ru, t_bg, t_ru, hints, alts, diff, follow_up=None):
    assert "#" not in title, f"Templated title found in {sid}: {title}"
    item = {
        "id": f"voice-{sid}",
        "theme": theme,
        "themeTitle": theme_title,
        "level": level,
        "title": title,
        "situation": situation,
        "partnerPromptBg": p_bg,
        "partnerPromptRu": p_ru,
        "targetResponseBg": t_bg,
        "targetResponseRu": t_ru,
        "hints": hints,
        "alternatives": alts,
        "difficulty": diff
    }
    if follow_up:
        item["followUp"] = follow_up
    scenarios.append(item)

print("Starting generation of 305 voice scenarios...")
