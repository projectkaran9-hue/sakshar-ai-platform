# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('src/components/AdminDashboard.jsx', encoding='utf-8') as f:
    code = f.read()

# Locate duplicate VIEW 2: ANALYTICS OVERVIEW block
start_marker = "            {/* ════════════════ VIEW 2: ANALYTICS OVERVIEW ════════════════ */}"
end_marker = "            {/* ════════════════ VIEW 3: STUDENTS & REPORTS TABLE ════════════════ */}"

if start_marker in code and end_marker in code:
    part1 = code.split(start_marker)[0]
    part2 = code.split(end_marker)[1]
    code = part1 + end_marker + part2
    print("✓ Removed duplicate VIEW 2 block")

with open('src/components/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done cleaning duplicate views!")
