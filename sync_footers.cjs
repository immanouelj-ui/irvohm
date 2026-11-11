// Apply the shared footer before publishing the static HTML.
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const template = fs.readFileSync(path.join(root, 'components/footer.html'), 'utf8').trim();
const stylesheet = '<link rel="stylesheet" href="/site-chrome.css"/>\n';

function syncDirectory(directory) {
  let count = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'components' || entry.name === 'node_modules') continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      count += syncDirectory(filename);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const source = fs.readFileSync(filename, 'utf8');
    if (!/<footer\b/.test(source)) continue;
    const footers = source.match(/<footer\b[\s\S]*?<\/footer>/g);
    if (footers?.length !== 1) throw new Error(`Pied de page invalide : ${path.relative(root, filename)}`);

    let output = source.replace(footers[0], () => template);
    if (!output.includes('href="/site-chrome.css"')) {
      output = output.replace('</head>', stylesheet + '</head>');
    }
    if (output !== source) fs.writeFileSync(filename, output);
    count += 1;
  }
  return count;
}

console.log(`${syncDirectory(root)} pieds de page synchronisés.`);
