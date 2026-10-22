"""手口別の解説ページ（guide/*.html）と sitemap.xml を生成する。

検索から来た人がJavaScriptなしでも読めるよう、静的HTMLで書き出す。
内容を直したらこのファイルを編集して `python tools/build_guides.py` を実行する。
"""
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://toybox-anime.github.io/tonzura-navi/"
UPDATED = "2026年10月22日"
UPDATED_ISO = "2026-10-22"

SRC = {
    "pp_help": ("PayPay ヘルプ：不正利用・詐欺対策について", "https://paypay.ne.jp/help/c0176/"),
    "pp_report": ("PayPay ヘルプ：詐欺の疑いがある取引の報告", "https://paypay.ne.jp/help/c0363/"),
    "pp_report_how": ("PayPay ヘルプ：詐欺等の疑いがある送る・受け取るを利用した取引を報告したい", "https://paypay.ne.jp/help/c0538/"),
    "pp_hosho": ("PayPay ヘルプ：不正利用の補償について", "https://paypay.ne.jp/help/c0117/"),
    "pp_limit": ("PayPay ヘルプ：受け取り期限", "https://paypay.ne.jp/help/c0091/"),
    "pp_contact": ("PayPay ヘルプ：お問い合わせ窓口", "https://paypay.ne.jp/help/c0005/"),
    "pp_notice": ("PayPay：詐欺被害防止のお知らせ（2025年12月）", "https://paypay.ne.jp/notice/20251219/s-01/"),
    "pp_notice2": ("PayPay：不正利用・詐欺に関するお知らせ（2026年8月）", "https://paypay.ne.jp/notice/20260828/s-01/"),
    "itmedia": ("ITmedia：PayPayの誤送金はなぜ強制キャンセルできないか（2026年6月）", "https://www.itmedia.co.jp/mobile/articles/2606/13/news002.html"),
    "kokusen": ("国民生活センター：「〇〇ペイで返金します」は詐欺を疑って（Impress記事）", "https://internet.watch.impress.co.jp/docs/news/1613525.html"),
    "fsa": ("金融庁：被害回復等を装った詐欺（二次被害トラブル）にご注意ください（2026年9月）", "https://www.fsa.go.jp/ordinary/chuui/20260901.html"),
    "court": ("裁判所：少額訴訟", "https://www.courts.go.jp/saiban/syurui/syurui_minzi/minzi_04_02_02/index.html"),
    "post": ("日本郵便：内容証明のご利用の条件・料金", "https://www.post.japanpost.jp/service/send/domestic/option/syomei/use.html"),
    "moj": ("法務省：法定利率（2026年4月以降も年3%）", "https://www.moj.go.jp/MINJI/minji07_00366.html"),
}

# いますぐやること（どのページにも出す）
NOW = """<ol class="now">
<li><b>まだ取り消せないか確認</b>：PayPayの取引履歴でその送金が「受け取り待ち」なら、取り消せます。</li>
<li><b>これ以上は送らない</b>：「返金のため」「手数料」「税金」と言われても払わない。相手の指示でPayPayを操作しない。</li>
<li><b>証拠をスクショ</b>：取引履歴・相手のプロフィール・やりとりを、消される前に保存。</li>
<li><b>警察（#9110）とPayPayに相談</b>：PayPayは、アプリの「送る」→ 相手とのチャット → その取引 →「取引を報告する」から報告できます（過去90日以内の取引）。電話は0120-990-634（24時間）。</li>
</ol>
<p><b>自分では送っていないのに</b>、支払いや送金がされていたときは「不正利用」です。やることが違うので、<a href="fusei-riyou.html">不正利用のときにやること</a>を見てください。</p>"""

