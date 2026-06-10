const fs = require("fs");
const path = require("path");

const dataRoot = path.join(__dirname, "..", "node_modules", "@blizzhackers", "d2data", "json");
const outFile = path.join(__dirname, "..", "data", "uniques.json");
const outJsFile = path.join(__dirname, "..", "data", "uniques.js");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataRoot, file), "utf8"));
}

const uniqueItems = Object.values(loadJson("uniqueitems.json"));
const baseItems = loadJson("items.json");
const properties = loadJson("properties.json");
const itemTypes = loadJson("itemtypes.json");

const storePages = {
  armo: "Armaduras",
  weap: "Armas",
  misc: "Miscelaneos",
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

  if (tooltip && value !== null) {
    label = tooltip.replace(/#/g, value);
  } else if (value !== null) {
    label = `${label}: ${value}`;
  }

  if (p !== null && !label.includes(String(p))) {
    label += ` (${p})`;
  }

  return label.replace(/\s+/g, " ").trim();
}

function getProperties(row) {
  const props = [];
  for (let i = 1; i <= 12; i += 1) {
    const code = clean(row[`prop${i}`]);
    if (!code) continue;
    const min = row[`min${i}`];
    const max = row[`max${i}`];
    const param = row[`par${i}`];
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

function getFamily(base) {
  const type = itemTypes[base.type] || {};
  const armorTypes = ["helm", "tors", "shie", "boot", "glov", "belt", "circ", "pelt", "phlm", "head", "ashd", "grim"];
  if (armorTypes.includes(base.type) || asNumber(base.armorclass) > 0) return "Armaduras";
  if ([asNumber(base.mindam), asNumber(base.maxdam), asNumber(base["2handmindam"]), asNumber(base["2handmaxdam"])].some((value) => value > 0)) return "Armas";
  if (["amul", "ring"].includes(base.type)) return "Joyeria";
  if (["char", "jewl", "cjwl", "csch"].includes(base.type) || type.Equiv1 === "char") return "Charms y joyas";
  return storePages[type.StorePage] || storePages[base.StorePage] || "Otros";
}

function getSubtype(base) {
  const type = itemTypes[base.type] || {};
  const itemType = type.ItemType || base.type || "Otros";
  const ui = type.UICategory || "";

  const armorSubtypes = {
    armor: "Armaduras corporales",
    helms: "Cascos",
    circl: "Diademas y circlets",
    belts: "Cintos",
    boots: "Botas",
    glove: "Guantes",
    shlds: "Escudos",
    palad: "Escudos de paladin",
    necro: "Cabezas de necromante",
    druid: "Pelts de druida",
    barbh: "Cascos de barbaro",
    warlo: "Grimorios",
  };

  const weaponSubtypes = {
    axes: "Hachas",
    sword: "Espadas",
    maces: "Mazas y martillos",
    daggs: "Dagas",
    scept: "Cetros",
    wands: "Varitas",
    stave: "Bastones",
    bows: "Arcos",
    xbows: "Ballestas",
    spear: "Lanzas",
    poles: "Armas de asta",
    javel: "Jabalinas",
    throw: "Arrojadizas",
    assas: "Garras de asesina",
    sorce: "Orbes de hechicera",
    amazo: "Armas de amazona",
  };

  const miscSubtypes = {
    amule: "Amuletos",
    rings: "Anillos",
    charm: "Charms",
    jewel: "Joyas",
  };

  if (["char", "csch"].includes(base.type) || type.Equiv1 === "char") return "Charms";
  if (["jewl", "cjwl"].includes(base.type)) return "Joyas";

  return armorSubtypes[ui] || weaponSubtypes[ui] || miscSubtypes[ui] || itemType;
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

const uniques = uniqueItems
  .filter((row) => row && row.index && row.code && row.spawnable !== 0)
  .map((row) => {
    const base = baseItems[row.code] || {};
    const invfile = clean(row.invfile) || clean(base.uniqueinvfile) || clean(base.invfile) || row.code;
    const props = getProperties(row);
    return {
      id: row["*ID"],
      name: row.index,
      baseName: base.name || row["*ItemName"] || row.code,
      code: row.code,
      level: asNumber(row.lvl),
      requiredLevel: asNumber(row["lvl req"]),
      rarity: asNumber(row.rarity),
      family: getFamily(base),
      subtype: getSubtype(base),
      tier: getTier(row.code, base),
      width: asNumber(base.invwidth) || 1,
      height: asNumber(base.invheight) || 1,
      image: `assets/items/${invfile}.png`,
      invfile,
      baseStats: getStats(base),
      properties: props,
      hasVariableStats: props.some((prop) => prop.variable),
      search: `${row.index} ${row["*ItemName"] || ""} ${row.code} ${getSubtype(base)} ${props.map((p) => p.text).join(" ")}`.toLowerCase(),
    };
  })
  .sort((a, b) => a.requiredLevel - b.requiredLevel || a.level - b.level || a.name.localeCompare(b.name));

const payload = {
  generatedAt: new Date().toISOString(),
  source: "@blizzhackers/d2data 3.2.92777",
  section: "Unicos",
  count: uniques.length,
  items: uniques,
};

fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(outJsFile, `window.D2_UNIQUES = ${JSON.stringify(payload, null, 2)};\n`);
console.log(`Generated ${uniques.length} unique items at ${outFile}`);
console.log(`Generated browser payload at ${outJsFile}`);
