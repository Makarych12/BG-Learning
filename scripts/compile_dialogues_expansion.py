# -*- coding: utf-8 -*-
"""Compile all 360 dialogues into src/dialogues-expansion.ts."""
import sys
import json
from pathlib import Path

sys.path.insert(0, "scripts")
import dialogues_a1
import dialogues_a2
import dialogues_b1
import dialogues_b2

all_dialogues = []
all_dialogues.extend(dialogues_a1.dialogues_a1)
all_dialogues.extend(dialogues_a2.dialogues_a2)
all_dialogues.extend(dialogues_b1.dialogues_b1)
all_dialogues.extend(dialogues_b2.dialogues_b2)

assert len(all_dialogues) == 360, f"Expected 360 dialogues, got {len(all_dialogues)}"

# Verify uniqueness of IDs
ids = [d["id"] for d in all_dialogues]
assert len(ids) == len(set(ids)), f"Duplicate dialogue IDs found! {len(ids)} vs {len(set(ids))}"

# Verify each answer exists in lines
for d in all_dialogues:
    assert any(d["answer"] in line["bg"] for line in d["lines"]), f"Answer '{d['answer']}' not in lines of {d['id']}"

ts_content = """import type { Dialogue } from "./curriculum";

export const extraDialogues: Dialogue[] = """ + json.dumps(all_dialogues, ensure_ascii=False, indent=2) + ";\n"

Path("src/dialogues-expansion.ts").write_text(ts_content, encoding="utf-8")
print(f"Successfully compiled {len(all_dialogues)} dialogues to src/dialogues-expansion.ts")
