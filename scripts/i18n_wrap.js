// Оборачивает русские строки интерфейса в tr('…') и собирает их список.
//   node scripts/i18n_wrap.js --apply  файлы…   → переписывает файлы
//   node scripts/i18n_wrap.js --list   файлы…   → печатает JSON со всеми ключами
// Строки на уровне модуля (данные) не трогает — их переводят там, где показывают.
// Пропускает: ключи объектов, сравнения (===, includes…), case, уже обёрнутые tr().
const ts = require('/opt/node22/lib/node_modules/typescript');
const fs = require('fs');

const CY = /[А-Яа-яЁё]/;
const mode = process.argv[2];
const files = process.argv.slice(3);
const keys = new Set();

const q = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";

function inFunction(n) {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isFunctionLike(p)) return true;
  }
  return false;
}
function isTrCall(n) {
  const p = n.parent;
  return p && ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === 'tr' && p.arguments[0] === n;
}
function skipLiteral(n) {
  const p = n.parent;
  if (!p) return true;
  if (isTrCall(n)) return true;
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p)) && p.name === n) return true;
  if (ts.isElementAccessExpression(p) && p.argumentExpression === n) return true;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isBinaryExpression(p)) {
    const k = p.operatorToken.kind;
    const S = ts.SyntaxKind;
    if ([S.EqualsEqualsEqualsToken, S.ExclamationEqualsEqualsToken, S.EqualsEqualsToken, S.ExclamationEqualsToken, S.InKeyword].includes(k)) return true;
  }
  if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression)) {
    const m = p.expression.name.text;
    if (['includes', 'startsWith', 'endsWith', 'indexOf', 'split', 'replace', 'test', 'match', 'getItem', 'setItem'].includes(m)) return true;
  }
  // ключ в jsx key="…"
  if (ts.isJsxAttribute(p) && ['key', 'testID', 'nativeID'].includes(p.name.getText())) return true;
  return false;
}

// Как JSX превращает текст между тегами в строку (как в Babel).
function cleanJsx(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((l, i) => { if (/[^ \t]/.test(l)) last = i; });
  let out = '';
  lines.forEach((line, i) => {
    const first = i === 0, isLast = i === lines.length - 1;
    let t = line.replace(/\t/g, ' ');
    if (!first) t = t.replace(/^[ ]+/, '');
    if (!isLast) t = t.replace(/[ ]+$/, '');
    if (t) {
      if (i !== last) t += ' ';
      out += t;
    }
  });
  return out;
}
const hasJsx = (n) => {
  let f = false;
  (function w(x) { if (ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x)) f = true; else ts.forEachChild(x, w); })(n);
  return f;
};

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const edits = [];
  const add = (start, end, text, key) => { edits.push({ start, end, text }); keys.add(key); };

  function tmpl(n) {
    // `a ${x} b` → ['a {0} b', [x]]
    let s = n.head.text; const args = [];
    n.templateSpans.forEach((sp, i) => { s += `{${i}}` + sp.literal.text; args.push(sp.expression.getText(sf)); });
    return [s, args];
  }

  function visit(n) {
    // Текст внутри JSX-элемента: склеиваем текст и {выражения} в одну строку с {0}, {1}…
    if (ts.isJsxElement(n)) {
      const kids = n.children;
      const textKids = kids.filter((c) => ts.isJsxText(c) && CY.test(c.text));
      if (textKids.length) {
        const simple = kids.every((c) => ts.isJsxText(c) || (ts.isJsxExpression(c) && (!c.expression || !hasJsx(c.expression))));
        if (simple) {
          let s = ''; const args = [];
          for (const c of kids) {
            if (ts.isJsxText(c)) s += cleanJsx(c.text);
            else if (c.expression) { s += `{${args.length}}`; args.push(c.expression.getText(sf)); }
          }
          const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
          const core = s.trim();
          const start = kids[0].getStart(sf, false) === kids[0].pos ? kids[0].pos : kids[0].pos;
          const end = kids[kids.length - 1].end;
          const call = `{tr(${q(core)}${args.map((a) => ', ' + a).join('')})}`;
          add(start, end, (lead ? `{${q(lead)}}` : '') + call + (trail ? `{${q(trail)}}` : ''), core);
          // выражения внутри уже стали аргументами — их отдельно не обходим
          return;
        }
        for (const c of textKids) {
          const s = cleanJsx(c.text);
          if (!s.trim()) continue;
          const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
          add(c.pos, c.end, (lead ? `{${q(lead)}}` : '') + `{tr(${q(s.trim())})}` + (trail ? `{${q(trail)}}` : ''), s.trim());
        }
      }
    }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && CY.test(n.text) && inFunction(n) && !skipLiteral(n)) {
      const call = `tr(${q(n.text)})`;
      add(n.getStart(sf), n.end, ts.isJsxAttribute(n.parent) ? `{${call}}` : call, n.text);
      return;
    }
    if (ts.isTemplateExpression(n) && CY.test(n.getText(sf)) && inFunction(n) && !skipLiteral(n)) {
      const [s, args] = tmpl(n);
      if (!n.templateSpans.some((sp) => hasJsx(sp.expression))) {
        add(n.getStart(sf), n.end, `tr(${q(s)}${args.map((a) => ', ' + a).join('')})`, s);
        return;
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);

  if (mode === '--apply' && edits.length) {
    edits.sort((a, b) => b.start - a.start);
    let out = src;
    for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    if (!/import \{[^}]*\btr\b[^}]*\} from '[^']*i18n'/.test(out)) {
      const depth = file.split('/').length - 1; // App.js → 0, src/x/y.js → 2
      const path = depth === 0 ? './src/i18n' : depth === 1 ? './i18n' : '../i18n';
      const lines = out.split('\n');
      let at = -1;
      lines.forEach((l, i) => { if (l.startsWith('import ')) at = i; });
      if (at >= 0) while (at < lines.length && !lines[at].trimEnd().endsWith(';')) at++;
      else while (at + 1 < lines.length && lines[at + 1].startsWith('//')) at++;
      lines.splice(at + 1, 0, `import { tr } from '${path}';`);
      out = lines.join('\n');
    }
    fs.writeFileSync(file, out);
    console.error(file, edits.length);
  }
}
if (mode === '--list') console.log(JSON.stringify([...keys], null, 0));
