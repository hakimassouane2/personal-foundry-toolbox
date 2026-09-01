/**
 * Générateur de menu de taverne
 * -----------------------------
 * Produit une carte complète (vins, bières, eaux-de-vie, entrées, plats,
 * desserts) à partir d'un seul réglage : le standing de l'établissement, de
 * miteux à aristocratique. Ce curseur décide de tout, du vocabulaire employé
 * au prix affiché en passant par la probabilité qu'un plat soit avarié.
 *
 * L'inspiration vient du générateur de tavernes de The Copper Sanctum. Seul le
 * modèle a été repris : ses tables sont anglaises et son assemblage se réduit à
 * une concaténation de chaînes, ce qui ne survit pas au passage au français
 * (voir `grammar.mjs`). Le vocabulaire a donc été réécrit, et les desserts,
 * absents de l'original, ajoutés.
 *
 * Le panneau vise une chose : donner une carte utilisable en moins d'une
 * seconde. La fenêtre génère dès l'ouverture, un clic sur un titre de section
 * la relance seule, un clic sur une ligne relance cette ligne seule.
 */

import {
  agree, at, cap, chance, def, noun, of, pick, pickMany, randInt, sentence
} from "./grammar.mjs";
import {
  BEER, DEFECTS, DESSERT, HAZARDS, MAIN, SPIRIT, STANDINGS, STARTER, WINE
} from "./tavern-menu-data.mjs";

const localize = (key, data) =>
  data ? game.i18n.format(`PERSONAL_TOOLBOX.Generators.TavernMenu.${key}`, data)
       : game.i18n.localize(`PERSONAL_TOOLBOX.Generators.TavernMenu.${key}`);

/* -------------------------------------------- */
/*  Prix                                         */
/* -------------------------------------------- */

/** Prix de base d'une ligne, en pièces de cuivre, avant standing. */
const BASE_PRICE = {
  wines: 6, beers: 3, spirits: 9, starters: 6, mains: 14, desserts: 5
};

/**
 * Calcule le prix d'une ligne. Une variation aléatoire de l'ordre de 20 %
 * évite que toutes les lignes d'une section affichent le même montant, ce qui
 * trahirait immédiatement la génération automatique.
 * @param {string} sectionId
 * @param {number} standing   Index dans `STANDINGS`.
 * @param {number} [rank=1]   Renchérissement lié au prestige de l'ingrédient.
 * @returns {number} Un montant en pièces de cuivre, au moins 1.
 */
function priceOf(sectionId, standing, rank = 1) {
  const raw = BASE_PRICE[sectionId] * STANDINGS[standing].price * rank * (0.85 + Math.random() * 0.35);
  return Math.max(1, Math.round(raw));
}

/**
 * Met un montant en cuivre sous forme lisible (1 po = 10 pa = 100 pc). Les
 * pièces de cuivre disparaissent dès qu'il y a de l'or : à ce niveau de prix,
 * personne ne compte la monnaie.
 * @param {number} cp
 * @returns {string}
 */
export function formatPrice(cp) {
  const po = Math.floor(cp / 100);
  const pa = Math.floor((cp % 100) / 10);
  const pc = cp % 10;

  const parts = [];
  if (po) parts.push(`${po} po`);
  if (pa) parts.push(`${pa} pa`);
  if (pc && !po) parts.push(`${pc} pc`);
  return parts.join(" ") || "1 pc";
}

/* -------------------------------------------- */
/*  Fabriques de lignes                          */
/* -------------------------------------------- */

/**
 * Choisit entre le vocabulaire flatteur et le vocabulaire honteux selon le
 * standing. C'est ce tirage, répété à chaque ligne, qui fait qu'une taverne
 * miteuse sert quand même parfois quelque chose de correct.
 * @param {number} standing
 * @param {Array} good
 * @param {Array} bad
 * @returns {Array} La table dans laquelle piocher.
 */
function tableFor(standing, good, bad) {
  return chance(STANDINGS[standing].good) ? good : bad;
}

