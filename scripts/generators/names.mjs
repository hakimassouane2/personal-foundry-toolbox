/**
 * Générateur de noms
 * ------------------
 * Quatre familles de noms : personnes, enseignes, lieux, organisations. Le
 * besoin est différent de celui du menu de taverne : on ne veut pas *un*
 * résultat à raffiner, on veut une poignée de candidats à balayer de l'œil
 * pour en attraper un et le prononcer tout de suite. Chaque section affiche
 * donc une grille de propositions, et un clic sur un nom le copie.
 *
 * Les noms composés reposent sur `grammar.mjs` : « Le Sanglier borgne » demande
 * d'accorder l'adjectif avec la bête, « La Rousse » de choisir l'épithète selon
 * la personne, « L'Ordre du Chêne » de contracter l'article. C'est exactement
 * ce que la concaténation naïve ne sait pas faire.
 */

import { ANCESTRIES, HUMAN } from "./ancestries-data.mjs";
import { agree, at, cap, def, noun, of, pick, pickMany } from "./grammar.mjs";
import { ORDER, PLACE, SIGN } from "./names-data.mjs";

const localize = (key, data) =>
  data ? game.i18n.format(`PERSONAL_TOOLBOX.Generators.Names.${key}`, data)
       : game.i18n.localize(`PERSONAL_TOOLBOX.Generators.Names.${key}`);

/* -------------------------------------------- */
/*  Outils                                       */
/* -------------------------------------------- */

/**
 * Renvoie une copie du nom dont chaque mot prend une capitale : dans un nom
 * propre, « Le Dernier Verre du Noyé » et non « Le Dernier verre ». Les tables
 * de ce générateur évitent donc les noms contenant une préposition, qui
 * deviendrait elle aussi capitale.
 *
 * On copie plutôt que de modifier : `noun()` mémoïse ses résultats, et écrire
 * dedans contaminerait tous les tirages suivants du même mot.
 * @param {import("./grammar.mjs").Noun} n
 * @returns {import("./grammar.mjs").Noun}
 */
function capitalized(n) {
  return { ...n, s: n.s.split(" ").map(cap).join(" ") };
}

/**
 * Tire un prénom humain au hasard, et renvoie son genre. Ne sert plus qu'aux
 * toponymes en Saint- : les noms de personnes, eux, sont tirés genre par genre
 * et ascendance par ascendance.
 * @returns {{first: string, gender: "m"|"f"}}
 */
function pickFirstName() {
  const gender = Math.random() < 0.5 ? "m" : "f";
  return {
    first: pick(gender === "f" ? HUMAN.firstFemale : HUMAN.firstMale),
    gender
  };
}

/**
 * Tire une forme de nom dans la table `forms` d'une ascendance, en respectant
 * les poids. C'est ce tirage qui donne son air à un peuple : un nain sort un
 * patronyme une fois sur deux, un elfe jamais.
 * @param {typeof ANCESTRIES[number]} ancestry
 * @returns {string}
 */
function pickForm(ancestry) {
  const total = ancestry.forms.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [form, weight] of ancestry.forms) {
    roll -= weight;
    if (roll <= 0) return form;
  }
  return ancestry.forms[0][0];
}

/* -------------------------------------------- */
/*  Fabriques                                    */
/* -------------------------------------------- */

/**
 * Un nom de personne : un prénom, puis ce que l'ascendance accroche derrière.
 * Plusieurs formes cohabitent dans une même population, d'où le tirage pondéré
 * décrit par la table `forms` de chaque peuple.
 * @param {"m"|"f"} gender
 * @param {typeof ANCESTRIES[number]} ancestry
 * @returns {string}
 */
