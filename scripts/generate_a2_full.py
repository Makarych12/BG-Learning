# -*- coding: utf-8 -*-
import sys

header = '''# -*- coding: utf-8 -*-
"""
95 unique A2 dialogues for Bulgarian language learning.
Authentic grammar:
- 'във' before в/ф
- 'със' before с/з
- proper clitics & correct Russian translations
- verified substring answers
"""

dialogues_a2 = []

def d(did, title, topic, lines_tuples, question, answer, alts=None):
    parsed = [{"speaker": s, "bg": bg, "ru": ru} for s, bg, ru in lines_tuples]
    assert any(answer in p["bg"] for p in parsed), f"Answer '{answer}' not found in {did}"
    dialogues_a2.append({
        "id": did,
        "level": "A2",
        "title": title,
        "topic": topic,
        "lines": parsed,
        "question": question,
        "answer": answer,
        "alternatives": alts or []
    })

'''

with open("scripts/dialogues_a2.py", "w", encoding="utf-8") as f:
    f.write(header)

print("Started dialogues_a2.py")