/**
 * @typedef {object} MenuItem
 * @property {string}  name    Intitulé de la ligne.
 * @property {string}  desc    Description courte, style carte de restaurant.
 * @property {number}  price   Prix en pièces de cuivre.
 * @property {string}  [unit]  Contenance servie, pour les boissons.
 * @property {string}  [warn]  Avarie ou coup fourré attaché à la ligne.
 * @property {boolean} [special] Spécialité de la maison.
 */

/**
 * Un vin : la couleur porte le nom, l'origine le situe, deux adjectifs et deux
 * arômes le décrivent.
 * @param {number} standing
 * @returns {MenuItem}
 */
function buildWine(standing) {
  const color = noun(pick(WINE.colors));
  const [adj1, adj2] = pickMany(tableFor(standing, WINE.adjGood, WINE.adjBad), 2);
  const isRed = color.s === "rouge" || color.s === "clairet";
  const [note1, note2] = pickMany(isRed ? WINE.notesRed : WINE.notesWhite, 2).map(noun);

  return {
    name: cap(`${color.s} ${pick(WINE.origins)}`),
    desc: sentence(
      `${agree(adj1, color)} et ${agree(adj2, color)}`,
      `sur ${def(note1)} et ${def(note2)}`
    ),
    // Pas de clé propre : deux rouges d'origines différentes sur la même carte
    // sont normaux, c'est l'intitulé complet qui doit rester unique.
    unit: pick(WINE.units),
    price: priceOf("wines", standing)
  };
}

/**
 * Une bière ou un cidre : type, provenance, texture, arômes, finale.
 * @param {number} standing
 * @returns {MenuItem}
 */
function buildBeer(standing) {
  const type = noun(pick(BEER.types));
  const adj = pick(tableFor(standing, BEER.adjGood, BEER.adjBad));
  const [note1, note2] = pickMany(BEER.notes, 2).map(noun);

  return {
    name: cap(`${type.s} ${pick(BEER.origins)}`),
    desc: sentence(
      agree(adj, type),
      `notes ${of(note1)} et ${of(note2)}`,
      pick(BEER.finishes)
    ),
    unit: pick(["la chope", "le pot", "la pinte", "le godet"]),
    price: priceOf("beers", standing),
    keys: [type.s]
  };
}

/**
 * Une eau-de-vie : c'est surtout la façon de la servir qui la caractérise.
 * @param {number} standing
 * @returns {MenuItem}
 */
function buildSpirit(standing) {
  const type = noun(pick(SPIRIT.types));
  const adj = pick(tableFor(standing, SPIRIT.adjGood, SPIRIT.adjBad));

  return {
    name: cap(type.s),
    desc: sentence(agree(adj, type), agree(pick(SPIRIT.serving), type)),
    unit: pick(["le verre", "la mesure", "le dé", "la rasade"]),
    price: priceOf("spirits", standing),
    keys: [type.s]
  };
}

/**
 * Une entrée, tirée au sort parmi trois familles : froide, soupe, crudités.
 * Le mélange des trois est ce qui donne à la section son air de vraie carte.
 * @param {number} standing
 * @returns {MenuItem}
 */
function buildStarter(standing) {
  const kind = pick(["cold", "cold", "soup", "soup", "salad"]);
  const price = priceOf("starters", standing);

  if (kind === "soup") {
    const type = noun(pick(STARTER.soupTypes));
    const base = noun(pick(STARTER.soupBases));
    const adj = pick(tableFor(standing, STARTER.brothGood, STARTER.brothBad));
    return {
      name: cap(`${type.s} ${of(base)}`),
      desc: sentence(agree(adj, type), pick(STARTER.soupGarnish)),
      price,
      keys: [type.s, base.s]
    };
  }

  if (kind === "salad") {
    const base = noun(pick(STARTER.saladBases));
    const dressing = noun(pick(STARTER.saladDressings));
    const [note1, note2] = pickMany(STARTER.coldNotes, 2);
    return {
      name: cap(`${base.s} ${at(dressing)}`),
      desc: sentence(agree(note1, base), agree(note2, base)),
      price,
      keys: [base.s]
    };
  }

  const item = noun(pick(STARTER.cold));
  const [note1, note2] = pickMany(STARTER.coldNotes, 2);
  return {
    name: cap(item.s),
    desc: sentence(agree(note1, item), agree(note2, item)),
    price,
    keys: [item.s]
  };
}