function buildPerson(gender, ancestry) {
  const first = pick(gender === "f" ? ancestry.firstFemale : ancestry.firstMale);

  switch (pickForm(ancestry)) {
    case "particle":
      return `${first} ${pick(ancestry.particles)}`;
    case "epithet":
      return `${first} ${agree(pick(ancestry.epithets), { g: gender, pl: false })}`;
    case "patronymic": {
      // Le patronyme se réfère toujours au père, d'où `firstMale` quel que soit
      // le genre de la personne nommée. On écarte son propre prénom, sans quoi
      // le tirage produit des « Bramgar fils de Bramgar ».
      const father = pick(ancestry.firstMale.filter((name) => name !== first));

      // L'élision se teste ici sur la seule voyelle, et non via `of()` : celui-ci
      // élide aussi devant un h, ce qui vaut pour un nom commun français mais
      // donnerait « fils d'Harbek » sur ces prénoms, qui se comportent tous
      // comme des h aspirés.
      const filiation = /^[aeiouyàâäéèêëîïôöùûü]/i.test(father) ? `d'${father}` : `de ${father}`;
      return `${first} ${gender === "f" ? "fille" : "fils"} ${filiation}`;
    }
    default:
      return `${first} ${pick(ancestry.surnames)}`;
  }
}

/**
 * Une enseigne. Quatre tournures, des plus courantes aux plus rares :
 * « Le Sanglier borgne », « Au Sanglier borgne », « Le Loup et la Lanterne »,
 * « Le Repos du Pèlerin ».
 * @returns {string}
 */
function buildSign() {
  const roll = Math.random();

  if (roll < 0.4) {
    const head = capitalized(noun(pick(SIGN.heads)));
    return `${cap(def(head))} ${agree(pick(SIGN.adjectives), head)}`;
  }

  if (roll < 0.6) {
    const head = capitalized(noun(pick(SIGN.heads)));
    return `${cap(at(head))} ${agree(pick(SIGN.adjectives), head)}`;
  }

  if (roll < 0.8) {
    const [one, two] = pickMany(SIGN.heads, 2).map((s) => capitalized(noun(s)));
    return `${cap(def(one))} et ${def(two)}`;
  }

  const head = capitalized(noun(pick(SIGN.possessedHeads)));
  const owner = capitalized(noun(pick(SIGN.possessors)));
  return `${cap(def(head))} ${of(owner, true)}`;
}

/**
 * Un nom de lieu. Le toponyme soudé (« Valbourg ») est le cas ordinaire ; les
 * autres formes servent aux endroits dont le nom raconte quelque chose.
 * @returns {string}
 */
function buildPlace() {
  const roll = Math.random();

  if (roll < 0.45) {
    const stem = pick(PLACE.stems);
    const lower = stem.toLowerCase();
    // « Montmont », mais aussi « Courcourt » et « Ferrefer » : on écarte toute
    // finale dont la racine recouvre celle de la tête, plutôt que de tenir à la
    // main la liste des couples interdits.
    const endings = PLACE.endings.filter((e) => !e.startsWith(lower) && !lower.startsWith(e));
    return `${stem}${pick(endings)}`;
  }

  if (roll < 0.7) {
    const feature = capitalized(noun(pick(PLACE.features)));
    const dweller = capitalized(noun(pick(PLACE.inhabitants)));
    return Math.random() < 0.5
      ? `${cap(def(feature))} ${at(dweller)}`
      : `${cap(def(feature))} ${of(dweller, true)}`;
  }

  if (roll < 0.85) {
    return cap(def(capitalized(noun(pick(PLACE.standalone)))));
  }

  const { first, gender } = pickFirstName();
  return `${gender === "f" ? "Sainte" : "Saint"}-${first}`;
}

/**
 * Un nom d'organisation : soit un collectif qualifié (« Les Lames rouges »),
 * soit une maison au nom de quelque chose (« L'Ordre du Chêne »).
 * @returns {string}
 */
