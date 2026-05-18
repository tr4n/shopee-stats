import re

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Update fmtVND/pxgPrice functions
    # function fmtVND(n) { ... }
    content = re.sub(r"n \/ 1e6\)\.toFixed\(1\)\.replace\('\.0', ''\) \+ ' triệu';", "n / 1e6).toFixed(1).replace('.0', '') + 'tr';", content)
    content = re.sub(r"Math\.round\(n \/ 1e3\) \+ 'k';", "(n / 1e3).toFixed(1).replace('.0', '') + 'k';", content)
    
    # For pxgPrice
    content = re.sub(r"number \/ 1000000\)\.toFixed\(1\) \+ 'tr'", "number / 1000000).toFixed(1).replace('.0', '') + 'tr'", content)
    content = re.sub(r"number \/ 1000000\)\.toFixed\(2\) \+ 'tr'", "number / 1000000).toFixed(1).replace('.0', '') + 'tr'", content)
    content = re.sub(r"number \/ 1000\)\.toFixed\(1\) \+ 'k'", "number / 1000).toFixed(1).replace('.0', '') + 'k'", content)
    
    # Remove 'đ' from concatenations and template literals
    content = re.sub(r"fmtVND\(([^)]+)\)\s*\+\s*'đ'", r"fmtVND(\1)", content)
    content = re.sub(r"\$\{fmtVND\(([^)]+)\)\}đ", r"${fmtVND(\1)}", content)
    content = re.sub(r"pxgPrice\(([^)]+)\)\s*\+\s*'đ'", r"pxgPrice(\1)", content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for f in ['dashboard/index.html', 'dashboard/share-card.js', 'extension/popup/script.js', 'extension/popup/share-card.js']:
    try:
        update_file(f)
        print("Updated", f)
    except Exception as e:
        print("Failed", f, e)
