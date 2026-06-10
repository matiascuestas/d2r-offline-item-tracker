const http = require("http");
const fs = require("fs");
const path = require("path");
const d2s = require("@d2runewizard/d2s");
const stashReader = require("@d2runewizard/d2s/lib/d2/stash");

d2s.setConstantData(96, require("@d2runewizard/d2s/lib/data/versions/96_constant_data").constants);
d2s.setConstantData(99, require("@d2runewizard/d2s/lib/data/versions/99_constant_data").constants);
d2s.setConstantData(105, require("@d2runewizard/d2s/lib/data/versions/105_constant_data").constants);

const root = path.join(__dirname, "..");
const port = Number(process.env.PORT) || 5173;
const saveDir = process.env.D2R_SAVE_DIR || path.join(process.env.USERPROFILE || "", "Saved Games", "Diablo II Resurrected");
const dataRoot = path.join(root, "node_modules", "@blizzhackers", "d2data", "json");
const uniqueRows = Object.values(require(path.join(dataRoot, "uniqueitems.json")));
const setRows = Object.values(require(path.join(dataRoot, "setitems.json")));
const runewordRows = Object.values(require(path.join(dataRoot, "runes.json")));
const itemRows = require(path.join(dataRoot, "items.json"));
const baseRows = require(path.join(root, "data", "bases.json")).items;
const propertyRows = require(path.join(dataRoot, "properties.json"));
const variableStatsByUnique = buildVariableStatsByRows(uniqueRows, "index", "prop", "min", "max");
const variableStatsBySet = buildVariableStatsByRows(setRows, "index", "prop", "min", "max");
const variableStatsByRuneword = buildVariableStatsByRows(runewordRows, "*Rune Name", "T1Code", "T1Min", "T1Max");
const baseNameByCode = new Map(baseRows.map((item) => [item.code, item.name]));
const baseFamilyByCode = new Map(baseRows.map((item) => [item.code, item.family]));
const charmCodes = new Set(["cm1", "cm2", "cm3"]);
const jewelCodes = new Set(["jew", "jewl", "cjwl"]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const file = path.normalize(path.join(root, requested));
  return file.startsWith(root) ? file : null;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function locationFor(item, source) {
  const equipped = {
    1: "casco",
    2: "amuleto",
    3: "armadura",
    4: "mano derecha",
    5: "mano izquierda",
    6: "anillo derecho",
    7: "anillo izquierdo",
    8: "cinturon",
    9: "botas",
    10: "guantes",
    11: "swap mano derecha",
    12: "swap mano izquierda",
  };
  const container = {
    1: "inventario",
    4: "cubo",
    5: "alijo personal",
  };

  if (source === "Mercenario") return equipped[item.equipped_id] || "mercenario";
  if (source === "Cadaver") return "cadaver";
  if (source === "Golem") return "golem";
  if (item.location_id === 1) return equipped[item.equipped_id] || "equipado";
  if (item.location_id === 2) return "cinturon";
  if (item.location_id === 0) return container[item.alt_position_id] || "contenedor";
  if (item.location_id === 4) return "engarzado";
  return "ubicacion desconocida";
}

function buildVariableStatsByRows(rows, nameKey, propPrefix, minPrefix, maxPrefix) {
  const map = new Map();
  for (const row of rows) {
    if (!row || !row[nameKey]) continue;
    const stats = new Set();
    for (let i = 1; i <= 12; i += 1) {
      const code = row[`${propPrefix}${i}`];
      if (!code) continue;
      const min = Number(row[`${minPrefix}${i}`]);
      const max = Number(row[`${maxPrefix}${i}`]);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) continue;
      const prop = propertyRows[code] || {};
      for (let n = 1; n <= 7; n += 1) {
        if (prop[`stat${n}`]) stats.add(prop[`stat${n}`]);
      }
      stats.add(code);
    }
    map.set(row[nameKey], stats);
  }
  return map;
}

function cleanDescription(text) {
  if (!text) return null;
  return String(text).replace(/\s+/g, " ").replace("+-", "-").trim();
}

