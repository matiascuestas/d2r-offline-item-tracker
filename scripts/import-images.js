const fs = require("fs");
const path = require("path");

const source = process.argv[2];
const target = path.join(__dirname, "..", "assets", "items");
const allowed = new Set([".png", ".gif", ".webp", ".jpg", ".jpeg"]);

if (!source) {
  console.error("Uso: npm run import-images -- <carpeta-con-sprites>");
  process.exit(1);
}

const sourcePath = path.resolve(source);
if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
  console.error(`La carpeta no existe: ${sourcePath}`);
  process.exit(1);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (entry.isFile() && allowed.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

fs.mkdirSync(target, { recursive: true });

let copied = 0;
for (const file of walk(sourcePath)) {
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file, path.extname(file)).toLowerCase();
  if (!base.startsWith("inv")) continue;
  fs.copyFileSync(file, path.join(target, `${base}${ext}`));
  copied += 1;
}

console.log(`Importadas ${copied} imagenes a ${target}`);
