const fs = require("fs");
const path = require("path");

const dataRoot = path.join(__dirname, "..", "node_modules", "@blizzhackers", "d2data", "json");
const outFile = path.join(__dirname, "..", "data", "bases.json");
const outJsFile = path.join(__dirname, "..", "data", "bases.js");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataRoot, file), "utf8"));
}

const baseItems = loadJson("items.json");
const itemTypes = loadJson("itemtypes.json");

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

function getFamily(base) {
  const armorTypes = ["helm", "tors", "shie", "boot", "glov", "belt", "circ", "pelt", "phlm", "head", "ashd", "grim"];
  if (armorTypes.includes(base.type) || asNumber(base.armorclass) > 0) return "Armor";
  if ([asNumber(base.mindam), asNumber(base.maxdam), asNumber(base["2handmindam"]), asNumber(base["2handmaxdam"])].some((value) => value > 0)) return "Weapons";
  return "Other";
}

function getSubtype(base) {
  const type = itemTypes[base.type] || {};
  const itemType = type.ItemType || base.type || "Other";
  const ui = type.UICategory || "";
  const armorSubtypes = { armor: "Body Armor", helms: "Helms", circl: "Circlets", belts: "Belts", boots: "Boots", glove: "Gloves", shlds: "Shields", palad: "Paladin Shields", necro: "Necromancer Heads", druid: "Druid Pelts", barbh: "Barbarian Helms", warlo: "Grimoires" };
  const weaponSubtypes = { axes: "Axes", sword: "Swords", maces: "Maces & Hammers", daggs: "Daggers", scept: "Scepters", wands: "Wands", stave: "Staves", bows: "Bows", xbows: "Crossbows", spear: "Spears", poles: "Polearms", javel: "Javelins", throw: "Throwing", assas: "Assassin Claws", sorce: "Sorceress Orbs", amazo: "Amazon Weapons" };
  return armorSubtypes[ui] || weaponSubtypes[ui] || itemType;
}

function getTier(code, base) {
  if (code === base.normcode) return "Normal";
  if (code === base.ubercode) return "Exceptional";
  if (code === base.ultracode) return "Elite";
  return "Special";
}

function damage(a, b) {
  const min = asNumber(a);
  const max = asNumber(b);
  if (min === null && max === null) return null;
  if ((min || 0) === 0 && (max || 0) === 0) return null;
  return `${min || 0}-${max || 0}`;
}

function getStats(base) {
  return {
    oneHandDamage: damage(base.mindam, base.maxdam),
    twoHandDamage: damage(base["2handmindam"], base["2handmaxdam"]),
    throwDamage: damage(base.minmisdam, base.maxmisdam),
    defense: range(base.minac, base.maxac) || (base.armorclass ? String(base.armorclass) : null),
    durability: asNumber(base.durability),
    speed: clean(base.speed),
    requiredStrength: asNumber(base.reqstr),
    requiredDexterity: asNumber(base.reqdex),
    maxSockets: Math.max(asNumber(base.gemsockets) || 0, asNumber(base["MaxSockets3"]) || 0),
  };
}

const bases = Object.values(baseItems)
  .filter((base) => base && base.code && base.name && base.spawnable !== 0 && base.hasinv !== 0)
  .map((base) => ({ base, family: getFamily(base) }))
  .filter(({ family }) => family === "Weapons" || family === "Armor")
  .map(({ base, family }) => {
    const invfile = clean(base.invfile) || base.code;
    return {
      id: base.lineNumber,
      name: base.name,
      baseName: base.name,
      code: base.code,
      level: asNumber(base.level),
      requiredLevel: asNumber(base.levelreq) || 0,
      rarity: asNumber(base.rarity),
      family,
      subtype: getSubtype(base),
      tier: getTier(base.code, base),
      width: asNumber(base.invwidth) || 1,
      height: asNumber(base.invheight) || 1,
      image: `assets/items/${invfile}.png`,
      invfile,
      baseStats: getStats(base),
      properties: [],
      setBonuses: [],
      fullSetBonuses: [],
      hasVariableStats: false,
      search: `${base.name} ${base.code} ${family} ${getSubtype(base)} ${getTier(base.code, base)}`.toLowerCase(),
    };
  })
  .sort((a, b) => a.requiredLevel - b.requiredLevel || a.level - b.level || a.name.localeCompare(b.name));

const payload = {
  generatedAt: new Date().toISOString(),
  source: "@blizzhackers/d2data 3.2.92777",
  section: "Bases",
  count: bases.length,
  items: bases,
};

fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(outJsFile, `window.D2_BASES = ${JSON.stringify(payload, null, 2)};\n`);
console.log(`Generated ${bases.length} base items at ${outFile}`);
console.log(`Generated browser payload at ${outJsFile}`);