PAGES = [
    {
        "slug": "torikeshi",
        "title": "PayPayの送金は取り消せる？「受け取り待ち」なら間に合います",
        "desc": "PayPayで送ったお金は、相手が「受け取り待ち」のうちなら取り消せます。4日（96時間）受け取られなければ自動で戻ります。受け取り完了後にできることもまとめました。",
        "lead": "送ってしまってから「しまった」と気づいたら、まず取引履歴を見てください。<b>相手がまだ受け取っていなければ、取り消せます。</b>",
        "body": """
<h2>取り消せるのは「受け取り待ち」のとき</h2>
<p>PayPayの「送る」で送ったお金は、相手が受け取る前なら、送った側で取り消せます。取引履歴やトーク画面でその送金を開き、<b>「受け取り待ち」</b>と表示されているか確認してください（画面の表示はアプリのバージョンによって変わることがあります）。</p>
<p>相手が受け取らないまま<b>4日（96時間）</b>たつと、送金は自動でキャンセルされ、残高が戻ってきます。</p>

<h2>「受け取り完了」になっていたら</h2>
<p>相手が「自動で受け取る」設定にしていると、送った瞬間に受け取りが完了します。この場合、<b>システム上の取り消しはできません</b>。PayPayが強制的に戻すこともできず、自分で送ったお金は<b>PayPayの補償の対象外</b>です。</p>
<p>取り戻すには、相手に返してもらうしかありません。相手が応じない・連絡が取れない場合は、次の順番で進めます。</p>
<ul>
<li>送り先を間違えただけなら、まず相手にていねいに連絡して返金をお願いする</li>
<li>詐欺の疑いがあれば、<b>警察に相談</b>し、<b>PayPayに報告</b>する（相手アカウントの調査や利用停止につながることがあります）</li>
<li>相手の本名と住所が分かれば、内容証明や少額訴訟で請求できる</li>
</ul>

<h2>これからのための設定</h2>
<p>PayPayには、1日・1か月の<b>利用可能額</b>を設定する機能があります。詳細設定で「取引を一時保留する」を選ぶと、設定額を超えた取引が保留され、<b>キャンセルできる</b>状態になります。だまされて大きな額を送ってしまうのを防げます。</p>
<p>送る前に、相手に<b>本人確認済みの青いバッジ</b>が付いているかも確認しましょう。</p>
""",
        "sources": ["pp_limit", "itmedia", "pp_help", "pp_notice"],
    },
    {
        "slug": "henkin-sagi",
        "title": "「PayPayで返金します」は詐欺の合図。逆にお金を送らされる手口",
        "desc": "ネットショップやフリマで「在庫がないのでPayPayで返金します」と言われ、指示どおり操作したら逆に送金していた——という被害が相次いでいます。手口と、被害にあったときにやることをまとめました。",
        "lead": "お金を<b>受け取る</b>のに、あなたが金額を入力したり「送る」を押したりする必要はありません。それを求められたら詐欺です。",
        "body": """
<h2>よくある流れ</h2>
<ol>
<li>ネットショップやSNSで商品を買い、代金を払う</li>
<li>「在庫がなくなったので返金します」「返金の手続きにPayPayを使います」と連絡が来る</li>
<li>LINEなどで「PayPayを開いて、この番号を入力して」と順番に指示される</li>
<li>言われたとおりに操作すると、実は<b>相手にお金を送っていた</b></li>
</ol>
<p>国民生活センターや業界団体の名前をかたって「返金の手続き」を案内する例もあります。</p>

<h2>見分けるポイント</h2>
<ul>
<li>返金なのに、自分でPayPayを操作するよう言われる</li>
<li>「確認のため」と言って、金額や番号を入力させる</li>
<li>LINEやビデオ通話でつないだまま、急がせる</li>
<li>公的機関の名前を出してくるのに、連絡先がLINEや個人の携帯</li>
</ul>
<p>本物の消費生活センターは、返金のためにアプリの操作を指示したり、お金を求めたりしません。</p>

<h2>送ってしまったら</h2>
<p>まず取引履歴を見て、<b>「受け取り待ち」なら取り消してください</b>。そのうえで、相手とのやりとりを止め、証拠を残し、消費者ホットライン（<b>188</b>）、警察（<b>#9110</b>）、PayPayに相談します。</p>
""",
        "sources": ["kokusen", "pp_notice", "pp_notice2", "pp_report_how"],
    },
    {
        "slug": "ticket-sagi",
        "title": "チケット・フリマの先払いで相手が消えた。PayPay送金後にやること",
        "desc": "SNSでのチケット譲渡や個人間の売買で、PayPayで先に払ったのに相手と連絡が取れなくなった。そのときに取れる手段と、次から防ぐための確認ポイントをまとめました。",
        "lead": "SNSでの「チケット譲ります」「安く売ります」は、PayPay公式も注意を呼びかけている代表的な手口です。",
        "body": """
<h2>よくある流れ</h2>
<ol>
<li>SNSで「チケット譲ります」「定価以下で売ります」という投稿を見つける</li>
<li>DMでやりとりし、「先にPayPayで送ってくれたら発送します」と言われる</li>
<li>送金したあと、ブロックされたりアカウントが消えたりする</li>
</ol>

<h2>取り戻すためにできること</h2>
<ul>
<li><b>証拠を残す</b>：投稿、DM、相手のプロフィール、取引履歴をスクショ。アカウントが消える前に。</li>
<li><b>PayPayに報告</b>：同じ相手による次の被害を防ぐことにもつながります。</li>
<li><b>警察に相談</b>：相手を特定できるのは、多くの場合、警察の捜査です。同じ相手の被害者が多いほど動きやすくなります。</li>
<li><b>相手の名前と住所が分かれば</b>：契約を解除して代金を返すよう、内容証明や少額訴訟（60万円以下）で請求できます。</li>
</ul>

<h2>次から防ぐために</h2>
<ul>
<li>チケットは、できるだけ<b>公式のリセール</b>を使う</li>
<li>個人に先払いするなら、相手のPayPayに<b>本人確認済みの青いバッジ</b>があるか確認する</li>
<li>相場より安すぎる、急がせる、別のアプリに誘導する相手は避ける</li>
</ul>
""",
        "sources": ["pp_notice", "pp_notice2", "pp_report_how", "court"],
    },
    {
        "slug": "toushi-romance",
        "title": "投資・副業・ロマンス詐欺でPayPay送金してしまったら",
        "desc": "「必ず儲かる」「出金には手数料が必要」「会ったことのない恋人から投資の誘い」。SNS型の投資・ロマンス詐欺でPayPayや銀行振込で送金したときにやること、二次被害の防ぎ方をまとめました。",
        "lead": "いちばん大切なのは、<b>これ以上お金を失わないこと</b>です。「出金のための手数料」は、払っても戻ってきません。",
        "body": """
<h2>よくある特徴</h2>
<ul>
<li>SNSやマッチングアプリで知り合い、一度も会っていない</li>
<li>有名人の名前を使った広告から、LINEのグループに誘われる</li>
<li>「必ず儲かる」「元本保証」「あなただけ」と言われる</li>
<li>利益が出たように見えるのに、引き出そうとすると「手数料」「税金」「保証金」を求められる</li>
<li>「PayPayで送れば倍にして返す」と言われる</li>
</ul>

<h2>送ってしまったら</h2>
<ul>
<li><b>追加では払わない</b>。相手とのやりとりはいったん止める</li>
<li>証拠（やりとり、広告、サイトのURL、取引履歴）を保存する</li>
<li><b>警察（#9110）</b>と<b>消費者ホットライン（188）</b>に相談する</li>
<li>PayPayに報告する</li>
<li><b>銀行振込でも送っていたら、すぐ振込先の銀行に連絡</b>。相手の口座が凍結されれば、振り込め詐欺救済法で、残っていたお金が分配されることがあります（PayPay残高での送金はこの制度の対象になっていません）</li>
</ul>

<h2>正直な見通し</h2>
<p>組織的な詐欺では、全額を取り戻せるケースは多くありません。それでも警察への届出は、相手の逮捕や口座の凍結、被害弁償につながる道です。</p>

<h2>「取り戻します」に注意</h2>
<p>被害にあった人を狙って、「被害金を取り戻せます」「着手金を払えば回収します」と近づく<b>二次被害</b>が起きています。向こうから連絡してくる業者・弁護士を名乗るアカウントには払わないでください。相談は、自分で調べた公的な窓口へ。</p>
""",
        "sources": ["fsa", "pp_notice2", "pp_help"],
    },
    {
        "slug": "kashikin",
        "title": "友だちに貸したお金が返ってこない。PayPayで貸したときの取り戻し方",
        "desc": "PayPayで友人・知人に貸したお金が返ってこない。証拠の残し方、請求の文面、内容証明、少額訴訟・支払督促の費用と流れ、時効までを順番にまとめました。",
        "lead": "PayPayで送った記録と「返す」という約束のやりとりがあれば、<b>請求する権利はしっかりあります</b>。",
        "body": """
<h2>1. 証拠をそろえる</h2>
<ul>
<li>PayPayの取引履歴（日時・金額）</li>
<li>「貸して」「◯日に返す」というやりとり（あげたお金ではなく、貸したお金だと分かる部分）</li>
<li>相手のプロフィール、本名・住所・電話番号が分かるもの</li>
</ul>

<h2>2. 金額と期日をはっきり書いて請求する</h2>
<p>まずはいつもの連絡方法で、「◯円を◯日までに返してほしい」と書いて送ります。これ自体が「請求した」記録になります。脅すような書き方は逆に不利になるので避けます。</p>

<h2>3. 内容証明郵便で請求する</h2>
<p>返事がなければ、郵便局が「いつ、どんな内容を送ったか」を証明してくれる内容証明で請求します。窓口で出す場合、郵便局に残す写しは<b>横書きなら1行20字以内・1枚26行以内</b>などの決まりがあります。料金は、1枚・配達証明付きでおよそ1,420円です（2025年11月時点の日本郵便の料金表から計算した目安）。</p>

<h2>4. 少額訴訟・支払督促</h2>
<ul>
<li><b>少額訴訟</b>：60万円以下。原則1回の審理で判決が出ます。手数料は10万円ごとに1,000円＋郵便切手代</li>
<li><b>支払督促</b>：書類だけで進む手続き。手数料は訴訟の半額。相手が異議を出すと通常の裁判に移ります</li>
<li>どちらも<b>相手の住所</b>が必要です。分からない場合は、弁護士や法テラス（0570-078374）に相談を</li>
</ul>
<p>返済が遅れた分の遅延損害金は、法定利率の<b>年3%</b>で請求できます（2026年4月以降も3%）。</p>

<h2>5. 時効に気をつける</h2>
<p>貸したお金を返してもらう権利は、原則として<b>返済期日から5年</b>で時効になります。内容証明で請求すると、時効の完成を6か月先に延ばせます。</p>

<h2>次から防ぐために</h2>
<p>貸す前に、相手の<b>本名・住所・電話番号</b>を聞き、金額と返済期日に「同意します」と文字で返事をもらっておくと、いざという時に回収しやすくなります。とんずら回収ナビの「貸す前に：借用書をつくる」で文面を作れます。</p>
""",
        "sources": ["post", "court", "moj"],
    },
    {
        "slug": "fusei-riyou",
        "title": "身に覚えのないPayPayの支払い・送金があったら（不正利用・乗っ取り）",
        "desc": "自分では操作していないのにPayPayで支払いや送金がされていた。乗っ取りやスマホの紛失による不正利用のときにやること、補償の条件（60日以内・警察への届出など）をPayPay公式ヘルプをもとにまとめました。",
        "lead": "自分で送ってしまったのか、勝手に使われたのかで、<b>相談する窓口も、補償も変わります</b>。まずどちらかを確かめましょう。",
        "body": """
<h2>まず見分ける</h2>
<ul>
<li><b>自分で「送る」を操作して送った</b>（だまされて送った）：詐欺の報告をします。自分で送った取引は<b>PayPayの補償の対象外</b>です。<a href="torikeshi.html">送金を取り消せるか</a>から確認してください</li>
<li><b>自分は操作していないのに</b>、支払い・送金・チャージがされていた（乗っ取り、スマホの紛失・盗難、偽サイトにログイン情報を入れてしまった など）：<b>不正利用</b>です。条件を満たせば補償の対象になります</li>
</ul>

<h2>不正利用のときにやること</h2>
<ol>
<li><b>スマホをなくした・盗まれた</b>なら、PayPayの紛失・盗難専用窓口 <b>0120-990-633</b>（24時間）に連絡する</li>
<li><b>クレジットカードで支払われていた</b>なら、まずカード会社に連絡する</li>
<li><b>警察に被害を届け出る</b>。補償の申請より<b>先に</b>必要です。届出がないと、PayPayに電話やメールをしても対応してもらえません</li>
<li>損害が出た日から<b>60日以内</b>に、「不正利用被害に伴う補償申請フォーム」から申請する。電話や問い合わせフォームでは受け付けていません</li>
<li>偽サイトや、PayPayを名乗る不審なメール・SMSがきっかけなら、フィッシング通報フォームからも報告する</li>
</ol>
<p>申請フォームは、メールやSMSで届いたリンクからではなく、<b>PayPayアプリや公式ヘルプから自分でたどって</b>開いてください。</p>

<h2>補償の条件</h2>
<ul>
<li>損害が出た日から60日以内に申請すること</li>
<li>警察に被害を届け出ていること</li>
<li>家族や同居人などによる利用ではないこと</li>
<li>初めての申請か、前回の申請から1年を超えていること</li>
<li>そのほか、PayPayの審査条件を満たしていること</li>
</ul>
<p>本人に故意や重大な過失があった場合は、補償されないことがあります。ほかから補償を受けられる場合は、その差額が対象です。審査には、申請から2〜3か月ほどかかります。</p>
<p>申請の前に本人確認を済ませておくと、確認がスムーズになると案内されています。</p>
""",
        "sources": ["pp_hosho", "pp_help", "pp_contact"],
    },
]