/**
 * Choisit une viande dans l'un des trois viviers selon le standing. Renvoie
 * aussi le prestige, qui renchérit le plat : du chevreuil ne coûte pas le prix
 * des tripes, même dans la même auberge.
 * @param {number} standing
 * @returns {{meat: import("./grammar.mjs").Noun, rank: number}}
 */
function pickMeat(standing) {
  const weights = [
    [80, 20, 0], [50, 45, 5], [20, 65, 15],
    [5, 60, 35], [0, 35, 65], [0, 15, 85]
  ][standing];

  const pools = [MAIN.meatsPoor, MAIN.meatsCommon, MAIN.meatsFine];
  let roll = Math.random() * 100;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return { meat: noun(pick(pools[i])), rank: i };
  }
  return { meat: noun(pick(MAIN.meatsCommon)), rank: 1 };
}

/**
 * Un plat : viande + cuisson pour le nom, sauce et garnitures pour la ligne du
 * dessous. Le style est celui d'une carte, sans verbe ni article superflu.
 * @param {number} standing
 * @returns {MenuItem}
 */
function buildMain(standing) {
  const { meat, rank } = pickMeat(standing);
  const method = pick(MAIN.methods);
  const [side1, side2] = pickMany(MAIN.sides, 2);

  // Deux garnitures dans les établissements qui en ont les moyens, une seule ailleurs.
  const sides = standing >= 2 && chance(0.7) ? `${side1} et ${side2}` : side1;
  const portion = chance(0.35) ? pick(MAIN.portions) : "";

  return {
    name: cap(`${meat.s} ${agree(method, meat)}`),
    desc: sentence(pick(MAIN.sauces), sides, portion),
    price: priceOf("mains", standing, [0.8, 1, 1.55][rank]),
    keys: [meat.s]
  };
}

/**
 * Un dessert : soit une forme complétée par un fruit, soit une douceur qui se
 * suffit à elle-même.
 * @param {number} standing
 * @returns {MenuItem}
 */
function buildDessert(standing) {
  const roll = Math.random();
  let head;
  let name;

  if (roll < 0.6) {
    head = noun(pick(DESSERT.formsAt));
    name = cap(`${head.s} ${at(noun(pick(DESSERT.fruits)))}`);
  } else if (roll < 0.75) {
    head = noun(pick(DESSERT.formsOf));
    name = cap(`${head.s} ${of(noun(pick(DESSERT.fruits)))}`);
  } else {
    head = noun(pick(DESSERT.standalone));
    name = cap(head.s);
  }

  const [note1, note2] = pickMany(tableFor(standing, DESSERT.notesGood, DESSERT.notesBad), 2);
  return {
    name,
    desc: sentence(agree(note1, head), agree(note2, head)),
    price: priceOf("desserts", standing)
  };
}

/* -------------------------------------------- */
/*  Sections                                     */
/* -------------------------------------------- */

/**
 * Les six sections de la carte. `group` correspond aux cases à cocher de la
 * barre d'outils : les trois sections de boisson s'allument ensemble.
 * `min`/`max` bornent le nombre de lignes, interpolé selon le standing.
 */
const SECTIONS = [
  { id: "wines",    group: "drinks",   min: 1, max: 5, build: buildWine },
  { id: "beers",    group: "drinks",   min: 2, max: 5, build: buildBeer },
  { id: "spirits",  group: "drinks",   min: 1, max: 4, build: buildSpirit },
  { id: "starters", group: "starters", min: 2, max: 5, build: buildStarter },
  { id: "mains",    group: "mains",    min: 3, max: 6, build: buildMain },
  { id: "desserts", group: "desserts", min: 1, max: 4, build: buildDessert }
];

/** Les groupes proposés à la sélection, dans l'ordre d'affichage. */
const GROUPS = ["drinks", "starters", "mains", "desserts"];

/** Sections dont le contenu se boit : elles tirent leurs avaries à part. */
const DRINK_SECTIONS = new Set(["wines", "beers", "spirits"]);

