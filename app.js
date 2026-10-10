'use strict';

// ---------- 保存（データは端末内のみ） ----------
const STORE_KEY = 'tonzura-navi-v1';
let state = loadState();

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.cases)) return s;
  } catch (e) { /* 壊れていたら初期化 */ }
  return { cases: [] };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('保存に失敗しました（容量不足の可能性）'); }
}

// 画像は容量が大きいので IndexedDB に置く
const idb = (() => {
  let dbp;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('tonzura-navi', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('images', { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('images', mode);
      const req = fn(t.objectStore('images'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  }
  return {
    put: (rec) => tx('readwrite', s => s.put(rec)),
    get: (id) => tx('readonly', s => s.get(id)),
    del: (id) => tx('readwrite', s => s.delete(id)),
    all: () => tx('readonly', s => s.getAll()),
  };
})();

// ---------- ユーティリティ ----------
const $app = document.getElementById('app');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
const yen = (n) => n ? Number(n).toLocaleString('ja-JP') + '円' : '【金額】';
function jdate(iso) {
  if (!iso) return '【日付】';
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function daysSince(iso) {
  if (!iso) return null;
  return Math.round((new Date(today() + 'T00:00:00') - new Date(iso + 'T00:00:00')) / 86400000);
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('コピーしました'); }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); toast('コピーしました');
  }
}
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const v = (c, k, ph) => (c[k] && String(c[k]).trim()) || `【${ph}】`;

// ---------- 共有（予防のために広める） ----------
const SITE_URL = 'https://toybox-anime.github.io/tonzura-navi/';
const SHARE_TEXT = `PayPayの詐欺、知っておくと防げること
・「PayPayで返金します」と言われて操作すると、逆にお金を送らされる手口がある
・相手が「受け取り待ち」のうちなら、送金は取り消せる
・「被害金を取り戻します」と連絡してくる業者は、二次被害の詐欺
もしもの時にやることのまとめ↓`;
const GUIDES = [
  ['guide/torikeshi.html', 'PayPayの送金は取り消せる？「受け取り待ち」なら間に合う'],
  ['guide/henkin-sagi.html', '「PayPayで返金します」は詐欺の合図'],
  ['guide/ticket-sagi.html', 'チケット・フリマの先払いで相手が消えた'],
  ['guide/toushi-romance.html', '投資・副業・ロマンス詐欺でPayPay送金した'],
  ['guide/kashikin.html', '友だちに貸したお金が返ってこない'],
];
function shareLine() {
  window.open('https://line.me/R/share?text=' + encodeURIComponent(`${SHARE_TEXT}\n${SITE_URL}`), '_blank', 'noopener');
}
async function shareText() {
  if (navigator.share) {
    try { await navigator.share({ title: 'とんずら回収ナビ', text: SHARE_TEXT, url: SITE_URL }); } catch (e) { /* キャンセル */ }
    return;
  }
  copyText(`${SHARE_TEXT}\n${SITE_URL}`);
}
async function shareCard() {
  try {
    const blob = await (await fetch('card.png')).blob();
    const file = new File([blob], 'paypay-sagi-chuui.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: `もしもの時にやることのまとめ\n${SITE_URL}` });
      return;
    }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = 'card.png'; a.download = 'paypay-sagi-chuui.png'; a.click();
  toast('画像を保存しました');
}

// ---------- 被害の種類 ----------
const TYPES = {
  lend: { label: '貸したお金を返してくれない', desc: '友人・知人・SNSで知り合った人などに貸した', short: '貸金' },
  trade: { label: '個人取引で商品が届かない・返金されない', desc: 'チケット譲渡・フリマ・SNSでの売買など', short: '取引トラブル' },
  scam: { label: '投資・副業・ロマンスなどの詐欺', desc: '「必ず儲かる」「手数料が必要」などと言われて送金した', short: '詐欺' },
};

// ---------- 回収手順の組み立て ----------
function buildSteps(c) {
  const amt = Number(c.amount) || 0;
  const noAddr = !c.address;
  const S = {
    evidence: {
      title: '証拠を保存する（最優先）',
      body: `<p>相手はアカウントの削除やブロックをしてきます。<b>消される前に</b>保存してください。</p>
        <ul><li>PayPayの取引履歴画面（日時・金額・取引番号・相手の表示名）</li>
        <li>相手のPayPayプロフィール（表示名・アイコン・PayPay ID）</li>
        <li>LINE・DM・メールのやりとり全部（約束・言い訳・返済期日の部分は特に）</li>
        <li>相手のSNSプロフィール・投稿・URL・電話番号</li></ul>
        <p class="sub">「証拠」タブに画像と出来事を登録すると、警察や裁判所に出すメモが自動で作られます。</p>`,
      tab: 'evidence',
    },
    secondary: {
      title: '「取り戻します」という業者に注意',
      body: `<p>被害者を狙った<b>回収詐欺（二次被害）</b>が多発しています。「着手金を払えば取り戻せる」という業者・SNSアカウント・広告には払わないでください。</p>
        <p class="sub">依頼するなら、弁護士会や法テラスで探した弁護士・司法書士にしてください。</p>`,
    },
    demand: {
      title: '相手に返済を求める',
      body: `<p>まずはやりとりしていた方法で、<b>金額と期日をはっきり書いて</b>請求します。これ自体が「請求した」という証拠になります。</p>
        <p class="sub">脅すような書き方（「晒す」「職場に言う」など）は逆に不利になるので避けます。</p>`,
      doc: 'dunSoft', remind: 3,
    },
    demand2: {
      title: '期限つきで最終の請求をする',
      body: `<p>返事がない・ごまかされるときは、<b>期限と、払わなければ法的手続きに移ること</b>を書いて送ります。</p>`,
      doc: 'dunStrong', remind: 7,
    },
    cancel: {
      title: 'まだ取り消せないか確認する',
      body: `<p>PayPayの取引履歴でその送金を開いてください。<b>「受け取り待ち」</b>になっていれば、取り消して残高を戻せます。</p>
        <ul><li>相手が受け取らないまま4日（96時間）たつと、自動で戻ってきます</li>
        <li>「受け取り完了」になっていたら、取り消しはできません。次の手順へ進みましょう</li></ul>`,
    },
    stop: {
      title: 'これ以上は送らない',
      body: `<p>「返金するには手数料が必要」「税金を払えば引き出せる」「保証金を払えば返す」と言われても、<b>払ったお金は戻ってきません</b>。追加で払うよう言われたら、詐欺だと考えてください。</p>
        <ul><li>「返金の手続きをするのでPayPayを開いて」と言われて操作すると、逆にお金を送らされます</li>
        <li>返事をしない、相手から届いたリンクを開かない、でかまいません</li></ul>`,
    },
    bank: {
      title: '振り込んだ銀行にすぐ連絡する',
      body: `<p>銀行振込でも送っていたら、<b>振込先の銀行</b>（分からなければ自分の銀行）にすぐ電話して「詐欺の被害にあった」と伝えてください。</p>
        <ul><li>相手の口座が凍結されれば、<b>振り込め詐欺救済法</b>で、口座に残っていたお金が被害者に分配されることがあります（全額戻るとは限らず、半年〜1年ほどかかります）</li>
        <li>PayPay残高での送金は、この制度の対象になっていません</li></ul>`,
    },
    paypay: {
      title: 'PayPayに報告する',
      body: `<p>PayPayアプリのヘルプで<b>「詐欺等の疑いがある送る・受け取るを利用した取引を報告したい」</b>を選んで報告します。電話なら <b>0120-990-634</b>（24時間・年中無休）。</p>
        <ul><li>報告すると、相手アカウントの調査や利用停止につながることがあります。同じ相手による次の被害を防ぐことにもなります</li>
        <li>自分で送金した取引は<b>PayPayの補償の対象外</b>で、調査の結果も教えてもらえません。お金はPayPayからではなく、相手から取り戻すことになります</li>
        <li>報告した日時を「証拠」に記録しておきます</li></ul>`,
      doc: 'paypay',
    },
    police: {
      title: '警察に相談・被害届を出す',
      body: `<p><b>#9110（警察相談専用電話）</b>に電話するか、最寄りの警察署に相談します。都道府県警察のサイバー犯罪相談窓口には、ネットからも相談できます。</p>
        <ul><li>警察は、PayPayや銀行への照会や、相手の口座の凍結依頼ができます</li>
        <li>すぐにお金が戻るわけではありません。でも相手が捕まれば、被害弁償を受けられる可能性が出てきます</li>
        <li>「相談メモ」を印刷し、証拠のスクショと一緒に持っていくと話が早いです</li>
        <li>受理された日・担当者名・受理番号を記録しておきます</li></ul>`,
      doc: 'police',
    },
    consumer: {
      title: '消費生活センター（188）に相談する',
      body: `<p><b>188（消費者ホットライン）</b>で近くの消費生活センターにつながります。同じ手口の情報を持っていることがあり、次に何をすべきか一緒に考えてくれます。</p>`,
    },
    identify: {
      title: '相手の住所・本名を調べる',
      body: `<p>内容証明や裁判には、<b>相手の本名と住所</b>が必要です。分からないときは、</p>
        <ul><li>弁護士に頼んで、弁護士会照会でPayPay・携帯会社などに開示を求める</li>
        <li>警察が捜査の中で特定する</li>
        <li>まずは <b>法テラス（0570-078374）</b> で、費用の目安と立替制度について相談する</li></ul>`,
    },
    naiyou: {
      title: '内容証明郵便で請求する',
      body: `<p>「いつ・どんな内容で請求したか」を郵便局が証明してくれる手紙です。相手へのプレッシャーになり、時効を一時的に止める効果もあります。</p>
        <ul><li>費用は1,500円前後（e内容証明ならネットで出せます）</li>
        <li>同じ文書を3通用意（相手・郵便局・自分の控え）</li></ul>`,
      doc: 'naiyou', remind: 14,
    },
    court: {
      title: amt && amt > 600000 ? '支払督促・訴訟を起こす' : '少額訴訟・支払督促を起こす',
      body: courtBody(amt),
      doc: 'sosho',
    },
  };

  const ds = daysSince(firstSent(c));
  const recent = ds === null || ds <= 4 ? ['cancel'] : [];
  const bank = c.bank ? ['bank'] : [];
  let order;
  if (c.type === 'lend') {
    order = [...recent, 'evidence', 'demand', 'demand2', ...(noAddr ? ['identify'] : []), 'naiyou', 'paypay', 'court', 'secondary'];
  } else if (c.type === 'trade') {
    order = [...recent, 'stop', 'evidence', ...bank, 'demand', 'paypay', 'police', 'consumer', ...(noAddr ? ['identify'] : []), 'naiyou', 'court', 'secondary'];
  } else {
    order = [...recent, 'stop', 'evidence', ...bank, 'police', 'paypay', 'consumer', 'secondary', 'identify', 'court'];
  }
  return order.map(k => ({ key: k, ...S[k] }));
}

// 取り戻せる見込みを正直に伝える（期待させすぎず、あきらめさせない）
function outlook(c) {
  const known = c.name && c.address;
  if (c.type === 'lend') return known
    ? '相手の名前と住所が分かっているので、内容証明や少額訴訟で取り戻せる見込みは十分にあります。あせらず、記録を残しながら一歩ずつ進めましょう。'
    : 'お金を貸した記録が残っていれば、請求する権利はしっかりあります。カギになるのは相手の本名と住所です。会話の中に手がかりがないか、探してみてください。';
  if (c.type === 'trade') return known
    ? '相手の名前と住所が分かっていれば、売買のトラブルとして返金を請求できます。'
    : 'SNSの捨てアカウントが相手だと、自力で取り戻すのは簡単ではありません。それでも警察とPayPayに届けておけば、相手の特定や利用停止につながります。同じ相手の被害者が多いほど、警察も動きやすくなります。';
  return '組織的な詐欺の場合、正直に言うと、全額を取り戻せるケースは多くありません。それでも警察への届出は、相手の逮捕、口座の凍結、あなたへの被害弁償につながる唯一の道です。そしていま一番大切なのは、これ以上お金を失わないことです。';
}

function courtBody(amt) {
  const fee = amt ? Math.ceil(amt / 100000) * 1000 : null;
  const big = amt > 600000;
  return `<p>相手の住所が分かれば、<b>弁護士なしでも</b>簡易裁判所で手続きできます。</p>
    <ul>
      ${big ? '' : `<li><b>少額訴訟</b>（60万円以下）：原則1回の審理で判決。手数料の目安 ${fee ? fee.toLocaleString() + '円' : '10万円ごとに1,000円'}＋郵便切手代（数千円・裁判所により異なる）</li>`}
      <li><b>支払督促</b>：書類だけで進む。相手が異議を出さなければ強制執行できるようになる。手数料は訴訟の半額${fee ? `（約${(fee / 2).toLocaleString()}円）` : ''}</li>
      ${big ? '<li>60万円を超える場合は通常訴訟です。弁護士への相談をおすすめします</li>' : ''}
      <li>判決を取っても相手が払わない場合は、給料や口座の差押え（強制執行）に進みます</li>
    </ul>
    <p class="sub">お金を貸した場合の請求権は、原則「返してもらえると知った時から5年」で時効になります。</p>`;
}

// ---------- 文面テンプレート ----------
function timelineText(c) {
  const rows = [];
  (c.transfers || []).forEach(t => rows.push({ date: t.date, text: `PayPayで${yen(t.amount)}を送金${t.txid ? `（取引番号：${t.txid}）` : ''}${t.memo ? '　' + t.memo : ''}` }));
  (c.timeline || []).forEach(t => rows.push({ date: t.date, text: t.text }));
  rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return rows.map(r => `・${jdate(r.date)}　${r.text}`).join('\n') || '・【ここに出来事を時系列で書く】';
}
function totalAmount(c) {
  const sum = (c.transfers || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return sum || Number(c.amount) || 0;
}
function firstSent(c) {
  const ds = (c.transfers || []).map(t => t.date).filter(Boolean).sort();
  return ds[0] || c.sentAt;
}
function reasonText(c) {
  if (c.type === 'lend') return `${jdate(firstSent(c))}に貸したお金`;
  if (c.type === 'trade') return `${jdate(firstSent(c))}に支払った${v(c, 'item', '商品名')}の代金`;
  return `${jdate(firstSent(c))}以降に送金したお金`;
}

const DOCS = {
  family: {
    title: '家族・友人に相談するときのメッセージ',
    note: 'ひとりで抱えこむと、つらさが増えるうえに、焦って二次被害にあいやすくなります。信頼できる人に、短くでいいので伝えてみてください。',
    gen: (c) => `ちょっと相談したいことがあって連絡しました。

実は、${c.type === 'lend' ? '知り合いにお金を貸したのに返してもらえず' : c.type === 'trade' ? '個人で売り買いした相手にお金を払ったのに、商品が届かず' : '詐欺と思われる話にのってしまい'}、PayPayで${yen(totalAmount(c))}を送ったあと、相手と連絡が取れなくなっています。

言い出しにくかったけど、ひとりで考えるのがしんどくなってきました。
警察やPayPayに相談しようと思っているので、話を聞いてもらえると助かります。`,
  },
  dunSoft: {
    title: '請求メッセージ（やわらかめ）',
    gen: (c) => `${v(c, 'name', '相手の名前')}さん

${reasonText(c)}${yen(totalAmount(c))}の件で連絡しました。
${c.type === 'lend' ? `返済の約束は${c.promise ? jdate(c.promise) : '【約束の日】'}でしたが、まだ受け取っていません。` : c.type === 'trade' ? '商品が届かないため、代金の返金をお願いします。' : '約束と違うため、送金したお金の返金をお願いします。'}

${jdate(addDays(today(), 7))}までに、PayPayで${yen(totalAmount(c))}を送ってください。
難しい場合は、いつまでにいくら払えるのか、${jdate(addDays(today(), 3))}までに返事をください。`,
  },
  dunStrong: {
    title: '最終請求メッセージ（期限つき）',
    gen: (c) => `${v(c, 'name', '相手の名前')}さん

${reasonText(c)}${yen(totalAmount(c))}について、これまで何度か請求しましたが、まだ支払いも、きちんとした返事もありません。

${jdate(addDays(today(), 7))}までに${yen(totalAmount(c))}を支払ってください。
期限までに支払いがない場合は、これ以上の連絡はせず、内容証明郵便による請求、警察への相談、裁判所での手続きに移ります。

これまでのやりとり・送金記録はすべて保存してあります。`,
  },
  paypay: {
    title: 'PayPayへの問い合わせ文',
    gen: (c) => `PayPay カスタマーサポート ご担当者様

${c.type === 'lend' ? '個人間で貸したお金が返ってこず、相手と連絡が取れなくなっています。' : '詐欺と思われる被害にあったため報告します。'}
相手アカウントの調査と、必要に応じて利用停止などの対応をお願いします。

■ 相手の情報
・表示名：${v(c, 'paypayName', 'PayPayの表示名')}
・PayPay ID：${v(c, 'paypayId', 'PayPay ID（分かれば）')}
・電話番号：${c.phone || '不明'}
・知り合った経緯：${v(c, 'how', 'SNS名・アプリ名など')}

■ 送金の記録
${(c.transfers || []).length ? c.transfers.map(t => `・${jdate(t.date)}　${yen(t.amount)}${t.txid ? `（取引番号：${t.txid}）` : ''}`).join('\n') : `・${jdate(c.sentAt)}　${yen(c.amount)}`}
合計：${yen(totalAmount(c))}

■ 経緯
${timelineText(c)}

■ そのほか
・警察への相談：${c.policeDone ? '済み' : '予定'}
・スクリーンショットなどの証拠は保存しています。必要であればお送りします。

私の登録電話番号：【あなたの電話番号】`,
  },
  police: {
    title: '警察への相談メモ',
    gen: (c) => `【相談メモ】 作成日：${jdate(today())}

■ 相談者
氏名：【あなたの名前】　連絡先：【電話番号】

■ 被害の内容
種類：${TYPES[c.type].label}
被害額：${yen(totalAmount(c))}（PayPayでの送金）

■ 相手の情報（分かっていること）
・名前（名乗っていた名前）：${c.name || '不明'}
・PayPay 表示名：${c.paypayName || '不明'}
・PayPay ID：${c.paypayId || '不明'}
・電話番号：${c.phone || '不明'}
・住所：${c.address || '不明'}
・知り合った経緯：${c.how || '不明'}
・SNS・連絡手段：${c.contact || '不明'}

■ 相手の説明・約束の内容
${c.story || '【相手に何と言われて送金したか】'}

■ 経緯（時系列）
${timelineText(c)}

■ 証拠として持参するもの
・PayPayの取引履歴のスクリーンショット
・相手とのやりとり（トーク画面）のスクリーンショット
・相手のプロフィール画面のスクリーンショット
${c.images ? `（保存済み画像：${c.images}枚）` : ''}`,
  },
  naiyou: {
    title: '内容証明の文案',
    note: '内容証明は1行20字以内・1枚26行以内などの書式ルールがあります。e内容証明（郵便局のWebサービス）を使うと書式を気にせず出せます。',
    gen: (c) => `　　　　　　　　　請求書

${v(c, 'address', '相手の住所')}
${v(c, 'name', '相手の本名')}　殿

　私は貴殿に対し、${reasonText(c)}として、PayPayにより合計${yen(totalAmount(c))}を送金しました。
${c.type === 'lend'
    ? `　貴殿は${c.promise ? jdate(c.promise) : '【返済期日】'}までに返済すると約束しましたが、現在まで返済されていません。`
    : c.type === 'trade'
      ? '　しかし、現在まで商品は届いておらず、返金もされていません。よって、本書をもって売買契約を解除します。'
      : '　しかし、貴殿の説明は事実と異なるものであり、本書をもって当該契約を取り消します。'}
　つきましては、本書到達後7日以内に、上記${yen(totalAmount(c))}を支払うよう請求します。
　期限内に支払いがない場合は、法的手続きをとることを申し添えます。

${jdate(today())}

【あなたの住所】
【あなたの名前】`,
  },
  sosho: {
    title: '訴状の下書き（請求の趣旨・紛争の要点）',
    note: '裁判所のWebサイトに「少額訴訟」「支払督促」の定型用紙があります。下の文はその「請求の趣旨」「紛争の要点（請求の原因）」欄に書き写す想定の下書きです。',
    gen: (c) => `■ 請求の趣旨
1　被告は、原告に対し、${yen(totalAmount(c))}及びこれに対する${c.type === 'lend' && c.promise ? jdate(addDays(c.promise, 1)) : c.type === 'lend' ? '【返済期日の翌日】' : '訴状送達の日の翌日'}から支払済みまで年3パーセントの割合による金員を支払え。
2　訴訟費用は被告の負担とする。
との判決（仮執行宣言付き）を求める。

■ 紛争の要点（請求の原因）
1　当事者
　原告と被告の関係は次のとおりである。${v(c, 'how', '知り合った経緯（例：SNSで知り合った）')}

2　${c.type === 'lend' ? '金銭の貸付け' : c.type === 'trade' ? '売買契約と代金の支払い' : '金銭の交付'}
${c.type === 'lend'
    ? `　原告は被告に対し、返済期日を${c.promise ? jdate(c.promise) : '【返済期日】'}と定めて、次のとおりPayPayにより金銭を貸し付けた。`
    : c.type === 'trade'
      ? `　原告は被告から${v(c, 'item', '商品名')}を買い受ける契約を結び、次のとおりPayPayにより代金を支払った。`
      : '　原告は被告の説明を信じ、次のとおりPayPayにより金銭を交付した。'}
${(c.transfers || []).length ? c.transfers.map(t => `　・${jdate(t.date)}　${yen(t.amount)}`).join('\n') : `　・${jdate(c.sentAt)}　${yen(c.amount)}`}

3　その後の経緯
${timelineText(c).split('\n').map(s => '　' + s).join('\n')}

4　よって、原告は被告に対し、${yen(totalAmount(c))}${c.type === 'lend' ? 'の返還' : c.type === 'trade' ? '（契約解除による原状回復）の支払い' : 'の返還'}を求める。

■ 証拠
甲1号証　PayPay取引履歴（スクリーンショット）
甲2号証　原告と被告のやりとり（スクリーンショット）
${c.naiyouDone ? '甲3号証　内容証明郵便及び配達証明書' : ''}`,
  },
  shoko: {
    title: '証拠説明書（証拠の一覧表）',
    note: '裁判所に証拠を出すときに、証拠と一緒に出す一覧表です。「証拠」タブで画像ごとに種類を選んでおくと、内容が自動で入ります。印刷したスクショの右上に「甲第1号証」などと書き込んでください。',
    gen: (c, imgs = []) => {
      const items = imgs.length
        ? imgs.map(i => ({ kind: i.kind || 'other', date: ymd(new Date(i.date)), memo: i.memo }))
        : [{ kind: 'pay', date: firstSent(c) }, { kind: 'talk', date: '' }];
      if (c.naiyouDone) items.push({ kind: 'naiyou', date: c.done && c.done.naiyou });
      return `証拠説明書

${jdate(today())}

原告　【あなたの名前】
被告　${v(c, 'name', '相手の名前')}

${items.map((it, n) => {
  const k = EVIDENCE_KINDS[it.kind] || EVIDENCE_KINDS.other;
  return `■ 甲第${n + 1}号証
　標目：${k.label}${it.memo ? `（${it.memo}）` : ''}
　原本・写しの別：${k.copy}
　作成日：${it.date ? jdate(it.date) : '【日付】'}
　作成者：${k.author}
　立証趣旨：${k.purpose(c)}`;
}).join('\n\n')}`;
    },
  },
};

const EVIDENCE_KINDS = {
  pay: {
    label: 'PayPay取引履歴の画面（スクリーンショット）', short: 'PayPay取引履歴', copy: '写し', author: '原告（撮影）',
    purpose: (c) => `原告が被告に対し、PayPayで${yen(totalAmount(c))}を送金した事実`,
  },
  talk: {
    label: '原告と被告のやりとりの画面（スクリーンショット）', short: 'やりとり（トーク・DM）', copy: '写し', author: '原告（撮影）',
    purpose: (c) => c.type === 'lend' ? '被告が金銭を借り受け、返済を約束した事実、及びその後の経緯'
      : c.type === 'trade' ? '原告と被告の売買の合意内容、及び商品が届かない経緯'
        : '被告の説明の内容、及び原告が送金するに至った経緯',
  },
  profile: {
    label: '被告のプロフィール画面（スクリーンショット）', short: '相手のプロフィール', copy: '写し', author: '原告（撮影）',
    purpose: () => '被告を特定する情報（表示名・ID等）',
  },
  naiyou: {
    label: '内容証明郵便及び配達証明書', short: '内容証明', copy: '写し', author: '原告',
    purpose: () => '原告が被告に支払いを請求し、その請求が被告に届いた事実',
  },
  other: {
    label: 'スクリーンショット', short: 'その他', copy: '写し', author: '原告（撮影）',
    purpose: () => '【この証拠で示したいこと】',
  },
};

// ---------- 予防：借用書 ----------
function loanDocText(f) {
  return `　　　　　　　　借用書

${f.lender || '【貸す人の名前】'} 様

私は、本日、あなたから下記のとおり金銭を借り受けました。

一、金額：${f.amount ? Number(f.amount).toLocaleString() + '円' : '【金額】'}
一、受け取り方法：PayPay送金
一、返済期日：${f.due ? jdate(f.due) : '【返済期日】'}
一、返済方法：${f.method || 'PayPay送金で一括返済'}
一、期日までに返済しない場合、期日の翌日から支払い済みまで年3%の遅延損害金を支払います。

${jdate(f.date || today())}

借りた人
　住所：${f.addr || '【借りる人の住所】'}
　氏名：${f.borrower || '【借りる人の名前】'}
　電話：${f.tel || '【借りる人の電話番号】'}`;
}
function loanAgreeMsg(f) {
  return `確認のため、送金の前にこの内容に「同意します」と返信してください。

${f.amount ? Number(f.amount).toLocaleString() + '円' : '【金額】'}をPayPayで貸します。
返済期日：${f.due ? jdate(f.due) : '【返済期日】'}
返済方法：${f.method || 'PayPay送金で一括返済'}

あわせて、本名・住所・電話番号も教えてください（借用書に書きます）。`;
}

// ---------- 画面 ----------
let route = { name: 'home' };
let draft = null;
function go(r) { route = r; render(); window.scrollTo(0, 0); }
const backBtn = document.getElementById('backBtn');
backBtn.onclick = () => {
  if (['case', 'new', 'loan', 'contacts', 'sos', 'check'].includes(route.name)) go({ name: 'home' });
  else if (route.name === 'edit') go({ name: 'case', id: route.id, tab: 'info' });
};
const getCase = (id) => state.cases.find(c => c.id === id);

function render() {
  // 静的リンクはJSなし・検索エンジン向け。アプリ内ではホームのカードに同じリンクがある
  document.querySelector('.guides-static')?.classList.add('hidden');
  backBtn.hidden = route.name === 'home';
  const title = document.getElementById('pageTitle');
  if (route.name === 'home') { title.textContent = 'とんずら回収ナビ'; renderHome(); }
  else if (route.name === 'new' || route.name === 'edit') { title.textContent = route.name === 'new' ? '状況を入力' : '情報を編集'; renderForm(); }
  else if (route.name === 'case') { const c = getCase(route.id); if (!c) return go({ name: 'home' }); title.textContent = caseTitle(c); renderCase(c); }
  else if (route.name === 'loan') { title.textContent = '貸す前に：借用書'; renderLoan(); }
  else if (route.name === 'contacts') { title.textContent = '相談先'; renderContacts(); }
  else if (route.name === 'sos') { title.textContent = 'いますぐやること'; renderSos(); }
  else if (route.name === 'check') { title.textContent = 'これって詐欺？チェック'; renderCheck(); }
}

// ---------- 文字サイズ ----------
const fontBtn = document.getElementById('fontBtn');
function applyFont() {
  document.documentElement.classList.toggle('big', !!state.big);
  fontBtn.textContent = state.big ? '文字 小' : '文字 大';
}
fontBtn.onclick = () => { state.big = !state.big; save(); applyFont(); };
applyFont();

function heartCard() {
  return `<div class="card heart">
    <h3>気持ちがつらいときは</h3>
    <p class="sub">お金をだまし取られると、怒りや恥ずかしさ、眠れないほどの不安が続くことがあります。それは自然な反応です。話を聞いてもらうだけでも、少し楽になります。</p>
    <div class="contact"><span>よりそいホットライン<br><span class="sub">24時間・無料・匿名でOK</span></span><a href="tel:0120279338">0120-279-338</a></div>
  </div>`;
}

function renderSos() {
  const items = [
    ['まだ取り消せないか確認', 'PayPayの取引履歴でその送金を開いて、<b>「受け取り待ち」</b>なら取り消せます。「受け取り完了」なら次へ。'],
    ['これ以上は送らない', '「返金のために手数料が必要」「PayPayを開いて操作して」は、さらに送らせるための手口です。<b>相手の指示にはもう従わないでください。</b>'],
    ['証拠をスクショ', '取引履歴、相手のプロフィール、トーク画面を<b>消される前に</b>スクショ。ブロックされても、手元の画面は残ります。'],
    ['警察とPayPayに相談', '<b>#9110</b>（警察の相談電話）と、PayPay（ヘルプの「詐欺等の疑いがある…取引を報告したい」、電話 0120-990-634・24時間）。'],
    ['銀行振込もしたなら銀行へ', '振込先の銀行に電話すると、相手の口座を止めてもらえることがあります。'],
  ];
  $app.innerHTML = `
    <div class="alert green"><b>まず、ゆっくり息をはいてください。</b><br>
      だまされたのは、あなたが悪いからではありません。手口は、だますことを仕事にしている人たちが何度も練り直したものです。誰でも引っかかります。<br>
      いまは、上から順番にやっていけば大丈夫です。</div>
    ${items.map(([t, b], i) => `
      <label class="card step sos-item">
        <input type="checkbox" class="sos-check">
        <div class="num">${i + 1}</div>
        <div class="body"><h3>${t}</h3><p>${b}</p></div>
      </label>`).join('')}
    <div class="row" style="margin:8px 0 16px">
      <a class="btn sub-btn" href="tel:%239110">#9110 に電話</a>
      <a class="btn sub-btn" href="tel:0120990634">PayPayに電話</a>
    </div>
    <div class="alert yellow">「被害金を取り戻します」と<b>向こうから</b>連絡してくる業者・弁護士を名乗るアカウントは、回収詐欺（二次被害）の可能性が高いです。相談先は自分で調べた公的な窓口にしてください。</div>
    <p>少し落ち着いたら、記録をつけましょう。日付や金額を入れておくと、警察やPayPayに出す文章が自動でできあがります。</p>
    <button class="btn block" id="toNew">記録をつけて、次の手順を見る</button>
    ${heartCard()}`;
  $app.querySelectorAll('.sos-check').forEach(cb => cb.onchange = () => cb.closest('.step').classList.toggle('done', cb.checked));
  $app.querySelector('#toNew').onclick = () => { draft = { type: 'scam', sentAt: today() }; go({ name: 'new' }); };
}

// 金融庁・警察・国民生活センターなどの注意喚起でよく挙がる特徴
const RED_FLAGS = [
  ['SNSやマッチングアプリで知り合って、一度も会ったことがない', 1],
  ['「必ず儲かる」「元本保証」「あなただけ特別」と言われた', 2],
  ['お金を引き出す・返してもらうために「手数料」「税金」「保証金」を払うよう言われた', 3],
  ['「返金するのでPayPayを開いて」と言われ、言われた数字を入力した', 3],
  ['「今日中に」「あと30分で」などと、急がされた', 1],
  ['LINEや別のアプリに移るよう言われた', 1],
  ['「家族や友だちには言わないで」と言われた', 2],
  ['チケットや人気商品を、先払いで売ってくれると言われた', 1],
  ['相手の本名や住所を聞いても、はぐらかされる', 1],
];
function renderCheck() {
  $app.innerHTML = `
    <p>当てはまるものにチェックしてください。</p>
    ${RED_FLAGS.map(([t], i) => `<label class="radio-card"><input type="checkbox" data-i="${i}"><span>${t}</span></label>`).join('')}
    <div id="checkResult"></div>`;
  const out = $app.querySelector('#checkResult');
  const update = () => {
    const checked = [...$app.querySelectorAll('input[data-i]:checked')].map(x => RED_FLAGS[x.dataset.i][1]);
    const score = checked.reduce((a, b) => a + b, 0);
    if (!checked.length) { out.innerHTML = ''; return; }
    if (score >= 3) {
      out.innerHTML = `<div class="alert red"><b>詐欺の可能性がとても高いです。</b><br>これ以上お金を送らないでください。相手とのやりとりはいったん止めて、証拠を保存しましょう。<br>
        迷ったら <b>188</b>（消費者ホットライン）か <b>#9110</b>（警察相談）へ。</div>
        <button class="btn block" id="toSos">いますぐやることを見る</button>`;
      out.querySelector('#toSos').onclick = () => go({ name: 'sos' });
    } else {
      out.innerHTML = `<div class="alert yellow"><b>注意が必要です。</b><br>詐欺の入り口でよく見られる特徴があります。お金を送る前に、家族や <b>188</b>（消費者ホットライン）に一度相談してみてください。</div>`;
    }
  };
  $app.querySelectorAll('input[data-i]').forEach(x => x.onchange = update);
}
const caseTitle = (c) => `${c.name || c.paypayName || '相手不明'}（${TYPES[c.type].short}）`;

function progressOf(c) {
  const steps = buildSteps(c);
  const done = steps.filter(s => c.done && c.done[s.key]).length;
  return { done, total: steps.length, next: steps.find(s => !(c.done && c.done[s.key])) };
}

function renderHome() {
  const cases = state.cases.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  $app.innerHTML = `
    <div class="hero">
      <p class="hero-lead">お金を送って、相手と連絡が取れなくなった方へ</p>
      <p>ここに来てくれてよかったです。<b>悪いのはあなたではなく、だました相手</b>です。いまからでも、できることはあります。順番に一緒に進めましょう。</p>
    </div>
    <button class="btn block big" id="sosBtn">いま被害にあった・どうしよう</button>
    <button class="btn sub-btn block" id="checkBtn">これって詐欺？ 5秒チェック</button>
    <button class="btn sub-btn block" id="newBtn">＋ 記録をつけて、取り戻す手順を進める</button>

    ${cases.length ? '<h2>あなたの記録</h2>' : ''}
    ${cases.map(c => {
      const p = progressOf(c);
      const due = c.remindAt && c.remindAt <= today();
      return `<div class="card click" data-id="${c.id}">
        <h3>${esc(caseTitle(c))}${due ? '<span class="badge warn">確認日</span>' : ''}${p.done === p.total ? '<span class="badge ok">完了</span>' : ''}</h3>
        <p class="sub">${yen(totalAmount(c))}・${c.sentAt ? jdate(firstSent(c)) + '送金' : ''}</p>
        <div class="progress"><div style="width:${p.done / p.total * 100}%"></div></div>
        <p class="sub">${p.next ? '次：' + esc(p.next.title) : 'すべての手順を完了しました'}</p>
      </div>`;
    }).join('')}

    <h2>知っておくと防げること</h2>
    <div class="card prevent">
      <p class="sub">よくある手口を、図とことばでまとめました。被害にあう前に、家族や友だちにも教えてあげてください。</p>
      <ul style="padding-left:18px;margin:6px 0">
        ${GUIDES.map(([href, t]) => `<li><a href="${href}">${t}</a></li>`).join('')}
      </ul>
      <div class="share-row">
        <button class="btn line" id="lineShare">LINEで送る</button>
        <button class="btn sub-btn" id="cardShare">注意カード画像</button>
        <button class="btn sub-btn" id="textShare">ほかの方法で共有</button>
      </div>
    </div>

    <h2>ほかの機能</h2>
    <div class="card click" id="loanBtn"><h3>貸す前に：借用書をつくる</h3><p class="sub">送金前に相手の同意と本名・住所をもらっておくと、いざという時に回収しやすくなります。</p></div>
    <div class="card click" id="contactBtn"><h3>相談先の一覧</h3><p class="sub">警察・消費生活センター・法テラスなど</p></div>

    <h2>バックアップ</h2>
    <p class="sub">データはこの端末のブラウザの中だけに保存されます（どこにも送信しません）。機種変更の前は書き出してください。</p>
    <div class="row">
      <button class="btn sub-btn small" id="exportBtn">書き出す（JSON）</button>
      <label class="btn sub-btn small" style="margin:0">読み込む<input type="file" id="importFile" accept="application/json" hidden></label>
    </div>
    ${heartCard()}
    <footer class="note">このアプリは手続きの案内と文書の下書きを作るツールで、法律相談ではありません。具体的な判断は弁護士・司法書士・警察などに相談してください。内容は2026年10月時点のPayPay公式ヘルプなどをもとにしています。</footer>`;

  $app.querySelector('#lineShare').onclick = shareLine;
  $app.querySelector('#cardShare').onclick = shareCard;
  $app.querySelector('#textShare').onclick = shareText;
  $app.querySelector('#sosBtn').onclick = () => go({ name: 'sos' });
  $app.querySelector('#checkBtn').onclick = () => go({ name: 'check' });
  $app.querySelector('#newBtn').onclick = () => { draft = { type: 'lend', sentAt: today() }; go({ name: 'new' }); };
  $app.querySelectorAll('.card[data-id]').forEach(el => el.onclick = () => go({ name: 'case', id: el.dataset.id, tab: 'steps' }));
  $app.querySelector('#loanBtn').onclick = () => go({ name: 'loan' });
  $app.querySelector('#contactBtn').onclick = () => go({ name: 'contacts' });
  $app.querySelector('#exportBtn').onclick = exportAll;
  $app.querySelector('#importFile').onchange = importAll;
}

const FIELDS = [
  ['amount', '送金した金額（円）', 'number', '例：30000'],
  ['sentAt', '送金した日', 'date'],
  ['bank', 'PayPayのほかに、銀行振込でも送った', 'check'],
  ['promise', '返す・届けると約束した日（あれば）', 'date'],
  ['item', '買った商品（個人取引の場合）', 'text', '例：ライブチケット2枚'],
  ['name', '相手の名前（名乗っていた名前）', 'text', '例：山田太郎'],
  ['paypayName', 'PayPayの表示名', 'text'],
  ['paypayId', 'PayPay ID（分かれば）', 'text'],
  ['phone', '相手の電話番号（分かれば）', 'tel'],
  ['address', '相手の住所（分かれば）', 'text'],
  ['how', '知り合った経緯', 'text', '例：Xで知り合った／職場の元同僚'],
  ['contact', '連絡手段', 'text', '例：LINE（ID: xxxx）'],
  ['story', '相手に何と言われて送金したか', 'textarea', '例：「給料日に必ず返す」と言われた'],
];

function renderForm() {
  const isNew = route.name === 'new';
  const c = isNew ? draft : { ...getCase(route.id) };
  $app.innerHTML = `
    <label>どんな被害ですか？</label>
    ${Object.entries(TYPES).map(([k, t]) => `
      <label class="radio-card"><input type="radio" name="type" value="${k}" ${c.type === k ? 'checked' : ''}>
        <span>${t.label}<br><span class="sub">${t.desc}</span></span></label>`).join('')}
    <p class="sub">分からない項目は空欄のままで大丈夫です。あとから追加できます。</p>
    ${FIELDS.map(([k, label, type, ph]) => type === 'check'
      ? `<label class="radio-card" style="margin-top:12px"><input type="checkbox" id="f_${k}" ${c[k] ? 'checked' : ''}><span>${label}</span></label>`
      : `
      <label for="f_${k}">${label}</label>
      ${type === 'textarea'
        ? `<textarea id="f_${k}" placeholder="${esc(ph || '')}">${esc(c[k] || '')}</textarea>`
        : `<input id="f_${k}" type="${type}" value="${esc(c[k] || '')}" placeholder="${esc(ph || '')}" ${type === 'number' ? 'inputmode="numeric" min="0"' : ''}>`}`).join('')}
    <button class="btn block" id="saveBtn" style="margin-top:20px">${isNew ? '回収の手順を見る' : '保存する'}</button>
    ${isNew ? '' : '<button class="btn sub-btn block" id="delBtn">この被害の記録を削除する</button>'}`;

  $app.querySelector('#saveBtn').onclick = () => {
    const data = { type: $app.querySelector('input[name=type]:checked').value };
    FIELDS.forEach(([k, , type]) => {
      const el = $app.querySelector('#f_' + k);
      data[k] = type === 'check' ? el.checked : el.value.trim();
    });
    if (isNew) {
      const nc = { id: uid(), createdAt: today(), updatedAt: new Date().toISOString(), done: {}, transfers: [], timeline: [], images: 0, ...data };
      if (nc.amount) nc.transfers.push({ id: uid(), date: nc.sentAt, amount: nc.amount, txid: '', memo: '' });
      state.cases.push(nc);
      save(); go({ name: 'case', id: nc.id, tab: 'steps' });
    } else {
      Object.assign(getCase(route.id), data, { updatedAt: new Date().toISOString() });
      save(); go({ name: 'case', id: route.id, tab: 'info' });
    }
  };
  const del = $app.querySelector('#delBtn');
  if (del) del.onclick = async () => {
    if (!confirm('この被害の記録と画像をすべて削除します。元に戻せません。よろしいですか？')) return;
    const imgs = (await idb.all()).filter(i => i.caseId === route.id);
    for (const i of imgs) await idb.del(i.id);
    state.cases = state.cases.filter(x => x.id !== route.id);
    save(); go({ name: 'home' });
  };
}

function renderCase(c) {
  const tab = route.tab || 'steps';
  const tabs = [['steps', '手順'], ['evidence', '証拠'], ['docs', '文書'], ['info', '情報']];
  $app.innerHTML = `
    <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div id="pane"></div>`;
  $app.querySelectorAll('.tab').forEach(b => b.onclick = () => { route.tab = b.dataset.tab; render(); });
  const pane = $app.querySelector('#pane');
  ({ steps: paneSteps, evidence: paneEvidence, docs: paneDocs, info: paneInfo })[tab](c, pane);
}

function touch(c) { c.updatedAt = new Date().toISOString(); save(); }

function paneSteps(c, pane) {
  const steps = buildSteps(c);
  const p = progressOf(c);
  const ds = daysSince(firstSent(c));
  pane.innerHTML = `
    <div class="card">
      <p><b>${yen(totalAmount(c))}</b>・${TYPES[c.type].label}</p>
      ${ds !== null ? `<p class="sub">送金から${ds}日経過</p>` : ''}
      <div class="progress"><div style="width:${p.done / p.total * 100}%"></div></div>
      <p class="sub">${p.done} / ${p.total} 完了</p>
      ${c.remindAt ? `<p class="sub">次の確認日：${jdate(c.remindAt)}${c.remindAt <= today() ? ' <span class="badge warn">今日以前</span>' : ''}</p>` : ''}
    </div>
    <div class="alert green"><b>これからの見通し</b><br>${outlook(c)}</div>
    ${c.type === 'scam' ? '<div class="alert yellow">詐欺の場合は、相手に連絡して刺激するより<b>警察への相談とPayPayへの報告を急いで</b>ください。相手の口座やアカウントにお金が残っているうちが勝負です。</div>' : ''}
    ${steps.map((s, i) => {
      const done = c.done && c.done[s.key];
      return `<div class="card step ${done ? 'done' : ''}">
        <div class="num">${done ? '✓' : i + 1}</div>
        <div class="body">
          <h3>${esc(s.title)}</h3>
          ${done ? `<p class="sub">${jdate(done)} 完了</p>` : s.body}
          <div class="row no-print" style="margin-top:8px">
            <button class="btn small ${done ? 'sub-btn' : ''}" data-done="${s.key}">${done ? '未完了に戻す' : '完了にする'}</button>
            ${s.doc && !done ? `<button class="btn sub-btn small" data-doc="${s.doc}">文面をつくる</button>` : ''}
            ${s.tab && !done ? `<button class="btn sub-btn small" data-tab2="${s.tab}">証拠を登録</button>` : ''}
          </div>
        </div></div>`;
    }).join('')}`;

  pane.querySelectorAll('[data-done]').forEach(b => b.onclick = () => {
    c.done = c.done || {};
    const k = b.dataset.done;
    const step = steps.find(s => s.key === k);
    if (c.done[k]) delete c.done[k];
    else {
      c.done[k] = today();
      c.timeline = c.timeline || [];
      c.timeline.push({ id: uid(), date: today(), text: `【手順】${step.title}` });
      if (k === 'police') c.policeDone = true;
      if (k === 'naiyou') c.naiyouDone = true;
      if (step.remind) {
        c.remindAt = addDays(today(), step.remind);
        if (confirm(`${step.remind}日後（${jdate(c.remindAt)}）に相手の反応を確認しましょう。\nカレンダーに予定を追加しますか？`)) icsReminder(c, step);
      }
    }
    touch(c); render();
  });
  pane.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => { route.tab = 'docs'; route.doc = b.dataset.doc; render(); });
  pane.querySelectorAll('[data-tab2]').forEach(b => b.onclick = () => { route.tab = b.dataset.tab2; render(); });
}

function icsReminder(c, step) {
  const d = c.remindAt.replace(/-/g, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//tonzura-navi//JA', 'BEGIN:VEVENT',
    `UID:${uid()}@tonzura-navi`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(c.remindAt, 1).replace(/-/g, '')}`,
    `SUMMARY:回収：${caseTitle(c)} の反応を確認`,
    `DESCRIPTION:「${step.title}」から${step.remind}日。返事・入金がなければ次の手順へ。`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download('reminder.ics', ics, 'text/calendar');
}

async function paneEvidence(c, pane) {
  c.transfers = c.transfers || []; c.timeline = c.timeline || [];
  const imgs = (await idb.all()).filter(i => i.caseId === c.id).sort((a, b) => a.date.localeCompare(b.date));
  pane.innerHTML = `
    <h2>送金の記録</h2>
    <p class="sub">PayPayの取引履歴を開くと、取引ごとに日時・金額・取引番号が表示されます。</p>
    <ul class="tl">${c.transfers.map(t => `<li><span class="d">${t.date ? jdate(t.date).replace(/^\d+年/, '') : '日付なし'}</span>
      <span class="t"><b>${yen(t.amount)}</b>${t.txid ? `<br><span class="sub">取引番号 ${esc(t.txid)}</span>` : ''}${t.memo ? `<br><span class="sub">${esc(t.memo)}</span>` : ''}</span>
      <button class="del" data-deltr="${t.id}" aria-label="削除">✕</button></li>`).join('') || '<li class="sub">まだありません</li>'}</ul>
    <div class="card">
      <div class="row"><input type="date" id="trDate" value="${today()}" style="flex:1"><input type="number" id="trAmt" placeholder="金額" inputmode="numeric" style="flex:1"></div>
      <input id="trTx" placeholder="取引番号（任意）" style="margin-top:8px">
      <input id="trMemo" placeholder="メモ（任意）例：「家賃が足りない」と言われて" style="margin-top:8px">
      <button class="btn small" id="trAdd" style="margin-top:8px">送金を追加</button>
    </div>
    <p class="sub">合計：<b>${yen(totalAmount(c))}</b></p>

    <h2>スクリーンショット（${imgs.length}枚）</h2>
    <p class="sub">取引履歴・トーク・相手のプロフィールなど。画像はこの端末内だけに保存されます。</p>
    <div class="thumbs" id="thumbs"></div>
    <div class="row" style="margin-top:8px">
      <select id="imgKind" style="flex:1" aria-label="追加する画像の種類">${['pay', 'talk', 'profile', 'other'].map(k => `<option value="${k}">${EVIDENCE_KINDS[k].short}</option>`).join('')}</select>
      <label class="btn sub-btn" style="margin:0">＋ 画像を追加<input type="file" id="imgIn" accept="image/*" multiple hidden></label>
    </div>
    ${imgs.length ? '<button class="btn sub-btn small" id="imgDl">画像をまとめて保存（提出用）</button>' : ''}

    <h2>出来事の記録（時系列）</h2>
    <p class="sub">「◯日に返すと言われた」「既読無視された」「ブロックされた」など。警察・裁判所向けの文書に自動で入ります。</p>
    <ul class="tl">${c.timeline.slice().sort((a, b) => a.date.localeCompare(b.date)).map(t => `<li><span class="d">${jdate(t.date).replace(/^\d+年/, '')}</span><span class="t">${esc(t.text)}</span><button class="del" data-deltl="${t.id}" aria-label="削除">✕</button></li>`).join('') || '<li class="sub">まだありません</li>'}</ul>
    <div class="card">
      <input type="date" id="tlDate" value="${today()}">
      <textarea id="tlText" placeholder="例：LINEで「来週返す」と言われた" style="margin-top:8px;min-height:60px"></textarea>
      <div class="row" style="margin-top:6px">${['返すと約束された', '既読無視された', 'ブロックされた', 'アカウントが消えた', '一部返済された'].map(q => `<button class="btn sub-btn small" data-q="${q}">${q}</button>`).join('')}</div>
      <button class="btn small" id="tlAdd" style="margin-top:8px">出来事を追加</button>
    </div>`;

  const thumbs = pane.querySelector('#thumbs');
  imgs.forEach(i => {
    const url = URL.createObjectURL(i.blob);
    const fig = document.createElement('figure');
    fig.innerHTML = `<img src="${url}" alt="${esc(i.name)}"><button class="del" aria-label="削除">✕</button>
      <select class="kind" aria-label="画像の種類">${['pay', 'talk', 'profile', 'other'].map(k => `<option value="${k}" ${(i.kind || 'other') === k ? 'selected' : ''}>${EVIDENCE_KINDS[k].short}</option>`).join('')}</select>`;
    fig.querySelector('.kind').onchange = async (e) => { i.kind = e.target.value; await idb.put(i); toast('種類を変更しました'); };
    fig.querySelector('img').onclick = () => {
      const vw = document.createElement('div');
      vw.className = 'viewer'; vw.innerHTML = `<img src="${url}" alt="">`;
      vw.onclick = () => vw.remove(); document.body.appendChild(vw);
    };
    fig.querySelector('.del').onclick = async () => {
      if (!confirm('この画像を削除しますか？')) return;
      await idb.del(i.id); c.images = Math.max(0, (c.images || 1) - 1); touch(c); render();
    };
    thumbs.appendChild(fig);
  });

  pane.querySelector('#trAdd').onclick = () => {
    const amount = pane.querySelector('#trAmt').value;
    if (!amount) return toast('金額を入力してください');
    c.transfers.push({ id: uid(), date: pane.querySelector('#trDate').value, amount, txid: pane.querySelector('#trTx').value.trim(), memo: pane.querySelector('#trMemo').value.trim() });
    touch(c); render();
  };
  pane.querySelectorAll('[data-deltr]').forEach(b => b.onclick = () => { c.transfers = c.transfers.filter(t => t.id !== b.dataset.deltr); touch(c); render(); });
  pane.querySelectorAll('[data-deltl]').forEach(b => b.onclick = () => { c.timeline = c.timeline.filter(t => t.id !== b.dataset.deltl); touch(c); render(); });
  pane.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { pane.querySelector('#tlText').value = b.dataset.q; });
  pane.querySelector('#tlAdd').onclick = () => {
    const text = pane.querySelector('#tlText').value.trim();
    if (!text) return toast('内容を入力してください');
    c.timeline.push({ id: uid(), date: pane.querySelector('#tlDate').value, text });
    touch(c); render();
  };
  pane.querySelector('#imgIn').onchange = async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      const d = f.lastModified ? new Date(f.lastModified).toISOString() : new Date().toISOString();
      await idb.put({ id: uid(), caseId: c.id, name: f.name, date: d, blob: f, kind: pane.querySelector('#imgKind').value });
    }
    c.images = (c.images || 0) + files.length;
    touch(c); toast(`${files.length}枚保存しました`); render();
  };
  const dl = pane.querySelector('#imgDl');
  if (dl) dl.onclick = () => imgs.forEach((i, n) => setTimeout(() => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(i.blob);
    a.download = `証拠${String(n + 1).padStart(2, '0')}_${i.name}`; a.click();
  }, n * 300));
}

// あなた自身の情報で【 】を埋める
function fillMe(text) {
  const me = state.me || {};
  const map = { '【あなたの名前】': me.name, '【あなたの住所】': me.address, '【あなたの電話番号】': me.tel, '【電話番号】': me.tel };
  return Object.entries(map).reduce((t, [k, val]) => val ? t.split(k).join(val) : t, text);
}

async function paneDocs(c, pane) {
  const keys = c.type === 'scam'
    ? ['police', 'paypay', 'family', 'naiyou', 'sosho', 'shoko']
    : ['dunSoft', 'dunStrong', 'paypay', 'police', 'naiyou', 'sosho', 'shoko', 'family'];
  const sel = keys.includes(route.doc) ? route.doc : keys[0];
  const d = DOCS[sel];
  const imgs = sel === 'shoko' ? (await idb.all()).filter(i => i.caseId === c.id).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const text = fillMe(d.gen(c, imgs));
  const me = state.me || {};
  const isNaiyou = sel === 'naiyou';
  pane.innerHTML = `
    <select id="docSel" class="no-print">${keys.map(k => `<option value="${k}" ${k === sel ? 'selected' : ''}>${DOCS[k].title}</option>`).join('')}</select>
    ${d.note ? `<div class="alert yellow no-print">${d.note}</div>` : ''}
    <details class="card no-print" ${me.name ? '' : 'open'}>
      <summary><b>あなたの情報</b> <span class="sub">（入れると文書に自動で入ります・この端末だけに保存）</span></summary>
      <label for="me_name">名前</label><input id="me_name" value="${esc(me.name || '')}">
      <label for="me_address">住所</label><input id="me_address" value="${esc(me.address || '')}">
      <label for="me_tel">電話番号</label><input id="me_tel" type="tel" value="${esc(me.tel || '')}">
      <button class="btn small" id="meSave" style="margin-top:10px">保存して文書に反映</button>
    </details>
    ${/【/.test(text) ? '<div class="alert red no-print">【 】の部分は書き換えてください。「情報」タブで入力すると自動で埋まります。</div>' : ''}
    ${isNaiyou ? `<div class="card no-print">
      <h3>郵便局の窓口で出すとき</h3>
      <p class="sub">郵便局に保管される写し（謄本）は「1行20字以内・1枚26行以内」などの決まりがあります。ボタンを押すと、この形に自動で整えます（行頭に「、」「。」が来ないようにします）。</p>
      <button class="btn small" id="fmtBtn">1行20字・26行に整える</button>
      <div id="fmtInfo"></div>
    </div>` : ''}
    <textarea id="docText" style="min-height:420px;font-size:14px">${esc(text)}</textarea>
    <div class="row no-print" style="margin-top:8px">
      <button class="btn" id="copyBtn">コピー</button>
      <button class="btn sub-btn" id="printBtn">印刷・PDF保存</button>
      <button class="btn sub-btn" id="txtBtn">テキスト保存</button>
    </div>
    <p class="sub no-print">PDFにするには、印刷画面でプリンターを「PDFに保存」にしてください。</p>`;
  pane.querySelector('#docSel').onchange = (e) => { route.doc = e.target.value; render(); };
  pane.querySelector('#meSave').onclick = () => {
    state.me = { name: pane.querySelector('#me_name').value.trim(), address: pane.querySelector('#me_address').value.trim(), tel: pane.querySelector('#me_tel').value.trim() };
    save(); toast('保存しました'); render();
  };
  const ta = pane.querySelector('#docText');
  const getText = () => ta.value;
  let formatted = false;
  if (isNaiyou) pane.querySelector('#fmtBtn').onclick = () => {
    const lines = formatNaiyou(getText());
    ta.value = lines.join('\n');
    formatted = true;
    const pages = Math.max(1, Math.ceil(lines.length / 26));
    const f = naiyouFee(pages);
    const latin = /[Ａ-Ｚａ-ｚ]/.test(ta.value.replace(/ＰａｙＰａｙ/g, ''));
    pane.querySelector('#fmtInfo').innerHTML = `
      <p><b>${lines.length}行 → 謄本 ${pages}枚</b></p>
      <p class="sub">料金の目安：内容証明 ${f.naiyou.toLocaleString()}円＋郵便 110円＋一般書留 480円＋配達証明 350円＝<b>${f.total.toLocaleString()}円</b><br>
      （日本郵便の料金表〔2025年11月時点〕をもとにした目安です。出す前に窓口で確認してください）</p>
      <ul class="sub" style="padding-left:18px;margin:6px 0">
        <li>同じものを<b>3通</b>用意（相手に送る1通・郵便局の保管用・自分の控え）。コピーでOK</li>
        <li>2枚以上になったら、つづり目に<b>契印</b>（はんこ）を押す</li>
        <li>封筒に書く相手と自分の住所・名前は、本文と同じにする</li>
        <li>書き間違えたら、作り直すのがいちばん簡単です</li>
        ${latin ? '<li style="color:var(--accent)">英字は固有名詞にしか使えません。英字が入っていないか確認してください</li>' : ''}
      </ul>`;
  };
  pane.querySelector('#copyBtn').onclick = () => copyText(getText());
  pane.querySelector('#txtBtn').onclick = () => download(`${d.title}.txt`, getText());
  pane.querySelector('#printBtn').onclick = () => printDoc(d.title, getText(), isNaiyou && formatted);
}

// 内容証明（横書き 1行20字・1枚26行）に整える
const NO_LINE_START = '、。，．）」』】〕〉》”’・ー…‥？！ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ';
function formatNaiyou(text) {
  const full = text
    .replace(/[!-~]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0xFEE0))
    .replace(/ /g, '　');
  const out = [];
  full.split('\n').forEach(para => {
    let chars = [...para.replace(/　+$/, '')];
    if (!chars.length) { out.push(''); return; }
    while (chars.length) {
      let n = Math.min(20, chars.length);
      if (chars.length > n && NO_LINE_START.includes(chars[n])) n -= 1; // 句読点を行頭に送らない（行は20字「以内」なので短くてよい）
      out.push(chars.slice(0, n).join(''));
      chars = chars.slice(n);
    }
  });
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
}
function naiyouFee(pages) {
  const naiyou = 480 + 290 * (pages - 1);
  return { naiyou, total: naiyou + 110 + 480 + 350 };
}

function printDoc(title, text, grid) {
  const w = window.open('', '_blank');
  if (!w) return toast('ポップアップを許可してください');
  let body;
  if (grid) {
    const lines = text.split('\n');
    const pages = [];
    for (let i = 0; i < lines.length; i += 26) pages.push(lines.slice(i, i + 26));
    body = pages.map((p, n) => `<section class="pg">${p.map(l => `<div class="ln">${esc(l) || '&nbsp;'}</div>`).join('')}<div class="pno">${n + 1} / ${pages.length}</div></section>`).join('');
  } else {
    body = `<pre>${esc(text)}</pre>`;
  }
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(title)}</title>
    <style>
      body { margin: 0; font-family: "BIZ UDMincho", "Yu Mincho", "MS Mincho", serif; }
      pre { white-space: pre-wrap; font-family: inherit; font-size: 12pt; line-height: 1.8; margin: 20mm; }
      .pg { width: 20em; margin: 18mm auto; font-size: 14pt; line-height: 1.75; page-break-after: always; position: relative; }
      .pg:last-child { page-break-after: auto; }
      .ln { white-space: pre; letter-spacing: 0; }
      .pno { text-align: center; font-size: 9pt; color: #666; margin-top: 8mm; }
    </style>${body}`);
  w.document.close();
  w.focus(); w.print();
}

function paneInfo(c, pane) {
  pane.innerHTML = `
    <div class="card">
      <p><b>${TYPES[c.type].label}</b></p>
      ${FIELDS.map(([k, label, type]) => !c[k] ? '' : type === 'check' ? `<p>✓ ${label}</p>` : `<p><span class="sub">${label}</span><br>${esc(c[k]).replace(/\n/g, '<br>')}</p>`).join('')}
    </div>
    ${!c.address ? '<div class="alert yellow">相手の<b>住所と本名</b>が分かると、内容証明や裁判に進めます。会話の中で聞き出せた情報や、配送伝票・振込名義などに手がかりがないか確認しましょう。</div>' : ''}
    <button class="btn block" id="editBtn">情報を編集する</button>`;
  pane.querySelector('#editBtn').onclick = () => go({ name: 'edit', id: c.id });
}

function renderLoan() {
  const f = state.loanDraft || { date: today() };
  const fields = [['lender', 'あなた（貸す人）の名前'], ['borrower', '借りる人の名前'], ['amount', '金額（円）', 'number'], ['date', '貸す日', 'date'], ['due', '返済期日', 'date'], ['method', '返済方法', 'text', 'PayPay送金で一括返済'], ['addr', '借りる人の住所'], ['tel', '借りる人の電話番号', 'tel']];
  $app.innerHTML = `
    <div class="alert green">お金を貸す前の3つの備え
      <ol style="margin:6px 0;padding-left:20px">
        <li><b>本名・住所・電話番号</b>を聞いておく（これがないと裁判に進めません）</li>
        <li>金額と返済期日に、<b>文字で「同意します」</b>と返信してもらう</li>
        <li>できれば借用書に<b>本人の署名</b>をもらい、写真で保存する</li>
      </ol></div>
    ${fields.map(([k, l, t, ph]) => `<label for="l_${k}">${l}</label><input id="l_${k}" type="${t || 'text'}" value="${esc(f[k] || '')}" placeholder="${esc(ph || '')}">`).join('')}
    <h2>① 相手に送る確認メッセージ</h2>
    <pre class="doc" id="agree"></pre>
    <button class="btn small" id="cpAgree">コピー</button>
    <h2>② 借用書</h2>
    <pre class="doc" id="loanDoc"></pre>
    <div class="row"><button class="btn small" id="cpLoan">コピー</button><button class="btn sub-btn small" id="prLoan">印刷</button></div>`;
  const upd = () => {
    fields.forEach(([k]) => f[k] = $app.querySelector('#l_' + k).value.trim());
    state.loanDraft = f; save();
    $app.querySelector('#agree').textContent = loanAgreeMsg(f);
    $app.querySelector('#loanDoc').textContent = loanDocText(f);
  };
  fields.forEach(([k]) => $app.querySelector('#l_' + k).oninput = upd);
  upd();
  $app.querySelector('#cpAgree').onclick = () => copyText(loanAgreeMsg(f));
  $app.querySelector('#cpLoan').onclick = () => copyText(loanDocText(f));
  $app.querySelector('#prLoan').onclick = () => {
    const w = window.open('', '_blank');
    if (!w) return toast('ポップアップを許可してください');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>借用書</title><pre style="white-space:pre-wrap;font-family:serif;font-size:13pt;line-height:2">${esc(loanDocText(f))}\n\n　署名：＿＿＿＿＿＿＿＿＿＿＿＿　印</pre>`);
    w.document.close(); w.print();
  };
}

function renderContacts() {
  const list = [
    ['警察相談専用電話', '詐欺・トラブルの相談。最寄りの警察につながる', '#9110', 'tel:%239110'],
    ['消費者ホットライン', '近くの消費生活センターにつながる', '188', 'tel:188'],
    ['法テラス', '無料法律相談・弁護士費用の立替制度', '0570-078374', 'tel:0570078374'],
    ['PayPay カスタマーサポート', '24時間・年中無休', '0120-990-634', 'tel:0120990634'],
    ['PayPay 詐欺の報告', 'ヘルプ「詐欺等の疑いがある送る・受け取るを利用した取引を報告したい」から', 'ヘルプ', 'https://paypay.ne.jp/help/c0176/'],
    ['よりそいホットライン', '気持ちがつらいとき。24時間・無料・匿名でOK', '0120-279-338', 'tel:0120279338'],
    ['裁判所（少額訴訟）', '手続きの説明と定型の訴状用紙', '案内ページ', 'https://www.courts.go.jp/saiban/syurui/syurui_minzi/minzi_04_02_02/index.html'],
    ['e内容証明（日本郵便）', 'ネットから内容証明を出せる', 'サイト', 'https://e-naiyo.post.japanpost.jp/'],
  ];
  $app.innerHTML = list.map(([n, d, l, href]) => `
    <div class="card contact"><div><h3>${n}</h3><p class="sub">${d}</p></div>
    <a href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${l}</a></div>`).join('') +
    `<div class="alert yellow">「被害金を取り戻します」と連絡してくる業者・アカウントは<b>回収詐欺</b>の可能性が高いです。自分から公的な窓口に相談してください。</div>`;
}

// ---------- バックアップ ----------
async function exportAll() {
  const imgs = await idb.all();
  const images = await Promise.all(imgs.map(i => new Promise(res => {
    const r = new FileReader();
    r.onload = () => res({ id: i.id, caseId: i.caseId, name: i.name, date: i.date, kind: i.kind, data: r.result });
    r.readAsDataURL(i.blob);
  })));
  download(`tonzura-navi-backup-${today()}.json`, JSON.stringify({ ...state, images }), 'application/json');
}
async function importAll(e) {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.cases)) throw new Error();
    if (!confirm('今のデータを上書きして読み込みます。よろしいですか？')) return;
    for (const i of await idb.all()) await idb.del(i.id);
    for (const i of data.images || []) {
      const blob = await (await fetch(i.data)).blob();
      await idb.put({ id: i.id, caseId: i.caseId, name: i.name, date: i.date, kind: i.kind, blob });
    }
    delete data.images;
    state = data; save(); toast('読み込みました'); render();
  } catch (err) { toast('読み込めないファイルです'); }
}

render();
