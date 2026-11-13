// Собирает все ключи перевода: первые аргументы tr('…') и русские строки данных, которые переводятся при показе.
//   node scripts/i18n_keys.js > /tmp/keys.json
const ts = require('/opt/node22/lib/node_modules/typescript');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CY = /[А-Яа-яЁё]/;
const files = ['App.js', ...['src/screens', 'src/components', 'src/lib'].flatMap((d) =>
  fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.js')).map((f) => `${d}/${f}`)),
  'src/data/kami.js', 'src/data/content.js', 'src/data/teachers.js', 'src/data/facts.js'];
// Данные модулей, которые переводятся при показе (имена переменных верхнего уровня).
const DATA_VARS = {
  'App.js': ['TABS'], 'src/screens/AuthScreen.js': ['TITLES'], 'src/screens/ChestScreen.js': ['INFO', 'KIND_RU'],
  'src/screens/ExamScreen.js': ['WD'], 'src/screens/ProgressScreen.js': ['WD'], 'src/screens/HomeScreen.js': ['DAY_LETTERS'],
  'src/screens/PlusScreen.js': ['PLANS', 'BENEFITS'], 'src/components/UserAvatar.js': ['BY_AVATAR'],
  'src/lib/api.js': ['SHOP_ERRORS', 'TASK_ERRORS', 'FRIEND_ERRORS'],
  'src/data/content.js': ['SUBJECTS', 'NEXT_DAY', 'PRIMARIA_NAMES'], 'src/data/kami.js': ['*'], 'src/data/teachers.js': ['*'], 'src/data/facts.js': ['*'],
};
const keys = [];
const seen = new Set();
const add = (k) => { if (CY.test(k) && !seen.has(k)) { seen.add(k); keys.push(k); } };
for (const f of files) {
  const sf = ts.createSourceFile(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const vars = DATA_VARS[f] || [];
  (function walk(n, topVar) {
    if (ts.isVariableDeclaration(n) && !topVar && ts.isIdentifier(n.name) && !n.parent.parent.parent?.parent) topVar = n.name.text;
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'tr' && n.arguments[0]
      && (ts.isStringLiteral(n.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(n.arguments[0]))) add(n.arguments[0].text);
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && topVar && (vars.includes('*') || vars.includes(topVar))) {
      const p = n.parent;
      const isKey = p && ts.isPropertyAssignment(p) && p.name === n;
      const isEs = p && ts.isPropertyAssignment(p) && p.name.getText(sf) === 'es';
      if (!isKey && !isEs) add(n.text);
    }
    ts.forEachChild(n, (c) => walk(c, topVar));
  })(sf, null);
}
console.log(JSON.stringify(keys, null, 0));