function dedupeByText(attributes) {
  const seen = new Set();
  return attributes.filter((attribute) => {
    const key = attribute.text || `${attribute.name}:${JSON.stringify(attribute.values)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function variableAttributesFor(item, kind) {
  if (kind === "base") return baseAttributesFor(item);
  const variableStats = kind === "runeword"
    ? variableStatsByRuneword.get(runewordNameFor(item)) || new Set()
    : kind === "set"
      ? variableStatsBySet.get(item.set_name) || new Set()
      : variableStatsByUnique.get(item.unique_name) || new Set();
  if (!variableStats.size) return [];

  const displayed = [
    ...(item.displayed_magic_attributes || []),
    ...(item.displayed_runeword_attributes || []),
    ...(item.displayed_combined_magic_attributes || []),
  ];

  return dedupeByText(
    displayed
      .filter((attribute) => variableStats.has(attribute.name))
      .map((attribute) => ({
        name: attribute.name,
        values: attribute.values || [],
        text: cleanDescription(attribute.description) || `${attribute.name}: ${(attribute.values || []).join("/")}`,
      }))
  );
}

function baseAttributesFor(item) {
  return dedupeByText(
    (item.displayed_magic_attributes || [])
      .map((attribute) => ({
        name: attribute.name,
        values: attribute.values || [],
        text: cleanDescription(attribute.description) || `${attribute.name}: ${(attribute.values || []).join("/")}`,
      }))
      .filter((attribute) => attribute.text)
  );
}

function qualityName(item) {
  const names = {
    1: "Low quality",
    2: "Normal",
    3: "Superior",
  };
  return names[item.quality] || null;
}

function isPlainBase(item) {
  return Boolean(
    item &&
      baseNameByCode.has(item.type) &&
      [1, 2, 3].includes(item.quality) &&
      !item.unique_name &&
      !item.set_name &&
      !item.runeword_name &&
      !item.given_runeword &&
      !item.is_ear
  );
}

function runewordNameFor(item) {
  if (!item?.runeword_name) return null;
  if (item.runeword_name !== "Hustle") return item.runeword_name;
  return baseFamilyByCode.get(item.type) === "Armaduras" ? "Hustle (armor)" : "Hustle (weapon)";
}

function readableItemName(item) {
  if (!item) return "";
  const base = item.type_name || item.type || "Item";
  let name = item.unique_name || item.set_name || item.runeword_name || "";
  if (!name && (item.rare_name || item.rare_name2)) name = `${item.rare_name || ""} ${item.rare_name2 || ""}`.trim();
  if (!name && (item.magic_prefix_name || item.magic_suffix_name)) {
    name = `${item.magic_prefix_name || ""} ${base} ${item.magic_suffix_name || ""}`.trim();
  }
  if (!name) name = base;
  if (item.ethereal) name = `Ethereal ${name}`;
  return name.replace(/\s+/g, " ").trim();
}

function socketedItemsFor(item) {
  return (item.socketed_items || []).map((socketed) => ({
    name: readableItemName(socketed),
    baseName: socketed.type_name || socketed.type || "Item",
    uniqueName: socketed.unique_name || null,
    setName: socketed.set_name || null,
    runewordName: socketed.runeword_name || null,
    ethereal: Boolean(socketed.ethereal),
    attributes: dedupeByText(
      [
        ...(socketed.displayed_magic_attributes || []),
        ...(socketed.displayed_runeword_attributes || []),
        ...(socketed.displayed_combined_magic_attributes || []),
      ]
        .map((attribute) => ({
          name: attribute.name,
          values: attribute.values || [],
          text: cleanDescription(attribute.description),
        }))
        .filter((attribute) => attribute.text)
    ),
  }));
}

function itemAttributesFor(item) {
  return dedupeByText(
    [
      ...(item.displayed_combined_magic_attributes || []),
      ...(item.displayed_magic_attributes || []),
      ...(item.displayed_runeword_attributes || []),
    ]
      .map((attribute) => ({
        name: attribute.name,
        values: attribute.values || [],
        text: cleanDescription(attribute.description) || `${attribute.name}: ${(attribute.values || []).join("/")}`,
      }))
      .filter((attribute) => attribute.text)
  );
}

function readableCharmName(item) {
  const base = item.type_name || itemRows[item.type]?.name || item.type || "Charm";
  if (item.unique_name) return item.unique_name;
  const parts = [item.magic_prefix_name, base, item.magic_suffix_name].filter(Boolean);
  return parts.length ? parts.join(" ").replace(/\s+/g, " ").trim() : base;
}

function charmInvfile(item) {
  if (item.unique_name === "Annihilus") return "invsma";
  if (item.unique_name === "Hellfire Torch") return "invtrch";
  if (item.unique_name === "Gheed's Fortune") return "invlrg";
  return itemRows[item.type]?.invfile || item.type || "invchm";
}

function charmGroupKey(item, attributes) {
  const statKey = attributes.map((attribute) => attribute.text).sort((a, b) => a.localeCompare(b)).join("|");
  return `${readableCharmName(item)}|${item.type}|${statKey}`;
}

function collectCharm(map, item, character, source, customLocation) {
  if (!item || !charmCodes.has(item.type)) return;
  const attributes = itemAttributesFor(item);
  const key = charmGroupKey(item, attributes);
  const displayName = readableCharmName(item);
  const baseName = item.type_name || itemRows[item.type]?.name || item.type;

  if (!map.has(key)) {
    const invfile = charmInvfile(item);
    map.set(key, {
      name: key,
      displayName,
      count: 0,
      locations: [],
      baseName,
      code: item.type,
      level: item.level || null,
      requiredLevel: item.required_level || 0,
      family: "Charms",
      subtype: baseName,
      tier: item.unique_name ? "Unico" : "Magico",
      width: itemRows[item.type]?.invwidth || 1,
      height: itemRows[item.type]?.invheight || 1,
      image: `assets/items/${invfile}.png`,
      invfile,
      baseStats: {},
      properties: attributes.map((attribute) => ({ text: attribute.text, variable: false })),
      setBonuses: [],
      fullSetBonuses: [],
      hasVariableStats: false,
      search: `${displayName} ${baseName} ${attributes.map((attribute) => attribute.text).join(" ")}`.toLowerCase(),
    });
  }

  const entry = map.get(key);
  entry.count += 1;
  entry.locations.push({
    character: character.name,
    class: character.class,
    level: character.level,
    file: character.file,
    source,
    location: customLocation || locationFor(item, source),
    baseName,
    quality: item.unique_name ? "Unico" : "Magico",
    ethereal: false,
    sockets: 0,
    defense: null,
    variableAttributes: attributes,
    socketedItems: [],
  });
}

function readableJewelName(item) {
  const base = item.type_name || itemRows[item.type]?.name || item.type || "Jewel";
  if (item.unique_name) return item.unique_name;
  const prefix = item.magic_prefix_name || "";
  const suffix = item.magic_suffix_name || "";
  if (prefix && suffix) return `${prefix} ${base} ${suffix}`.replace(/\s+/g, " ").trim();
  if (prefix) return `${prefix} ${base}`.replace(/\s+/g, " ").trim();
  if (suffix) return `${base} ${suffix}`.replace(/\s+/g, " ").trim();
  return base;
}

function jewelInvfile(item) {
  return itemRows[item.type]?.invfile || "invjwl";
}

function jewelGroupKey(item, attributes) {
  const statKey = attributes.map((attribute) => attribute.text).sort((a, b) => a.localeCompare(b)).join("|");
  return `${readableJewelName(item)}|${item.type}|${statKey}`;
}

function collectJewel(map, item, character, source, customLocation) {
  if (!item || !jewelCodes.has(item.type)) return;
  const attributes = itemAttributesFor(item);
  const key = jewelGroupKey(item, attributes);
  const displayName = readableJewelName(item);
  const baseName = item.type_name || itemRows[item.type]?.name || item.type;

  if (!map.has(key)) {
    const invfile = jewelInvfile(item);
    map.set(key, {
      name: key,
      displayName,
      count: 0,
      locations: [],
      baseName,
      code: item.type,
      level: item.level || null,
      requiredLevel: item.required_level || 0,
      family: "Joyas",
      subtype: baseName,
      tier: item.unique_name ? "Unico" : "Magico",
      width: itemRows[item.type]?.invwidth || 1,
      height: itemRows[item.type]?.invheight || 1,
      image: `assets/items/${invfile}.png`,
      invfile,
      baseStats: {},
      properties: attributes.map((attribute) => ({ text: attribute.text, variable: false })),
      setBonuses: [],
      fullSetBonuses: [],
      hasVariableStats: false,
      search: `${displayName} ${baseName} ${attributes.map((attribute) => attribute.text).join(" ")}`.toLowerCase(),
    });
  }

  const entry = map.get(key);
  entry.count += 1;
  entry.locations.push({
    character: character.name,
    class: character.class,
    level: character.level,
    file: character.file,
    source,
    location: customLocation || locationFor(item, source),
    baseName,
    quality: item.unique_name ? "Unico" : "Magico",
    ethereal: false,
    sockets: 0,
    defense: null,
    variableAttributes: attributes,
    socketedItems: [],
  });
}

function collectOwned(map, item, character, source, customLocation, kind) {
  if (!item) return;
  const name = kind === "base" ? baseNameByCode.get(item.type) : kind === "set" ? item.set_name : kind === "runeword" ? runewordNameFor(item) : item.unique_name;
  if (!name) return;
  if (!map.has(name)) {
    map.set(name, {
      name,
      count: 0,
      locations: [],
    });
  }

  const entry = map.get(name);
  entry.count += 1;
  entry.locations.push({
    character: character.name,
    class: character.class,
    level: character.level,
    file: character.file,
    source,
    location: customLocation || locationFor(item, source),
    baseName: item.type_name || item.type,
    quality: kind === "runeword" ? "Runeword" : qualityName(item),
    ethereal: Boolean(item.ethereal),
    sockets: item.total_nr_of_sockets || 0,
    defense: item.defense_rating || null,
    variableAttributes: variableAttributesFor(item, kind),
    socketedItems: socketedItemsFor(item),
  });
}

function collectItem(owned, item, character, source, customLocation) {
  collectOwned(owned.uniques, item, character, source, customLocation, "unique");
  collectOwned(owned.sets, item, character, source, customLocation, "set");
  collectOwned(owned.runewords, item, character, source, customLocation, "runeword");
  collectCharm(owned.charms, item, character, source, customLocation);
  collectJewel(owned.jewels, item, character, source, customLocation);
  if (isPlainBase(item)) collectOwned(owned.bases, item, character, source, customLocation, "base");
}

async function readOwnedUniques() {
  const saveFiles = await fs.promises.readdir(saveDir);
  const characterFiles = saveFiles.filter((file) => file.toLowerCase().endsWith(".d2s"));
  const stashFiles = saveFiles.filter((file) => file.toLowerCase().endsWith(".d2i"));
  const owned = {
    uniques: new Map(),
    sets: new Map(),
    bases: new Map(),
    runewords: new Map(),
    charms: new Map(),
    jewels: new Map(),
  };
  const errors = [];

  for (const file of characterFiles) {
    const fullPath = path.join(saveDir, file);
    try {
      const save = await d2s.read(await fs.promises.readFile(fullPath));
      const character = {
        name: save.header.name,
        class: save.header.class,
        level: save.header.level,
        file,
      };

      for (const item of save.items || []) collectItem(owned, item, character, "Personaje");
      for (const item of save.merc_items || []) collectItem(owned, item, character, "Mercenario");
      for (const item of save.corpse_items || []) collectItem(owned, item, character, "Cadaver");
      collectItem(owned, save.golem_item, character, "Golem");
    } catch (error) {
      errors.push({ file, message: error.message });
    }
  }

  for (const file of stashFiles) {
    const fullPath = path.join(saveDir, file);
    try {
      const stash = await stashReader.read(await fs.promises.readFile(fullPath));
      const character = {
        name: path.basename(file, path.extname(file)),
        class: "Alijo compartido",
        level: null,
        file,
      };

      (stash.pages || []).forEach((page, index) => {
        const pageName = page.name ? `pagina ${index + 1}: ${page.name}` : `pagina ${index + 1}`;
        for (const item of page.items || []) collectItem(owned, item, character, "Alijo compartido", pageName);
      });
    } catch (error) {
      errors.push({ file, message: error.message });
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    saveDir,
    characters: characterFiles.length,
    stashes: stashFiles.length,
    scannedFiles: characterFiles.length + stashFiles.length,
    uniqueKinds: owned.uniques.size,
    setKinds: owned.sets.size,
    baseKinds: owned.bases.size,
    runewordKinds: owned.runewords.size,
    charmKinds: owned.charms.size,
    jewelKinds: owned.jewels.size,
    totalUniques: [...owned.uniques.values()].reduce((sum, item) => sum + item.count, 0),
    totalSets: [...owned.sets.values()].reduce((sum, item) => sum + item.count, 0),
    totalBases: [...owned.bases.values()].reduce((sum, item) => sum + item.count, 0),
    totalRunewords: [...owned.runewords.values()].reduce((sum, item) => sum + item.count, 0),
    totalCharms: [...owned.charms.values()].reduce((sum, item) => sum + item.count, 0),
    totalJewels: [...owned.jewels.values()].reduce((sum, item) => sum + item.count, 0),
    uniques: [...owned.uniques.values()].sort((a, b) => a.name.localeCompare(b.name)),
    sets: [...owned.sets.values()].sort((a, b) => a.name.localeCompare(b.name)),
    bases: [...owned.bases.values()].sort((a, b) => a.name.localeCompare(b.name)),
    runewords: [...owned.runewords.values()].sort((a, b) => a.name.localeCompare(b.name)),
    charms: [...owned.charms.values()].sort((a, b) => a.subtype.localeCompare(b.subtype) || a.displayName.localeCompare(b.displayName)),
    jewels: [...owned.jewels.values()].sort((a, b) => a.subtype.localeCompare(b.subtype) || a.displayName.localeCompare(b.displayName)),
    items: [...owned.uniques.values()].sort((a, b) => a.name.localeCompare(b.name)),
    errors,
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname !== "/api/owned-items" && url.pathname !== "/api/owned-uniques") return false;

  try {
    sendJson(res, 200, await readOwnedUniques());
  } catch (error) {
    sendJson(res, 500, {
      error: error.message,
      saveDir,
    });
  }

  return true;
}

const server = http.createServer(async (req, res) => {
  if (await handleApi(req, res)) return;

  const file = safePath(req.url || "/");
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "content-type": types[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`D2R item web running at http://localhost:${port}`);
});
