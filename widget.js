// Moneys widget for Scriptable (scriptable.app).
// The app fills in API and KEY when you tap "Copy widget script". The key is private: don't share this script.
const API = '__API__';
const KEY = '__KEY__';

const ink = Color.dynamic(new Color('#13181A'), new Color('#ECF0EE'));
const ink2 = Color.dynamic(new Color('#5B6469'), new Color('#A3ACA8'));
const pine = Color.dynamic(new Color('#1D6A55'), new Color('#57BD98'));
const red = Color.dynamic(new Color('#B23838'), new Color('#EF7C74'));
const amber = Color.dynamic(new Color('#9C6410'), new Color('#E2A64C'));
const bg = Color.dynamic(new Color('#F1F3F1'), new Color('#0C100F'));

const money = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
const signed = (n) => (n >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');

async function load() {
  const req = new Request(API);
  req.method = 'POST';
  req.body = JSON.stringify({ key: KEY, action: 'widget' });
  const j = await req.loadJSON();
  if (!j || !j.ok) throw new Error((j && j.error) || 'Could not load');
  Keychain.set('moneys-widget', JSON.stringify(j.data));
  return j.data;
}

let d = null;
try { d = await load(); } catch (e) {
  if (Keychain.contains('moneys-widget')) d = JSON.parse(Keychain.get('moneys-widget'));
}

const fam = config.widgetFamily || 'medium';
const w = new ListWidget();
const lock = fam.startsWith('accessory');
if (!lock) { w.backgroundColor = bg; w.setPadding(14, 16, 12, 16); }

function text(parent, s, font, color) {
  const t = parent.addText(s);
  t.font = font;
  t.textColor = color;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.7;
  return t;
}
function row(label, value, color) {
  const r = w.addStack();
  r.layoutHorizontally();
  text(r, label, Font.systemFont(12), ink2);
  r.addSpacer();
  text(r, value, Font.semiboldSystemFont(12), color || ink);
  w.addSpacer(3);
}

if (lock) {
  // Lock Screen: iOS tints it, so plain white text
  const white = Color.white();
  text(w, 'Net worth', Font.systemFont(11), white);
  text(w, d ? money(d.netWorth) : '--', Font.boldSystemFont(18), white);
  if (d && fam !== 'accessoryCircular') text(w, signed(d.investToday) + ' today', Font.systemFont(11), white);
} else if (!d) {
  text(w, 'Moneys', Font.semiboldSystemFont(13), ink);
  w.addSpacer(4);
  text(w, "Can't reach your sheet yet", Font.systemFont(12), ink2);
} else {
  const top = w.addStack();
  top.layoutHorizontally();
  text(top, 'Net worth', Font.systemFont(12), ink2);
  top.addSpacer();
  const df = new DateFormatter();
  df.useShortTimeStyle();
  text(top, df.string(new Date(d.at)), Font.systemFont(10), ink2);
  text(w, money(d.netWorth), Font.boldSystemFont(fam === 'small' ? 24 : 28), ink);
  text(w, signed(d.investToday) + ' investing today', Font.mediumSystemFont(12), d.investToday >= 0 ? pine : red);
  if (fam === 'small') {
    w.addSpacer();
    text(w, money(d.free) + ' free to spend', Font.systemFont(11), ink2);
  } else {
    w.addSpacer(6);
    row('Free to spend', money(d.free));
    row(d.month + ' spent', money(d.spent) + ' of ' + money(d.avg) + ' avg', d.spent > d.avg ? amber : ink);
    const tone = (b) => (b.used > b.limit ? red : b.used > 0.8 * b.limit ? amber : ink);
    const budgets = (d.budgets || []).slice().sort((a, b) => b.used / b.limit - a.used / a.limit);
    if (fam === 'large') budgets.forEach((b) => row(b.cat, money(b.used) + ' of ' + money(b.limit), tone(b)));
    else if (budgets.length) row(budgets[0].cat + ' budget', money(budgets[0].used) + ' of ' + money(budgets[0].limit), tone(budgets[0]));
  }
  w.addSpacer();
}

w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium(); // preview when you run it inside Scriptable
Script.complete();
