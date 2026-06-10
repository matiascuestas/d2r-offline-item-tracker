const datasets = {
  unique: {
    label: "Unicos",
    ownedLabel: "unicos",
    lead: "Items unicos con base, niveles, imagen, estadisticas y rolls.",
    payload: window.D2_UNIQUES || { items: [], source: "Sin datos" },
  },
  set: {
    label: "Sets",
    ownedLabel: "sets",
    lead: "Piezas de set con base, niveles, imagen, bonuses de set y rolls.",
    payload: window.D2_SETS || { items: [], source: "Sin datos" },
  },
  base: {
    label: "Bases",
    ownedLabel: "bases",
    lead: "Items blancos/pelados equipables: armas y armaduras base para buscar, filtrar y comparar.",
    payload: window.D2_BASES || { items: [], source: "Sin datos" },
  },
  runeword: {
    label: "Runewords",
    ownedLabel: "runewords",
    lead: "Runewords con runas requeridas, sockets, bases permitidas, disponibilidad y rolls.",
    payload: window.D2_RUNEWORDS || { items: [], source: "Sin datos" },
  },
  charm: {
    label: "Charms",
    ownedLabel: "charms",
    lead: "Charms encontrados en tus personajes y alijos, agrupados por nombre y stats exactas.",
    payload: { items: [], source: "Saves locales" },
  },
  jewel: {
    label: "Jewels",
    ownedLabel: "jewels",
    lead: "Jewels encontrados en tus personajes y alijos, agrupados por nombre y stats exactas.",
    payload: { items: [], source: "Saves locales" },
  },
};

const els = {
  total: document.querySelector("#total-count"),
  totalLabel: document.querySelector("#total-label"),
  sectionLead: document.querySelector("#section-lead"),
  visible: document.querySelector("#visible-count"),
  source: document.querySelector("#source"),
  tabs: document.querySelectorAll(".section-tab[data-section]"),
  search: document.querySelector("#search"),
  family: document.querySelector("#family-filter"),
  subtype: document.querySelector("#subtype-filter"),
  tier: document.querySelector("#tier-filter"),
  property: document.querySelector("#property-filter"),
  ownedFilter: document.querySelector("#owned-filter"),
  charmTypeLabel: document.querySelector("#charm-type-label"),
  charmType: document.querySelector("#charm-type-filter"),
  jewelTypeLabel: document.querySelector("#jewel-type-label"),
  jewelType: document.querySelector("#jewel-type-filter"),
  sort: document.querySelector("#sort-filter"),
  sortDirection: document.querySelector("#sort-direction"),
  variable: document.querySelector("#variable-filter"),
  refreshOwned: document.querySelector("#refresh-owned"),
  ownedStatus: document.querySelector("#owned-status"),
  ownedDetail: document.querySelector("#owned-detail"),
  ownedTitle: document.querySelector("#owned-title"),
  ownedSubtitle: document.querySelector("#owned-subtitle"),
  ownedList: document.querySelector("#owned-list"),
  ownedClose: document.querySelector("#owned-close"),
  grid: document.querySelector("#items"),
  template: document.querySelector("#item-template"),
};

const state = {
  section: "unique",
  search: "",
  family: "all",
  subtype: "all",
  tier: "all",
  property: "all",
  ownedFilter: "all",
  charmType: "all",
  jewelType: "all",
  sort: "requiredLevel",
  sortDirection: "asc",
  variableOnly: false,
};

let ownedByName = new Map();
let ownedPayload = null;

