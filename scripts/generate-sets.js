const fs = require("fs");
const path = require("path");

const dataRoot = path.join(__dirname, "..", "node_modules", "@blizzhackers", "d2data", "json");
const outFile = path.join(__dirname, "..", "data", "sets.json");
const outJsFile = path.join(__dirname, "..", "data", "sets.js");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataRoot, file), "utf8"));
}

const setItems = Object.values(loadJson("setitems.json"));
const setGroups = loadJson("sets.json");
const baseItems = loadJson("items.json");
const properties = loadJson("properties.json");
const itemTypes = loadJson("itemtypes.json");

const storePages = {
  armo: "Armor",
  weap: "Weapons",
  misc: "Miscellaneous",
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

function getProperties(row, prefix = "", max = 12) {
  const props = [];
  for (let i = 1; i <= max; i += 1) {
    const code = clean(row[`${prefix}prop${i}`]);
    if (!code) continue;
    const min = row[`${prefix}min${i}`];
    const maxValue = row[`${prefix}max${i}`];
    const param = row[`${prefix}par${i}`];
    props.push({
      code,
      min: asNumber(min),
      max: asNumber(maxValue),
      param: clean(param),
      variable: asNumber(min) !== asNumber(maxValue),
      text: formatProperty(code, min, maxValue, param),
    });
  }
  return props;
}

function getAlphaProperties(row) {
  const props = [];
  for (let i = 1; i <= 5; i += 1) {
    for (const suffix of ["a", "b"]) {
      const code = clean(row[`aprop${i}${suffix}`]);
      if (!code) continue;
      const min = row[`amin${i}${suffix}`];
      const max = row[`amax${i}${suffix}`];
      const param = row[`apar${i}${suffix}`];
      props.push({
        code,
        min: asNumber(min),
        max: asNumber(max),
        param: clean(param),
        variable: asNumber(min) !== asNumber(max),
        text: formatProperty(code, min, max, param),
      });
    }
  }
  return props;
}

function getFullSetProperties(setName) {
  const row = setGroups[setName] || {};
  const props = [];
  for (let i = 1; i <= 8; i += 1) {
    const code = clean(row[`FCode${i}`]);
    if (!code) continue;
    const min = row[`FMin${i}`];
    const max = row[`FMax${i}`];
    const param = row[`FParam${i}`];
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
  if (armorTypes.includes(base.type) || asNumber(base.armorclass) > 0) return "Armor";
  if ([asNumber(base.mindam), asNumber(base.maxdam), asNumber(base["2handmindam"]), asNumber(base["2handmaxdam"])].some((value) => value > 0)) return "Weapons";
  if (["amul", "ring"].includes(base.type)) return "Jewelry";
  if (["char", "jewl", "cjwl", "csch"].includes(base.type) || type.Equiv1 === "char") return "Charms & Jewels";
  return storePages[type.StorePage] || storePages[base.StorePage] || "Other";
}

function getSubtype(base) {
  const type = itemTypes[base.type] || {};
  const itemType = type.ItemType || base.type || "Other";
  const ui = type.UICategory || "";
  const armorSubtypes = { armor: "Body Armor", helms: "Helms", circl: "Circlets", belts: "Belts", boots: "Boots", glove: "Gloves", shlds: "Shields", palad: "Paladin Shields", necro: "Necromancer Heads", druid: "Druid Pelts", barbh: "Barbarian Helms", warlo: "Grimoires" };
  const weaponSubtypes = { axes: "Axes", sword: "Swords", maces: "Maces & Hammers", daggs: "Daggers", scept: "Scepters", wands: "Wands", stave: "Staves", bows: "Bows", xbows: "Crossbows", spear: "Spears", poles: "Polearms", javel: "Javelins", throw: "Throwing", assas: "Assassin Claws", sorce: "Sorceress Orbs", amazo: "Amazon Weapons" };
  const miscSubtypes = { amule: "Amulets", rings: "Rings", charm: "Charms", jewel: "Jewels" };
  if (["char", "csch"].includes(base.type) || type.Equiv1 === "char") return "Charms";
  if (["jewl", "cjwl"].includes(base.type)) return "Jewels";
  return armorSubtypes[ui] || weaponSubtypes[ui] || miscSubtypes[ui] || itemType;
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

const sets = setItems
  .filter((row) => row && row.index && row.item && row.spawnable !== 0)
  .map((row) => {
    const base = baseItems[row.item] || {};
    const invfile = clean(row.invfile) || clean(base.setinvfile) || clean(base.invfile) || row.item;
    const properties = getProperties(row);
    const setBonuses = getAlphaProperties(row);
    const fullSetBonuses = getFullSetProperties(row.set);
    return {
      id: row["*ID"],
      name: row.index,
      setName: row.set,
      baseName: base.name || row["*ItemName"] || row.item,
      code: row.item,
      level: asNumber(row.lvl),
      requiredLevel: asNumber(row["lvl req"]),
      rarity: asNumber(row.rarity),
      family: getFamily(base),
      subtype: getSubtype(base),
      tier: getTier(row.item, base),
      width: asNumber(base.invwidth) || 1,
      height: asNumber(base.invheight) || 1,
      image: `assets/items/${invfile}.png`,
      invfile,
      baseStats: getStats(base),
      properties,
      setBonuses,
      fullSetBonuses,
      hasVariableStats: [...properties, ...setBonuses, ...fullSetBonuses].some((prop) => prop.variable),
      search: `${row.index} ${row.set || ""} ${row["*ItemName"] || ""} ${row.item} ${getSubtype(base)} ${properties.map((p) => p.text).join(" ")} ${setBonuses.map((p) => p.text).join(" ")}`.toLowerCase(),
    };
  })
  .sort((a, b) => a.setName.localeCompare(b.setName) || a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name));

const payload = {
  generatedAt: new Date().toISOString(),
  source: "@blizzhackers/d2data 3.2.92777",
  section: "Sets",
  count: sets.length,
  items: sets,
};

fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(outJsFile, `window.D2_SETS = ${JSON.stringify(payload, null, 2)};\n`);
console.log(`Generated ${sets.length} set items at ${outFile}`);
console.log(`Generated browser payload at ${outJsFile}`);