/**
 * Nombre de lignes d'une section : le standing tire la carte vers le haut, et
 * un aléa de plus ou moins un évite que deux tavernes du même rang aient
 * exactement la même longueur de carte.
 * @param {typeof SECTIONS[number]} section
 * @param {number} standing
 * @returns {number}
 */
function countFor(section, standing) {
  const span = section.max - section.min;
  const scaled = section.min + Math.round((span * standing) / (STANDINGS.length - 1));
  return Math.min(section.max, Math.max(section.min, scaled + randInt(-1, 1)));
}

/**
 * Tire une ligne qui ne fasse pas doublon avec celles déjà retenues dans la
 * section. Les fabriques déclarent ce qui compte comme un doublon via `keys` :
 * pour un plat c'est la viande, pour une bière le type de bière. Deux rouges
 * d'origines différentes passent, deux ragoûts de lapin non.
 *
 * Au bout de quelques essais infructueux on accepte la répétition : quand une
 * carte demande cinq entrées et que le tirage tombe sur une famille étroite,
 * mieux vaut une redite qu'une boucle.
 * @param {typeof SECTIONS[number]} definition
 * @param {number} standing
 * @param {Set<string>} used
 * @returns {MenuItem}
 */
function buildUnique(definition, standing, used) {
  let item;
  for (let attempt = 0; attempt < 12; attempt++) {
    item = definition.build(standing);
    const keys = item.keys ?? [item.name];
    if (keys.every((key) => !used.has(key))) {
      for (const key of keys) used.add(key);
      return item;
    }
  }
  return item;
}

/**
 * Sème les avaries sur une carte déjà générée. On les pose après coup, et non
 * ligne par ligne, pour pouvoir en garantir le nombre : une carte constellée
 * d'avertissements ne rend service à personne, une ou deux lignes suspectes
 * donnent au MJ exactement l'accroche qu'il cherche.
 * @param {Array<{items: MenuItem[]}>} sections
 * @param {number} standing
 */
function seedDefects(sections, standing) {
  // Chaque ligne garde en mémoire la section d'où elle vient : un défaut de
  // viande n'a rien à faire sur une tarte, ni un tonneau éventé sur un plat.
  const all = sections.flatMap((s) => s.items.map((item) => ({ item, section: s.id })));
  if (!all.length) return;

  const target = (id) => (DRINK_SECTIONS.has(id) ? "drink" : "food");

  const rate = STANDINGS[standing].defect;
  const count = Math.min(all.length, Math.round(all.length * rate * 0.5));

  for (const { item, section } of pickMany(all, count)) {
    item.warn = pick([...DEFECTS.any, ...DEFECTS[target(section)]]);
  }

  // Le coup fourré est rare et indépendant du standing : on s'empoisonne aussi
  // bien chez le traiteur du palais que dans un bouge du port.
  if (chance(0.08)) {
    const { item, section } = pick(all);
    item.warn = pick([...HAZARDS.any, ...HAZARDS[target(section)]]);
  }
}

/**
 * Génère une carte complète.
 * @param {number} standing        Index dans `STANDINGS`.
 * @param {Set<string>} groups     Groupes de sections retenus.
 * @returns {Array<{id: string, items: MenuItem[]}>}
 */
export function generateMenu(standing, groups) {
  const sections = SECTIONS
    .filter((s) => groups.has(s.group))
    .map((s) => {
      const used = new Set();
      return {
        id: s.id,
        items: Array.from({ length: countFor(s, standing) }, () => buildUnique(s, standing, used))
      };
    });

  // La spécialité de la maison va au plat le plus cher : c'est celui que le
  // patron mettra en avant, et celui sur lequel on peut faire monter la note.
  const mains = sections.find((s) => s.id === "mains");
  if (mains?.items.length) {
    mains.items.reduce((a, b) => (b.price > a.price ? b : a)).special = true;
  }

  seedDefects(sections, standing);
  return sections;
}

/* -------------------------------------------- */
/*  Panneau                                      */
/* -------------------------------------------- */

