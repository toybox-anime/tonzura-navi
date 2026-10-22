"""公開前のチェック。改善ルーティンでも人の手でも、PRの前に実行する。

    python tools/check.py

- app.js の構文（node が入っていれば node --check）
- HTML内のリンク・画像・CSS/JSが、リポジトリ内に実在するか
- sitemap.xml に guide/*.html と about.html がすべて載っているか
- 守るべき文言・設定が消えていないか
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
errors = []


def err(msg):
    errors.append(msg)


# 1. JSの構文
if shutil.which("node"):
    r = subprocess.run(["node", "--check", str(ROOT / "app.js")], capture_output=True, text=True)
    if r.returncode != 0:
        err("app.js の構文エラー:\n" + r.stderr)
else:
    print("（node が無いので app.js の構文チェックは省略）")

# 2. 内部リンク
html_files = [ROOT / "index.html", ROOT / "about.html", *sorted((ROOT / "guide").glob("*.html"))]
for f in html_files:
    s = f.read_text(encoding="utf-8")
    for ref in re.findall(r'(?:href|src)="([^"]+)"', s):
        if re.match(r"^(https?:|mailto:|tel:|#)", ref):
            continue
        path = ref.split("#")[0].split("?")[0]
        if not path or path.endswith("/") and (f.parent / path / "index.html").exists():
            continue
        target = (f.parent / path).resolve()
        if path in ("./", "../"):
            target = target / "index.html"
        if not target.exists():
            err(f"{f.relative_to(ROOT)}: リンク先がない → {ref}")

# app.js 内の guide/ へのリンク
app = (ROOT / "app.js").read_text(encoding="utf-8")
for ref in set(re.findall(r"'(guide/[a-z-]+\.html)'", app)):
    if not (ROOT / ref).exists():
        err(f"app.js: リンク先がない → {ref}")

# 3. サイトマップ
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
for f in [*sorted((ROOT / "guide").glob("*.html")), ROOT / "about.html"]:
    rel = f.relative_to(ROOT).as_posix()
    if rel not in sitemap:
        err(f"sitemap.xml に {rel} がない（python tools/build_guides.py で作り直す）")

# 4. 消してはいけないもの
must = {
    "index.html": ["google-site-verification", "DeTBbrd14hps2rPgp8ndbPRSAq0PRjgoRqXECnyWPT0"],
    "about.html": ["ナノトイラボ", "なりすまし", "送信されることはありません"],
    "app.js": ["tonzura-navi-v1", "回収詐欺", "法律相談ではありません", "よりそいホットライン"],
}
for name, words in must.items():
    s = (ROOT / name).read_text(encoding="utf-8")
    for w in words:
        if w not in s:
            err(f"{name}: 「{w}」が消えている（ROUTINE.md の「触ってはいけないもの」）")

# 5. 書いてはいけない約束
banned = ["必ず取り戻", "必ず回収", "100%返金", "確実に取り戻"]
for f in [ROOT / "app.js", *html_files]:
    s = f.read_text(encoding="utf-8")
    for w in banned:
        if w in s:
            err(f"{f.relative_to(ROOT)}: 「{w}」と書いてはいけない（回収を約束しない）")

# 6. 外部へデータを送るコードが入っていないか
for pat in [r"\bfetch\(\s*['\"]https?://", r"XMLHttpRequest", r"sendBeacon", r"googletagmanager", r"gtag\("]:
    if re.search(pat, app):
        err(f"app.js: 外部通信らしきコード（{pat}）。データを外に送らない約束を確認")

if errors:
    print("NG")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("OK")
