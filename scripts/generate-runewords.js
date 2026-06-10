const fs = require("fs");
const path = require("path");

const dataRoot = path.join(__dirname, "..", "node_modules", "@blizzhackers", "d2data", "json");
const outFile = path.join(__dirname, "..", "data", "runewords.json");
const outJsFile = path.join(__dirname, "..", "data", "runewords.js");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataRoot, file), "utf8"));
}

const runewordRows = Object.values(loadJson("runes.json"));
const baseItems = loadJson("items.json");
const itemTypes = loadJson("itemtypes.json");
const properties = loadJson("properties.json");
const runewordCategories = loadJson("runeworduicategories.json");

const excludedRunewords = new Set(["Authority", "Coven", "Ritual", "Vigilance", "Void"]);

const categoryLabels = {
  "Body Armor": "Body Armor",
  Helms: "Helms",
  "Melee Weapons": "Melee Weapons",
  "Missile Weapons": "Ranged Weapons",
  Offhand: "Shields & Offhands",
};

const subtypeLabels = {
  armor: "Body Armor",
  helms: "Helms",
  shlds: "Shields",
  palad: "Paladin Shields",
  necro: "Necromancer Heads",
  warlo: "Grimoires",
  axes: "Axes",
  sword: "Swords",
  maces: "Maces & Hammers",
  daggs: "Daggers",
  scept: "Scepters",
  wands: "Wands",
  stave: "Staves",
  bows: "Bows",
  xbows: "Crossbows",
  spear: "Spears",
  poles: "Polearms",
  javel: "Javelins",
  throw: "Throwing",
  assas: "Assassin Claws",
  sorce: "Sorceress Orbs",
  amazo: "Amazon Weapons",
};

function clean(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function asNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function range(min, max) {
  const a = asNumber(min);
  const b = asNumber(max);
  if (a === null && b === null) return null;
  if (a === b || b === null) return String(a);
  if (a === null) return String(b);
  return `${a}-${b}`;
}

function humanize(code) {
  return String(code || "")
    .replace(/[/%-]+/g, " ")
    .replace(/\bltng\b/g, "lightning")
    .replace(/\bdmg\b/g, "damage")
    .replace(/\bac\b/g, "defense")
    .replace(/\batt\b/g, "attack rating")
    .replace(/\bstr\b/g, "strength")
    .replace(/\bdex\b/g, "dexterity")
    .replace(/\bvit\b/g, "vitality")
    .replace(/\bres\b/g, "resist")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatProperty(code, min, max, param) {
  const prop = properties[code] || {};
  const value = range(min, max);
  const p = clean(param);
  const tooltip = clean(prop["*Tooltip"]);
  let label = tooltip || humanize(code);

  if (tooltip && value !== null) label = tooltip.replace(/#/g, value);
  else if (value !== null) label = `${label}: ${value}`;
  if (p !== null && !label.includes(String(p))) label += ` (${p})`;
  return label.replace(/\s+/g, " ").trim();
}

function getProperties(row) {
  const props = [];
  for (let i = 1; i <= 12; i += 1) {
    const code = clean(row[`T1Code${i}`]);
    if (!code) continue;
    const min = row[`T1Min${i}`];
    const max = row[`T1Max${i}`];
    const param = row[`T1Param${i}`];
    props.push({
      code,
      min: asNumber(min),
      max: asNumber(max),
      param: clean(param),
      variable: asNumber(min) !== asNumber(max),
      text: formatProperty(code, min, max, param),
    });
  }
  return props;
}

function runeInfo(code) {
  const rune = baseItems[code] || {};
  const name = String(rune.name || code).replace(/ Rune$/, "");
  return {
    code,
    name,
    requiredLevel: asNumber(rune.levelreq) || asNumber(rune.level) || 0,
    invfile: clean(rune.invfile) || code,
  };
}

function getRunes(row) {
  const runes = [];
  for (let i = 1; i <= 6; i += 1) {
    const code = clean(row[`Rune${i}`]);
    if (code) runes.push(runeInfo(code));
  }
  return runes;
}

function getAllowedTypes(row) {
  const types = [];
  for (let i = 1; i <= 6; i += 1) {
    const code = clean(row[`itype${i}`]);
    if (!code) continue;
    const type = itemTypes[code] || {};
    const category = runewordCategories[type.RunewordCategory1]?.["*Category"] || null;
    types.push({
      code,
      name: type.ItemType || code,
      family: categoryLabels[category] || category || type.ItemType || code,
      subtype: subtypeLabels[type.UICategory] || type.ItemType || code,
    });
  }
  return types;
}

function getFamily(types) {
  const families = [...new Set(types.map((type) => type.family).filter(Boolean))];
  if (!families.length) return "Other";
  if (families.length === 1) return families[0];
  if (families.some((family) => family.includes("Weapons"))) return "Various Weapons";
  return "Various Bases";
}

function getSubtype(types) {
  const subtypes = [...new Set(types.map((type) => type.subtype).filter(Boolean))];
  if (!subtypes.length) return "Other";
  if (subtypes.length === 1) return subtypes[0];
  return subtypes.join(" / ");
}

function getPatch(row) {
  const release = clean(row["*Patch Release"]);
  if (!release) return "D2R / classic";
  if (typeof release === "number") return `Patch ${String(release).replace(/^(\d)(\d\d)$/, "$1.$2")}`;
  return String(release);
}

const runewords = runewordRows
  .filter((row) => row && row.complete && row["*Rune Name"] && !excludedRunewords.has(row["*Rune Name"]))
  .map((row) => {
    const name = row["*Rune Name"];
    const runes = getRunes(row);
    const allowedTypes = getAllowedTypes(row);
    const properties = getProperties(row);
    const runeText = runes.map((rune) => rune.name).join(" + ");
    const baseText = allowedTypes.map((type) => type.name).join(" / ");
    const patch = getPatch(row);
    const sockets = runes.length;
    return {
      id: row.lineNumber,
      name,
      baseName: baseText || "Compatible bases",
      code: runeText,
      level: Math.max(...runes.map((rune) => rune.requiredLevel), 0),
      requiredLevel: Math.max(...runes.map((rune) => rune.requiredLevel), 0),
      rarity: null,
      family: getFamily(allowedTypes),
      subtype: getSubtype(allowedTypes),
      tier: `${sockets} sockets`,
      width: 1,
      height: 1,
      image: "assets/items/runeword.png",
      invfile: runes[0]?.invfile || "runeword",
      runes,
      allowedTypes,
      patch,
      baseStats: { maxSockets: sockets },
      properties: [
        { text: `Runes: ${runeText}`, variable: false },
        { text: `Bases: ${baseText || "Not specified"}`, variable: false },
        { text: `Availability: ${patch}`, variable: false },
        ...properties,
      ],
      setBonuses: [],
      fullSetBonuses: [],
      hasVariableStats: properties.some((prop) => prop.variable),
      search: `${name} ${runeText} ${baseText} ${patch} ${properties.map((prop) => prop.text).join(" ")}`.toLowerCase(),
    };
  })
  .sort((a, b) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name));

const payload = {
  generatedAt: new Date().toISOString(),
  source: "@blizzhackers/d2data 3.2.92777",
  section: "Runewords",
  count: runewords.length,
  items: runewords,
};

fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(outJsFile, `window.D2_RUNEWORDS = ${JSON.stringify(payload, null, 2)};\n`);
console.log(`Generated ${runewords.length} runewords at ${outFile}`);
console.log(`Generated browser payload at ${outJsFile}`);