/** Échappe le texte destiné à `innerHTML`. */
const esc = (str) => String(str).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * Une ligne de carte : intitulé et prix reliés par des pointillés, comme sur
 * une vraie carte, puis la description et l'éventuelle avarie. L'invitation à
 * relancer la ligne n'apparaît qu'au survol, en CSS : une infobulle sur chaque
 * ligne rendrait la lecture de la carte pénible.
 * @param {MenuItem} item
 * @param {number} index
 * @returns {string}
 */
function renderItem(item, index) {
  const unit = item.unit ? `<span class="ptg-unit">${esc(item.unit)}</span>` : "";
  const warn = item.warn
    ? `<p class="ptg-warn"><i class="fa-solid fa-triangle-exclamation"></i>${esc(item.warn)}</p>`
    : "";
  const star = item.special
    ? ` <i class="fa-solid fa-star ptg-star" data-tooltip="${esc(localize("HouseSpecial"))}"></i>`
    : "";

  return `
    <li class="ptg-item" data-index="${index}">
      <div class="ptg-line">
        <span class="ptg-name">${esc(item.name)}${star}</span>
        <span class="ptg-dots"></span>
        <span class="ptg-price">${esc(formatPrice(item.price))}</span>
      </div>
      <p class="ptg-desc">${esc(item.desc)}${unit}</p>
      ${warn}
    </li>`;
}

/**
 * Derniers réglages utilisés, conservés le temps de la session. Rouvrir la
 * fenêtre redonne la taverne sur laquelle on travaillait, sans réglage à
 * refaire ni valeur à stocker dans la configuration du monde.
 */
const lastUsed = { standing: 2, groups: new Set(GROUPS) };

class TavernMenuPanel {
  /** Racine du panneau, insérée par la fenêtre des générateurs. @type {HTMLElement} */
  element;