TEMPLATE = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}｜とんずら回収ナビ</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{site}og.png">
<meta property="og:site_name" content="とんずら回収ナビ">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="guide.css">
</head>
<body>
<header class="top"><a class="home-link" href="../">とんずら回収ナビ</a></header>
<main class="guide">
<article>
<h1>{title}</h1>
<p class="updated">最終更新：{updated}</p>
<p class="lead">{lead}</p>
{body}
{now_box}
<a class="btn block big" href="../">記録をつけて、取り戻す手順を見る（無料）</a>
<p class="sub center">入力した内容はあなたの端末の中だけに保存されます。</p>

<section class="share-box">
<h2>家族や友だちにも教える</h2>
<div class="share-row">
<a class="btn line" href="https://line.me/R/share?text={share}" target="_blank" rel="noopener">LINEで送る</a>
<button class="btn sub-btn" type="button" data-share="{title}">ほかの方法で共有</button>
</div>
</section>

<section class="related">
<h2>ほかの手口も知っておく</h2>
<ul>{related}</ul>
</section>

<section class="sources">
<h2>参考にした情報</h2>
<ul>{sources}</ul>
<p class="sub">このページは手続きの案内で、法律相談ではありません。具体的な判断は、警察・消費生活センター・弁護士などに相談してください。</p>
<p class="sub">運営：ナノトイラボ（<a href="../about.html">運営者情報・プライバシーポリシー</a>）</p>
</section>
</article>
</main>
<script>
document.querySelectorAll('[data-share]').forEach(function (b) {{
  b.onclick = function () {{
    var d = {{ title: b.dataset.share, url: location.href }};
    if (navigator.share) {{ navigator.share(d).catch(function () {{}}); return; }}
    navigator.clipboard.writeText(d.title + '\\n' + d.url).then(function () {{ b.textContent = 'リンクをコピーしました'; }});
  }};
}});
</script>
</body>
</html>
"""


def now_box(p):
    # 不正利用のページは手順がちがうので、だまされて送ったとき向けの共通手順は出さない
    if p["slug"] == "fusei-riyou":
        return ""
    return f'<section class="now-box">\n<h2>被害にあったら、いますぐやること</h2>\n{NOW}\n</section>'


def build():
    out_dir = ROOT / "guide"
    out_dir.mkdir(exist_ok=True)
    from urllib.parse import quote
    for p in PAGES:
        url = f"{SITE}guide/{p['slug']}.html"
        related = "".join(
            f'<li><a href="{q["slug"]}.html">{escape(q["title"])}</a></li>'
            for q in PAGES if q["slug"] != p["slug"]
        )
        sources = "".join(
            f'<li><a href="{SRC[k][1]}" target="_blank" rel="noopener">{escape(SRC[k][0])}</a></li>'
            for k in p["sources"]
        )
        html = TEMPLATE.format(
            title=escape(p["title"]), desc=escape(p["desc"]), url=url, site=SITE,
            updated=UPDATED, lead=p["lead"], body=p["body"].strip(), now_box=now_box(p),
            share=quote(f"{p['title']}\n{url}"), related=related, sources=sources,
        )
        (out_dir / f"{p['slug']}.html").write_text(html, encoding="utf-8")

    urls = [SITE] + [f"{SITE}guide/{p['slug']}.html" for p in PAGES] + [f"{SITE}about.html"]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sitemap += [f"  <url><loc>{u}</loc><lastmod>{UPDATED_ISO}</lastmod></url>" for u in urls]
    sitemap.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")
    print(f"{len(PAGES)} pages + sitemap.xml + robots.txt")


if __name__ == "__main__":
    build()
