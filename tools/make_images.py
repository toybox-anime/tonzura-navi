"""シェア用の画像を作る。
- og.png   : SNSでリンクを貼ったときのプレビュー（1200x630）
- card.png : LINEなどで送る注意カード（1080x1350）
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_B = "C:/Windows/Fonts/BIZ-UDGothicB.ttc"
FONT_R = "C:/Windows/Fonts/BIZ-UDGothicR.ttc"
RED = (229, 50, 45)
INK = (29, 35, 48)
SUB = (95, 104, 120)
BG = (246, 247, 249)
WHITE = (255, 255, 255)


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, f, width):
    lines, cur = [], ""
    for ch in text:
        if draw.textlength(cur + ch, font=f) > width and cur:
            if ch in "、。」）":
                cur += ch
                continue
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines


def og():
    im = Image.new("RGB", (1200, 630), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1200, 120], fill=RED)
    d.text((60, 32), "とんずら回収ナビ", font=font(FONT_B, 54), fill=WHITE)
    d.text((60, 175), "PayPayで送金して", font=font(FONT_B, 68), fill=INK)
    d.text((60, 265), "逃げられた・詐欺にあったら", font=font(FONT_B, 68), fill=INK)
    d.text((60, 385), "やることを順番に。証拠の整理と、", font=font(FONT_R, 40), fill=SUB)
    d.text((60, 440), "警察・PayPay・内容証明の文面づくりまで。", font=font(FONT_R, 40), fill=SUB)
    d.rounded_rectangle([60, 520, 520, 590], radius=35, fill=RED)
    d.text((95, 535), "無料・登録なしで使える", font=font(FONT_B, 34), fill=WHITE)
    im.save(ROOT / "og.png", optimize=True)


def card():
    W, H = 1080, 1350
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 230], fill=RED)
    d.text((70, 55), "PayPayの詐欺", font=font(FONT_B, 76), fill=WHITE)
    d.text((70, 145), "知っておくと防げる3つのこと", font=font(FONT_B, 50), fill=WHITE)
    items = [
        ("「PayPayで返金します」は詐欺の合図",
         "受け取るのに、金額を入力したり「送る」を押したりする必要はありません。"),
        ("「受け取り待ち」なら取り消せる",
         "送ってしまっても、相手がまだ受け取っていなければ取り消せます。4日で自動で戻ります。"),
        ("「取り戻します」業者は二次被害",
         "被害者に向こうから近づいてくる回収業者には、お金を払わないで。"),
    ]
    y = 290
    for n, (head, body) in enumerate(items, 1):
        fh, fb = font(FONT_B, 46), font(FONT_R, 36)
        body_lines = wrap(d, body, fb, W - 260)
        h = 90 + 52 * len(body_lines) + 30
        d.rounded_rectangle([50, y, W - 50, y + h], radius=28, fill=WHITE, outline=(225, 229, 236), width=3)
        d.ellipse([80, y + 30, 150, y + 100], fill=RED)
        d.text((115, y + 65), str(n), font=font(FONT_B, 44), fill=WHITE, anchor="mm")
        d.text((180, y + 38), head, font=fh, fill=INK)
        for i, line in enumerate(body_lines):
            d.text((180, y + 110 + 52 * i), line, font=fb, fill=SUB)
        y += h + 30
    d.text((W // 2, H - 150), "もしもの時にやることのまとめ", font=font(FONT_R, 38), fill=SUB, anchor="mm")
    d.text((W // 2, H - 90), "「とんずら回収ナビ」で検索", font=font(FONT_B, 48), fill=RED, anchor="mm")
    im.save(ROOT / "card.png", optimize=True)


if __name__ == "__main__":
    og()
    card()
    print("og.png / card.png")