  /** Carte courante. @type {Array<{id: string, items: MenuItem[]}>} */
  #sections = [];

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "ptg-panel";
    this.element.innerHTML = this.#template();
    this.#activateListeners();
    this.roll();
  }

  /* -------------------------------------------- */

  /** Squelette du panneau : barre de réglages en haut, carte en dessous. */
  #template() {
    const standings = STANDINGS.map((s, i) => `
      <button type="button" class="ptg-chip ptg-standing${i === lastUsed.standing ? " active" : ""}"
              data-standing="${i}">${esc(localize(`Standing.${s.key}`))}</button>`).join("");

    const groups = GROUPS.map((g) => `
      <button type="button" class="ptg-chip ptg-group${lastUsed.groups.has(g) ? " active" : ""}"
              data-group="${g}">${esc(localize(`Group.${g}`))}</button>`).join("");

    return `
      <div class="ptg-controls">
        <div class="ptg-row ptg-standings">${standings}</div>
        <div class="ptg-row">
          <div class="ptg-groups">${groups}</div>
          <button type="button" class="ptg-roll">
            <i class="fa-solid fa-dice-d20"></i> ${esc(localize("Generate"))}
          </button>
        </div>
      </div>
      <div class="ptg-menu"></div>`;
  }

  /* -------------------------------------------- */

  /** Branche la barre de réglages et la délégation de clics sur la carte. */
  #activateListeners() {
    const root = this.element;

    root.querySelector(".ptg-roll").addEventListener("click", () => this.roll());

    root.querySelector(".ptg-standings").addEventListener("click", (event) => {
      const button = event.target.closest("[data-standing]");
      if (!button) return;
      lastUsed.standing = Number(button.dataset.standing);
      for (const el of root.querySelectorAll(".ptg-standing")) el.classList.toggle("active", el === button);
      this.roll();
    });

    root.querySelector(".ptg-groups").addEventListener("click", (event) => {
      const button = event.target.closest("[data-group]");
      if (!button) return;
      const group = button.dataset.group;

      if (lastUsed.groups.has(group)) lastUsed.groups.delete(group);
      else lastUsed.groups.add(group);

      // On refuse de tout éteindre : une carte vide n'est pas un résultat.
      if (!lastUsed.groups.size) lastUsed.groups.add(group);

      button.classList.toggle("active", lastUsed.groups.has(group));
      this.roll();
    });

    root.querySelector(".ptg-menu").addEventListener("click", (event) => {
      const heading = event.target.closest(".ptg-section-title");
      if (heading) return this.#rerollSection(heading.closest(".ptg-section").dataset.section);

      const line = event.target.closest(".ptg-item");
      if (line) this.#rerollItem(line.closest(".ptg-section").dataset.section, Number(line.dataset.index));
    });
  }

  /* -------------------------------------------- */

  /** Régénère toute la carte. */
  roll() {
    this.#sections = generateMenu(lastUsed.standing, lastUsed.groups);
    this.#render();
  }

  /**
   * Régénère une seule section, en gardant sa longueur : le MJ qui n'aime pas
   * les plats proposés veut d'autres plats, pas une carte différente.
   * @param {string} id
   */
  #rerollSection(id) {
    const section = this.#sections.find((s) => s.id === id);
    const definition = SECTIONS.find((s) => s.id === id);
    if (!section || !definition) return;

    const used = new Set();
    section.items = section.items.map(() => buildUnique(definition, lastUsed.standing, used));
    if (id === "mains" && section.items.length) {
      section.items.reduce((a, b) => (b.price > a.price ? b : a)).special = true;
    }
    // La section relancée retrouve son propre lot d'avaries : une gargote reste
    // une gargote, même après qu'on a demandé d'autres plats.
    seedDefects([section], lastUsed.standing);
    this.#render();
  }

  /**
   * Régénère une seule ligne.
   * @param {string} id     Section contenant la ligne.
   * @param {number} index  Position de la ligne dans la section.
   */
  #rerollItem(id, index) {
    const section = this.#sections.find((s) => s.id === id);
    const definition = SECTIONS.find((s) => s.id === id);
    if (!section || !definition || !section.items[index]) return;

    // La ligne relancée ne doit pas retomber sur une voisine de la même section.
    const used = new Set(section.items.flatMap((item, i) => (i === index ? [] : item.keys ?? [item.name])));
    section.items[index] = buildUnique(definition, lastUsed.standing, used);
    this.#render();
  }

  /* -------------------------------------------- */

  /** Redessine la carte en préservant la position de défilement. */
  #render() {
    const menu = this.element.querySelector(".ptg-menu");
    const scroll = menu.scrollTop;

    menu.innerHTML = this.#sections.map((section) => `
      <section class="ptg-section" data-section="${section.id}">
        <h3 class="ptg-section-title" data-tooltip="${esc(localize("RerollSection"))}">
          <span>${esc(localize(`Section.${section.id}`))}</span>
          <i class="fa-solid fa-rotate"></i>
        </h3>
        <ul class="ptg-items">${section.items.map(renderItem).join("")}</ul>
      </section>`).join("");

    menu.scrollTop = scroll;
  }

  /* -------------------------------------------- */

  /**
   * Rend la carte courante sous forme de page de journal.
   * @returns {{name: string, content: string}}
   */
  journal() {
    const standing = localize(`Standing.${STANDINGS[lastUsed.standing].key}`);

    const body = this.#sections.map((section) => {
      const items = section.items.map((item) => {
        const unit = item.unit ? ` (${esc(item.unit)})` : "";
        const warn = item.warn ? `<br><em>${esc(item.warn)}</em>` : "";
        const star = item.special ? ` (${esc(localize("HouseSpecial"))})` : "";
        return `<li><strong>${esc(item.name)}</strong>${star} &middot; ${esc(formatPrice(item.price))}${unit}`
             + `<br>${esc(item.desc)}${warn}</li>`;
      }).join("");
      return `<h2>${esc(localize(`Section.${section.id}`))}</h2><ul>${items}</ul>`;
    }).join("");

    return {
      name: localize("JournalPageName", { standing }),
      content: body
    };
  }
}

/* -------------------------------------------- */

/** Définition consommée par la fenêtre des générateurs. */
export const tavernMenuGenerator = {
  id: "tavern-menu",
  icon: "fa-solid fa-utensils",
  title: "PERSONAL_TOOLBOX.Generators.TavernMenu.Title",
  create: () => new TavernMenuPanel()
};