function buildOrder() {
  const roll = Math.random();

  if (roll < 0.4) {
    const collective = capitalized(noun(pick(ORDER.collectives)));
    return `${cap(def(collective))} ${agree(pick(ORDER.adjectives), collective)}`;
  }

  const head = capitalized(noun(pick(roll < 0.75 ? ORDER.heads : ORDER.collectives)));

  // « Les Cendres de la Cendre » : quelques mots figurent dans les deux tables,
  // au singulier d'un côté et au pluriel de l'autre. On écarte le complément
  // qui partage sa racine avec la tête plutôt que d'amputer les tables, où
  // chacun de ces mots est bon à sa place.
  const stem = (n) => n.s.toLowerCase().slice(0, 4);
  const causes = ORDER.causes.filter((c) => stem(noun(c)) !== stem(head));

  return `${cap(def(head))} ${of(capitalized(noun(pick(causes))), true)}`;
}

/* -------------------------------------------- */
/*  Sections                                     */
/* -------------------------------------------- */

/**
 * Les quatre familles. Chacune se découpe en une ou plusieurs colonnes ; `count`
 * est le nombre de propositions par colonne, assez pour avoir le choix et assez
 * peu pour tenir dans un coup d'œil.
 *
 * Les personnes sont la seule famille à en compter deux. Séparer les hommes des
 * femmes fait plus que ranger la liste : cela garantit d'avoir les deux sous la
 * main, là où un tirage libre pouvait sortir dix hommes d'affilée.
 */
const SECTIONS = [
  {
    id: "people",
    columns: [
      { key: "male", count: 5, build: (opts) => buildPerson("m", opts.ancestry) },
      { key: "female", count: 5, build: (opts) => buildPerson("f", opts.ancestry) }
    ]
  },
  { id: "signs",  columns: [{ count: 8, build: buildSign }] },
  { id: "places", columns: [{ count: 8, build: buildPlace }] },
  { id: "orders", columns: [{ count: 6, build: buildOrder }] }
];

/** Mots outils, qui ne caractérisent pas un nom et ne comptent pas comme doublons. */
const FUNCTION_WORDS = new Set(["L", "Le", "La", "Les", "Au", "Aux", "À", "Et", "De", "Du", "Des"]);

/**
 * Extrait les mots pleins d'un nom, c'est-à-dire ceux qui portent une capitale
 * une fois les articles écartés. La convention typographique du générateur y
 * suffit : le nom de tête et ses compléments prennent la capitale, les
 * adjectifs restent en minuscules.
 * @param {string} name
 * @returns {string[]}
 */
