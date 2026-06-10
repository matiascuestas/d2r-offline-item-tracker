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
  if (armorTypes.includes(base.type) || asNumber(base.armorclass) > 0) return "Armaduras";
  if ([asNumber(base.mindam), asNumber(base.maxdam), asNumber(base["2handmindam"]), asNumber(base["2handmaxdam"])].some((value) => value > 0)) return "Armas";
  return "Otros";
}

function getSubtype(base) {
  const type = itemTypes[base.type] || {};
  const itemType = type.ItemType || base.type || "Otros";
  const ui = type.UICategory || "";
  const armorSubtypes = { armor: "Armaduras corporales", helms: "Cascos", circl: "Diademas y circlets", belts: "Cintos", boots: "Botas", glove: "Guantes", shlds: "Escudos", palad: "Escudos de paladin", necro: "Cabezas de necromante", druid: "Pelts de druida", barbh: "Cascos de barbaro", warlo: "Grimorios" };
  const weaponSubtypes = { axes: "Hachas", sword: "Espadas", maces: "Mazas y martillos", daggs: "Dagas", scept: "Cetros", wands: "Varitas", stave: "Bastones", bows: "Arcos", xbows: "Ballestas", spear: "Lanzas", poles: "Armas de asta", javel: "Jabalinas", throw: "Arrojadizas", assas: "Garras de asesina", sorce: "Orbes de hechicera", amazo: "Armas de amazona" };
  return armorSubtypes[ui] || weaponSubtypes[ui] || itemType;
}

function getTier(code, base) {
  if (code === base.normcode) return "Normal";
  if (code === base.ubercode) return "Excepcional";
  if (code === base.ultracode) return "Elite";
  return "Especial";
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
  .filter(({ family }) => family === "Armas" || family === "Armaduras")
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