const propertyFilters = [
  { value: "strength", label: "Fuerza", terms: ["strength", "fuerza"], codes: ["str", "all-stats"] },
  { value: "dexterity", label: "Destreza", terms: ["dexterity", "destreza"], codes: ["dex", "all-stats"] },
  { value: "life", label: "Vida", terms: ["to life", "maximum life", "life", "vida"], codes: ["hp", "hp%", "maxhp", "regen"] },
  { value: "mana", label: "Mana", terms: ["to mana", "maximum mana", "mana"], codes: ["mana", "mana%", "regen-mana"] },
  { value: "fcr", label: "FCR", terms: ["faster cast rate", "fast cast rate"], codes: ["cast1", "cast2"] },
  { value: "ias", label: "IAS", terms: ["increased attack speed", "attack speed"], codes: ["swing1", "swing2", "swing3"] },
  { value: "fhr", label: "FHR", terms: ["faster hit recovery", "hit recovery"], codes: ["balance1", "balance2", "balance3"] },
  { value: "frw", label: "FRW", terms: ["faster run/walk", "faster run", "run/walk", "walk/run"], codes: ["move1", "move2", "move3"] },
  { value: "res-all", label: "Todas resistencias", terms: ["all resistances", "all res", "resist all"], codes: ["res-all"] },
  { value: "res-fire", label: "Res. fuego", terms: ["fire resist"], codes: ["res-fire", "fireresist"] },
  { value: "res-cold", label: "Res. frio", terms: ["cold resist"], codes: ["res-cold", "coldresist"] },
  { value: "res-light", label: "Res. rayo", terms: ["lightning resist"], codes: ["res-ltng", "lightresist"] },
  { value: "res-poison", label: "Res. veneno", terms: ["poison resist"], codes: ["res-pois", "poisonresist"] },
  { value: "magic-find", label: "Magic find", terms: ["magic find", "better chance of getting magic items"], codes: ["mag%"] },
  { value: "gold-find", label: "Extra gold", terms: ["extra gold"], codes: ["gold%", "item_goldbonus"] },
  { value: "skills", label: "Skills", terms: ["to all skills", "skill levels", "skills", "skill"], codes: ["allskills", "skill", "skilltab", "oskill"] },
  { value: "damage", label: "Daño", terms: ["damage", "enhanced damage"], codes: ["dmg", "dmg%", "dmg-min", "dmg-max", "dmg-norm", "dmg-to-mana"] },
  { value: "attack-rating", label: "Attack rating", terms: ["attack rating"], codes: ["att", "att%", "tohit"] },
  { value: "defense", label: "Defensa", terms: ["defense"], codes: ["ac", "ac%"] },
  { value: "life-leech", label: "Life leech", terms: ["life stolen", "life steal"], codes: ["lifesteal"] },
  { value: "mana-leech", label: "Mana leech", terms: ["mana stolen", "mana steal"], codes: ["manasteal"] },
  { value: "crushing", label: "Crushing blow", terms: ["crushing blow"], codes: ["crush"] },
  { value: "deadly", label: "Deadly strike", terms: ["deadly strike"], codes: ["deadly"] },
  { value: "open-wounds", label: "Open wounds", terms: ["open wounds"], codes: ["openwounds"] },
  { value: "cannot-freeze", label: "Cannot be frozen", terms: ["cannot be frozen"], codes: ["nofreeze"] },
  { value: "sockets", label: "Sockets", terms: ["sockets", "socketed"], codes: ["sock"] },
];

function baseItems() {
  return datasets.base.payload.items || [];
}

function baseItemFor(item) {
  if (!item || state.section === "base" || state.section === "charm" || state.section === "jewel") return null;
  return baseItems().find((base) => base.code === item.code || base.name === item.baseName) || null;
}

function currentDataset() {
  return datasets[state.section] || datasets.unique;
}

function currentPayload() {
  return currentDataset().payload;
}

function currentItems() {
  if (state.section === "charm") return ownedPayload?.charms || [];
  if (state.section === "jewel") return ownedPayload?.jewels || [];
  return currentPayload().items || [];
}

function currentOwnedItems() {
  if (!ownedPayload) return [];
  if (state.section === "base") return ownedPayload.bases || [];
  if (state.section === "set") return ownedPayload.sets || [];
  if (state.section === "runeword") return ownedPayload.runewords || [];
  if (state.section === "charm") return ownedPayload.charms || [];
  if (state.section === "jewel") return ownedPayload.jewels || [];
  return ownedPayload.uniques || ownedPayload.items || [];
}

function currentOwnedTotal() {
  if (!ownedPayload) return 0;
  if (state.section === "base") return ownedPayload.totalBases || 0;
  if (state.section === "set") return ownedPayload.totalSets || 0;
  if (state.section === "runeword") return ownedPayload.totalRunewords || 0;
  if (state.section === "charm") return ownedPayload.totalCharms || 0;
  if (state.section === "jewel") return ownedPayload.totalJewels || 0;
  return ownedPayload.totalUniques || 0;
}