function contentWords(name) {
  return name
    .split(/[\s'’-]+/)
    .filter((word) => /^\p{Lu}/u.test(word) && !FUNCTION_WORDS.has(word));
}

/**
 * Remplit les colonnes d'une famille. On refuse non seulement le nom déjà tiré,
 * mais aussi celui qui réemploie un mot plein d'un voisin : « Au Gantelet
 * fendu » puis « Au Gantelet blanc » dans la même liste sonne comme une panne
 * du générateur, alors même que les deux noms diffèrent.
 * @param {typeof SECTIONS[number]} section
 * @param {{ancestry: typeof ANCESTRIES[number]}} options
 * @returns {Array<{key: string|undefined, names: string[]}>}
 */
function fillSection(section, options) {
  const used = new Set();

  return section.columns.map((column) => {
    const names = [];
    for (let attempt = 0; names.length < column.count && attempt < column.count * 12; attempt++) {
      const name = column.build(options);
      const words = contentWords(name);
      if (words.some((word) => used.has(word))) continue;

      for (const word of words) used.add(word);
      names.push(name);
    }
    return { key: column.key, names };
  });
}

/**
 * Génère les listes des familles retenues.
 * @param {Set<string>} groups
 * @param {string} [ancestryKey]  Ascendance des noms de personnes.
 * @returns {Array<{id: string, columns: Array<{key: string|undefined, names: string[]}>}>}
 */
export function generateNames(groups, ancestryKey = HUMAN.key) {
  const ancestry = ANCESTRIES.find((a) => a.key === ancestryKey) ?? HUMAN;

  return SECTIONS
    .filter((s) => groups.has(s.id))
    .map((s) => ({ id: s.id, columns: fillSection(s, { ancestry }) }));
}

/* -------------------------------------------- */
/*  Panneau                                      */
/* -------------------------------------------- */

/** Échappe le texte destiné à `innerHTML`. */
const esc = (str) => String(str).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * Une colonne de propositions, précédée de son intitulé quand elle en a un.
 * Une famille à colonne unique n'affiche pas d'intitulé : le titre de section
 * le dit déjà.
 * @param {{key: string|undefined, names: string[]}} column
 * @returns {string}
 */
function renderColumn(column) {
  const heading = column.key
    ? `<h4 class="ptg-column-title">${esc(localize(`Column.${column.key}`))}</h4>`
    : "";

  const names = column.names.map((name) => `
    <button type="button" class="ptg-name-item" data-name="${esc(name)}"
            data-tooltip="${esc(localize("CopyHint"))}">${esc(name)}</button>`).join("");

  return `<div class="ptg-column">${heading}<div class="ptg-names">${names}</div></div>`;
}

/** Familles retenues et ascendance choisie, conservées le temps de la session. */
const lastUsed = {
  groups: new Set(SECTIONS.map((s) => s.id)),
  ancestry: HUMAN.key
};

class NamesPanel {
  /** Racine du panneau. @type {HTMLElement} */
  element;

  /** Listes courantes. @type {Array<{id: string, names: string[]}>} */
  #sections = [];

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "ptg-panel";
    this.element.innerHTML = this.#template();
    this.#activateListeners();
    this.roll();
  }

  /* -------------------------------------------- */

  #template() {
    const groups = SECTIONS.map((s) => `
      <button type="button" class="ptg-chip ptg-group${lastUsed.groups.has(s.id) ? " active" : ""}"
              data-group="${s.id}">${esc(localize(`Section.${s.id}`))}</button>`).join("");

    const ancestries = ANCESTRIES.map((a) => `
      <button type="button" class="ptg-chip ptg-ancestry${a.key === lastUsed.ancestry ? " active" : ""}"
              data-ancestry="${a.key}">${esc(localize(`Ancestry.${a.key}`))}</button>`).join("");

    // La rangée d'ascendances ne vaut que pour les personnes : on la masque
    // quand cette famille est éteinte, plutôt que de laisser un réglage sans effet.
    const hidden = lastUsed.groups.has("people") ? "" : " hidden";

    return `
      <div class="ptg-controls">
        <div class="ptg-row ptg-ancestries${hidden}">${ancestries}</div>
        <div class="ptg-row">
          <div class="ptg-groups">${groups}</div>
          <button type="button" class="ptg-roll">
            <i class="fa-solid fa-dice-d20"></i> ${esc(localize("Generate"))}
          </button>
        </div>
      </div>
      <div class="ptg-menu ptg-names-menu"></div>`;
  }

  /* -------------------------------------------- */

  #activateListeners() {
    const root = this.element;

    root.querySelector(".ptg-roll").addEventListener("click", () => this.roll());

    root.querySelector(".ptg-groups").addEventListener("click", (event) => {
      const button = event.target.closest("[data-group]");
      if (!button) return;
      const group = button.dataset.group;

      if (lastUsed.groups.has(group)) lastUsed.groups.delete(group);
      else lastUsed.groups.add(group);
      if (!lastUsed.groups.size) lastUsed.groups.add(group);

      button.classList.toggle("active", lastUsed.groups.has(group));
      root.querySelector(".ptg-ancestries").hidden = !lastUsed.groups.has("people");
      this.roll();
    });

    root.querySelector(".ptg-ancestries").addEventListener("click", (event) => {
      const button = event.target.closest("[data-ancestry]");
      if (!button) return;

      lastUsed.ancestry = button.dataset.ancestry;
      for (const el of root.querySelectorAll(".ptg-ancestry")) el.classList.toggle("active", el === button);

      // Changer de peuple ne concerne que les personnes : les enseignes et les
      // lieux déjà affichés restent en place, on ne relance qu'eux.
      this.#rerollSection("people");
    });

    root.querySelector(".ptg-menu").addEventListener("click", (event) => {
      const heading = event.target.closest(".ptg-section-title");
      if (heading) return this.#rerollSection(heading.closest(".ptg-section").dataset.section);

      const name = event.target.closest(".ptg-name-item");
      if (name) this.#copy(name);
    });
  }

  /* -------------------------------------------- */

  /** Régénère toutes les listes. */
  roll() {
    this.#sections = generateNames(lastUsed.groups, lastUsed.ancestry);
    this.#render();
  }

  /**
   * Régénère une seule famille.
   * @param {string} id
   */
  #rerollSection(id) {
    const section = this.#sections.find((s) => s.id === id);
    const definition = SECTIONS.find((s) => s.id === id);
    if (!section || !definition) return;

    const ancestry = ANCESTRIES.find((a) => a.key === lastUsed.ancestry) ?? HUMAN;
    section.columns = fillSection(definition, { ancestry });
    this.#render();
  }

  /**
   * Copie un nom dans le presse-papier. Le retour visuel se fait sur l'élément
   * cliqué plutôt qu'en notification : on en copie plusieurs à la suite, et
   * autant de notifications masqueraient la liste qu'on est en train de lire.
   * @param {HTMLElement} element
   */
  #copy(element) {
    const text = element.dataset.name ?? element.textContent.trim();
    game.clipboard.copyPlainText(text);

    element.classList.add("copied");
    setTimeout(() => element.classList.remove("copied"), 900);
  }

  /* -------------------------------------------- */

  /** Redessine les listes en préservant la position de défilement. */
  #render() {
    const menu = this.element.querySelector(".ptg-menu");
    const scroll = menu.scrollTop;

    menu.innerHTML = this.#sections.map((section) => `
      <section class="ptg-section" data-section="${section.id}">
        <h3 class="ptg-section-title" data-tooltip="${esc(localize("RerollSection"))}">
          <span>${esc(localize(`Section.${section.id}`))}</span>
          <i class="fa-solid fa-rotate"></i>
        </h3>
        <div class="ptg-columns${section.columns.length > 1 ? " split" : ""}">${section.columns.map(renderColumn).join("")}</div>
      </section>`).join("");

    menu.scrollTop = scroll;
  }

  /* -------------------------------------------- */

  /**
   * Rend les listes courantes sous forme de page de journal.
   * @returns {{name: string, content: string}}
   */
  journal() {
    const body = this.#sections.map((section) => {
      const columns = section.columns.map((column) => {
        const heading = column.key ? `<h3>${esc(localize(`Column.${column.key}`))}</h3>` : "";
        const items = column.names.map((name) => `<li>${esc(name)}</li>`).join("");
        return `${heading}<ul>${items}</ul>`;
      }).join("");
      // Sur une page relue plus tard, « Personnes » seul ne dit pas de quel
      // peuple il s'agit : on le précise au titre.
      const label = section.id === "people"
        ? `${localize("Section.people")} (${localize(`Ancestry.${lastUsed.ancestry}`)})`
        : localize(`Section.${section.id}`);
      return `<h2>${esc(label)}</h2>${columns}`;
    }).join("");

    return { name: localize("JournalPageName"), content: body };
  }
}

/* -------------------------------------------- */

/** Définition consommée par la fenêtre des générateurs. */
export const namesGenerator = {
  id: "names",
  icon: "fa-solid fa-signature",
  title: "PERSONAL_TOOLBOX.Generators.Names.Title",
  create: () => new NamesPanel()
};