function rebuildOwnedMap() {
  ownedByName = new Map(currentOwnedItems().map((item) => [item.name, item]));
}

function uniqueValues(key) {
  return [...new Set(currentItems().map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function subtypeValues() {
  const items = currentItems();
  const scoped = state.family === "all" ? items : items.filter((item) => item.family === state.family);
  return [...new Set(scoped.map((item) => item.subtype).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, label, values) {
  select.innerHTML = "";
  select.append(new Option(label, "all"));
  values.forEach((value) => select.append(new Option(value, value)));
}

function fillPropertySelect() {
  els.property.innerHTML = "";
  els.property.append(new Option("Todas", "all"));
  propertyFilters.forEach((filter) => els.property.append(new Option(filter.label, filter.value)));
}

function itemPropertyHaystack(item) {
  const props = [
    ...(item.properties || []),
    ...(item.setBonuses || []),
    ...(item.fullSetBonuses || []),
  ];
  return props
    .flatMap((prop) => [prop.code, prop.text, prop.name])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesPropertyFilter(item) {
  if (state.property === "all") return true;
  const filter = propertyFilters.find((entry) => entry.value === state.property);
  if (!filter) return true;
  const haystack = itemPropertyHaystack(item);
  return filter.codes.some((code) => haystack.includes(code.toLowerCase())) || filter.terms.some((term) => haystack.includes(term.toLowerCase()));
}

function statRows(item) {
  const stats = item.baseStats || {};
  return [
    ["Nivel", item.level],
    ["Req. nivel", item.requiredLevel],
    ["Danio 1 mano", stats.oneHandDamage],
    ["Danio 2 manos", stats.twoHandDamage],
    ["Danio arroj.", stats.throwDamage],
    ["Defensa", stats.defense],
    ["Durabilidad", stats.durability],
    ["Req. fuerza", stats.requiredStrength],
    ["Req. destreza", stats.requiredDexterity],
    ["Sockets", stats.maxSockets || null],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
}

function initials(item) {
  return item.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function itemSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function localImageCandidates(invfile) {
  if (!invfile) return [];
  return ["png", "gif", "webp", "jpg", "jpeg"].map((ext) => `assets/items/${invfile}.${ext}`);
}

function externalImageCandidates(name) {
  const slug = itemSlug(name);
  return [
    `https://diablo2.io/styles/zulu/theme/images/items/${slug}_icon.png`,
    `https://diablo2.io/styles/zulu/theme/images/items/${slug}_graphic.png`,
  ];
}

const runeImageNames = {
  El: "runeEl",
  Eld: "runeEld",
  Tir: "runeTir",
  Nef: "runeNef",
  Eth: "runeEth",
  Ith: "runeIth",
  Tal: "runeTal",
  Ral: "runeRal",
  Ort: "runeOrt",
  Thul: "runeThul",
  Amn: "runeAmn",
  Sol: "runeSol",
  Shael: "runeShae",
  Dol: "runeDol",
  Hel: "runeHel",
  Io: "runeIo",
  Lum: "runeLum",
  Ko: "runeKo",
  Fal: "runeFal",
  Lem: "runeLem",
  Pul: "runePul",
  Um: "runeUm",
  Mal: "runeMal",
  Ist: "runeIst",
  Gul: "runeGul",
  Vex: "runeVex",
  Ohm: "runeOhm",
  Lo: "runeLo",
  Sur: "runeSur",
  Ber: "runeBer",
  Jah: "runeJo",
  Cham: "runeCham",
  Zod: "runeZod",
};

function runeImageCandidates(rune) {
  const slug = itemSlug(`${rune.name} Rune`);
  const runeImageName = runeImageNames[rune.name];
  return [
    ...["png", "gif", "webp", "jpg", "jpeg"].map((ext) => `assets/items/${rune.invfile}.${ext}`),
    ...(runeImageName ? [`https://diablo2.io/styles/zulu/theme/images/items/${runeImageName}_graphic.png`] : []),
    `https://diablo2.io/styles/zulu/theme/images/items/${slug}_icon.png`,
    `https://diablo2.io/styles/zulu/theme/images/items/${slug}_graphic.png`,
  ];
}

function renderRuneStrip(item) {
  if (state.section !== "runeword" || !item.runes?.length) return null;

  const strip = document.createElement("div");
  strip.className = "rune-strip";
  strip.setAttribute("aria-label", `Runas: ${item.runes.map((rune) => rune.name).join(", ")}`);

  item.runes.forEach((rune, index) => {
    if (index > 0) {
      const separator = document.createElement("span");
      separator.className = "rune-separator";
      separator.setAttribute("aria-hidden", "true");
      strip.append(separator);
    }

    const runeNode = document.createElement("span");
    runeNode.className = "rune-chip";

    const art = document.createElement("span");
    art.className = "rune-art";

    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";

    const fallback = document.createElement("span");
    fallback.className = "rune-art__fallback";
    fallback.textContent = rune.name.slice(0, 2).toUpperCase();

    const candidates = runeImageCandidates(rune);
    let imageIndex = 0;
    img.src = candidates[imageIndex];
    img.addEventListener("error", () => {
      imageIndex += 1;
      if (imageIndex < candidates.length) {
        img.src = candidates[imageIndex];
        return;
      }
      art.classList.add("is-missing");
    });

    const name = document.createElement("span");
    name.className = "rune-name";
    name.textContent = rune.name;

    art.append(img, fallback);
    runeNode.append(art, name);
    strip.append(runeNode);
  });

  return strip;
}

function navigateToBase(baseItem) {
  state.section = "base";
  state.search = baseItem.name;
  state.family = "all";
  state.subtype = "all";
  state.tier = "all";
  state.ownedFilter = "all";
  state.variableOnly = false;
  els.search.value = state.search;
  els.variable.checked = false;
  els.ownedDetail.hidden = true;
  els.tabs.forEach((button) => button.classList.toggle("section-tab--active", button.dataset.section === "base"));
  rebuildOwnedMap();
  updateControls();
  render();
  els.grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCard(item) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  const art = node.querySelector(".item-art");
  const img = node.querySelector("img");
  const fallback = node.querySelector(".item-art__fallback");
  const base = node.querySelector(".item-card__base");
  const title = node.querySelector("h2");
  const badges = node.querySelector(".badges");
  const baseStats = node.querySelector(".base-stats");
  const props = node.querySelector(".props");
  const owned = ownedByName.get(item.name);
  const baseItem = baseItemFor(item);
  const displayName = item.displayName || item.name;
  if (item.height >= 3) art.classList.add("item-art--tall");
  else if (item.height === 2) art.classList.add("item-art--medium");

  img.alt = displayName;
  const override = window.D2_IMAGE_OVERRIDES?.[displayName] || window.D2_IMAGE_OVERRIDES?.[item.name] || window.D2_IMAGE_OVERRIDES?.[item.baseName];
  const overrides = Array.isArray(override) ? override : override ? [override] : [];
  const baseOverride = baseItem ? window.D2_IMAGE_OVERRIDES?.[baseItem.name] : null;
  const baseOverrides = Array.isArray(baseOverride) ? baseOverride : baseOverride ? [baseOverride] : [];
  const imageCandidates = [
    ...localImageCandidates(item.invfile),
    ...overrides,
    ...externalImageCandidates(displayName),
    ...(item.baseName ? externalImageCandidates(item.baseName) : []),
    ...localImageCandidates(baseItem?.invfile),
    ...baseOverrides,
    ...(baseItem ? externalImageCandidates(baseItem.name) : []),
  ];
  let imageIndex = 0;
  img.src = imageCandidates[imageIndex];
  img.addEventListener("error", () => {
    imageIndex += 1;
    if (imageIndex < imageCandidates.length) {
      img.src = imageCandidates[imageIndex];
      return;
    }
    art.classList.add("is-missing");
  });
  fallback.textContent = `${initials({ name: displayName })}\n${item.invfile}`;

  base.textContent = "";
  if (baseItem) {
    const baseButton = document.createElement("button");
    baseButton.className = "item-card__base-button";
    baseButton.type = "button";
    baseButton.textContent = `${item.baseName} - ${item.code}`;
    baseButton.title = `Ver base: ${baseItem.name}`;
    baseButton.addEventListener("click", (event) => {
      event.stopPropagation();
      navigateToBase(baseItem);
    });
    base.append(baseButton);
  } else {
    base.textContent = `${item.baseName} - ${item.code}`;
  }
  title.textContent = displayName;

  [item.setName, item.family, item.subtype, item.tier, `qlvl ${item.level ?? "?"}`, `req ${item.requiredLevel ?? "-"}`].filter(Boolean).forEach((text) => {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = text;
    badges.append(badge);
  });

  if (item.hasVariableStats) {
    const badge = document.createElement("span");
    badge.className = "badge badge--variable";
    badge.textContent = "rolls variables";
    badges.append(badge);
  }

  if (owned) {
    const badge = document.createElement("span");
    badge.className = "badge badge--owned";
    badge.textContent = `${owned.count} disponibles`;
    badges.append(badge);

    node.classList.add("item-card--owned");
    node.tabIndex = 0;
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", `Ver ubicaciones de ${displayName}`);
    node.addEventListener("click", () => showOwnedDetails(item));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showOwnedDetails(item);
      }
    });
  }

  const runeStrip = renderRuneStrip(item);
  if (runeStrip) node.insertBefore(runeStrip, baseStats);

  statRows(item).forEach(([key, value]) => {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = key;
    dd.textContent = value;
    row.append(dt, dd);
    baseStats.append(row);
  });

  item.properties
    .filter((prop) => !(state.section === "runeword" && prop.text.startsWith("Runas:")))
    .forEach((prop) => {
    const li = document.createElement("li");
    li.textContent = prop.text;
    if (prop.variable) li.classList.add("variable");
    props.append(li);
  });

  if (item.setBonuses?.length) {
    const header = document.createElement("li");
    header.className = "props__header";
    header.textContent = "Bonos parciales";
    props.append(header);
    item.setBonuses.forEach((prop) => {
      const li = document.createElement("li");
      li.textContent = prop.text;
      if (prop.variable) li.classList.add("variable");
      props.append(li);
    });
  }

  if (item.fullSetBonuses?.length) {
    const header = document.createElement("li");
    header.className = "props__header";
    header.textContent = "Set completo";
    props.append(header);
    item.fullSetBonuses.forEach((prop) => {
      const li = document.createElement("li");
      li.textContent = prop.text;
      if (prop.variable) li.classList.add("variable");
      props.append(li);
    });
  }

  return node;
}

function describeOwnedLocation(location) {
  const owner = location.level === null || location.level === undefined
    ? `${location.character} (${location.class})`
    : `${location.character} (${location.class} nivel ${location.level})`;
  const parts = [
    owner,
    location.source,
    location.location,
    location.baseName,
    location.quality,
  ];
  if (location.ethereal) parts.push("ethereal");
  if (location.sockets) parts.push(`${location.sockets} sockets`);
  return parts.filter(Boolean).join(" - ");
}

function appendDetailGroup(parent, title, values) {
  if (!values.length) return;
  const group = document.createElement("div");
  group.className = "owned-copy__group";

  const label = document.createElement("strong");
  label.textContent = title;
  group.append(label);

  const list = document.createElement("ul");
  values.forEach((value) => {
    const li = document.createElement("li");
    li.textContent = value;
    list.append(li);
  });
  group.append(list);
  parent.append(group);
}

function socketText(socketedItem) {
  const attrs = (socketedItem.attributes || []).map((attr) => attr.text).filter(Boolean);
  return attrs.length ? `${socketedItem.name}: ${attrs.join("; ")}` : socketedItem.name;
}

function renderOwnedCopy(location) {
  const li = document.createElement("li");
  li.className = "owned-copy";

  const title = document.createElement("div");
  title.className = "owned-copy__title";
  title.textContent = describeOwnedLocation(location);
  li.append(title);

  const rolled = [];
  if (location.defense) rolled.push(`Defensa actual: ${location.defense}`);
  rolled.push(...(location.variableAttributes || []).map((attr) => attr.text));
  appendDetailGroup(li, "Rolls variables", rolled);

  const socketed = (location.socketedItems || []).map(socketText);
  if (location.sockets > socketed.length) {
    socketed.push(`${location.sockets - socketed.length} socket(s) vacio(s)`);
  }
  appendDetailGroup(li, "Engarzado", socketed);

  if (!rolled.length && !socketed.length) {
    const empty = document.createElement("p");
    empty.className = "owned-copy__empty";
    empty.textContent = "Sin rolls variables detectados ni sockets engarzados.";
    li.append(empty);
  }

  return li;
}

function showOwnedDetails(item) {
  const owned = ownedByName.get(item.name);
  if (!owned) return;
  const displayName = item.displayName || item.name;

  els.ownedTitle.textContent = displayName;
  els.ownedSubtitle.textContent = `${owned.count} disponibles encontrados en ${ownedPayload?.characters || 0} personajes y ${ownedPayload?.stashes || 0} alijos escaneados.`;
  els.ownedList.innerHTML = "";

  owned.locations
    .slice()
    .sort((a, b) => a.character.localeCompare(b.character) || a.source.localeCompare(b.source) || a.location.localeCompare(b.location))
    .forEach((location) => {
      els.ownedList.append(renderOwnedCopy(location));
    });

  els.ownedDetail.hidden = false;
  els.ownedDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function refreshOwned() {
  els.refreshOwned.disabled = true;
  els.refreshOwned.textContent = "Leyendo saves...";
  els.ownedStatus.textContent = "Escaneando personajes...";

  try {
    const response = await fetch("/api/owned-items", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    ownedPayload = await response.json();
    rebuildOwnedMap();
    const total = currentOwnedTotal();
    els.ownedStatus.textContent = `${total} ${currentDataset().ownedLabel} en ${ownedPayload.characters} personajes y ${ownedPayload.stashes || 0} alijos`;
    if (ownedPayload.errors?.length) {
      els.ownedStatus.textContent += ` (${ownedPayload.errors.length} errores)`;
    }
    render();
  } catch (error) {
    els.ownedStatus.textContent = "No pude leer saves. Inicia con npm run start.";
    console.error(error);
  } finally {
    els.refreshOwned.disabled = false;
    els.refreshOwned.textContent = "Refrescar saves";
  }
}

function filteredItems() {
  const term = state.search.trim().toLowerCase();
  const filtered = currentItems().filter((item) => {
    if (state.section === "charm" && state.charmType !== "all") {
      if (state.charmType === "unique" && item.tier !== "Unico") return false;
      if (state.charmType === "small" && item.code !== "cm1") return false;
      if (state.charmType === "medium" && item.code !== "cm2") return false;
      if (state.charmType === "grand" && item.code !== "cm3") return false;
    }
    if (state.section === "jewel" && state.jewelType !== "all") {
      if (state.jewelType === "unique" && item.tier !== "Unico") return false;
      if (state.jewelType === "jewel" && item.code !== "jew") return false;
    }
    if (state.family !== "all" && item.family !== state.family) return false;
    if (state.subtype !== "all" && item.subtype !== state.subtype) return false;
    if (state.tier !== "all" && item.tier !== state.tier) return false;
    if (!matchesPropertyFilter(item)) return false;
    if (state.variableOnly && !item.hasVariableStats) return false;
    if (ownedPayload && state.ownedFilter === "owned" && !ownedByName.has(item.name)) return false;
    if (ownedPayload && state.ownedFilter === "missing" && ownedByName.has(item.name)) return false;
    if (term && !item.search.includes(term)) return false;
    return true;
  });

  return filtered.sort(compareItems);
}

function compareNumeric(a, b) {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return state.sortDirection === "desc" ? Number(b) - Number(a) : Number(a) - Number(b);
}

function compareString(a, b) {
  return state.sortDirection === "desc" ? b.localeCompare(a) : a.localeCompare(b);
}

function compareItems(a, b) {
  const aName = a.displayName || a.name;
  const bName = b.displayName || b.name;
  if (state.sort === "name") return compareString(aName, bName);
  if (state.sort === "level") return compareNumeric(a.level, b.level) || aName.localeCompare(bName);
  if (state.sort === "ownedCount") {
    return compareNumeric(ownedByName.get(a.name)?.count || 0, ownedByName.get(b.name)?.count || 0) || aName.localeCompare(bName);
  }
  return compareNumeric(a.requiredLevel, b.requiredLevel) || compareNumeric(a.level, b.level) || aName.localeCompare(bName);
}

function render() {
  const result = filteredItems();
  els.visible.textContent = result.length;
  els.grid.innerHTML = "";

  if (!result.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = `No hay ${currentDataset().label.toLowerCase()} que coincidan con los filtros.`;
    els.grid.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  result.forEach((item) => fragment.append(renderCard(item)));
  els.grid.append(fragment);
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.section = tab.dataset.section;
      state.family = "all";
      state.subtype = "all";
      state.tier = "all";
      state.property = "all";
      state.charmType = "all";
      state.jewelType = "all";
      if (state.section === "charm") state.ownedFilter = "all";
      els.ownedDetail.hidden = true;
      els.tabs.forEach((button) => button.classList.toggle("section-tab--active", button === tab));
      rebuildOwnedMap();
      updateControls();
      render();
    });
  });

  els.search.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });
  els.family.addEventListener("change", (event) => {
    state.family = event.target.value;
    state.subtype = "all";
    fillSelect(els.subtype, "Todos", subtypeValues());
    render();
  });
  els.subtype.addEventListener("change", (event) => {
    state.subtype = event.target.value;
    render();
  });
  els.tier.addEventListener("change", (event) => {
    state.tier = event.target.value;
    render();
  });
  els.property.addEventListener("change", (event) => {
    state.property = event.target.value;
    render();
  });
  els.ownedFilter.addEventListener("change", (event) => {
    state.ownedFilter = event.target.value;
    if (!ownedPayload && state.ownedFilter !== "all") {
      els.ownedStatus.textContent = "Primero usa Refrescar saves para filtrar tenencia.";
    }
    render();
  });
  els.charmType.addEventListener("change", (event) => {
    state.charmType = event.target.value;
    render();
  });
  els.jewelType.addEventListener("change", (event) => {
    state.jewelType = event.target.value;
    render();
  });
  els.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
  els.sortDirection.addEventListener("change", (event) => {
    state.sortDirection = event.target.value;
    render();
  });
  els.variable.addEventListener("change", (event) => {
    state.variableOnly = event.target.checked;
    render();
  });
  els.refreshOwned.addEventListener("click", refreshOwned);
  els.ownedClose.addEventListener("click", () => {
    els.ownedDetail.hidden = true;
  });
}

function init() {
  updateControls();
  bindEvents();
  render();
}

function updateControls() {
  const dataset = currentDataset();
  const payload = currentPayload();
  els.total.textContent = currentItems().length;
  els.totalLabel.textContent = `${dataset.label.toLowerCase()} cargados`;
  els.sectionLead.textContent = dataset.lead;
  els.source.textContent = payload.source || "Datos locales";
  if (state.section === "charm" && !ownedPayload) {
    els.ownedStatus.textContent = "Usa Refrescar saves para cargar tus charms.";
  }
  els.family.value = "all";
  els.subtype.value = "all";
  els.tier.value = "all";
  els.property.value = state.property;
  els.ownedFilter.value = state.ownedFilter;
  els.charmType.value = state.charmType;
  els.charmTypeLabel.hidden = state.section !== "charm";
  els.jewelType.value = state.jewelType;
  els.jewelTypeLabel.hidden = state.section !== "jewel";
  els.sort.value = state.sort;
  els.sortDirection.value = state.sortDirection;
  fillSelect(els.family, "Todas", uniqueValues("family"));
  fillSelect(els.subtype, "Todos", subtypeValues());
  fillSelect(els.tier, "Todos", uniqueValues("tier"));
  fillPropertySelect();
  els.property.value = state.property;
  if (ownedPayload) {
    const total = currentOwnedTotal();
    els.ownedStatus.textContent = `${total} ${dataset.ownedLabel} en ${ownedPayload.characters} personajes y ${ownedPayload.stashes || 0} alijos`;
  }
}

init();
