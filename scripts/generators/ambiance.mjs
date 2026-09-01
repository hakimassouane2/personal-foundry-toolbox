/**
 * Générateur d'ambiance
 * ---------------------
 * Choisir un type de lieu, obtenir de quoi le décrire tout de suite : ce qu'on
 * voit, ce qu'on entend, ce qu'on sent, plus quelques détails qui accrochent.
 *
 * Le générateur s'arrête à la matière première et ne rédige pas de phrases.
 * C'est délibéré : une phrase générée s'entend comme telle à la table, alors
 * qu'une poignée de perceptions concrètes se reformule en une seconde avec ses
 * propres mots. Les colonnes de sens servent à planter le décor, la colonne de
 * détails à donner aux joueurs quelque chose à saisir.
 */

import { PLACES } from "./ambiance-data.mjs";
import { pickMany } from "./grammar.mjs";
import { copyKeyword, esc, renderKeywordSection } from "./keyword-list.mjs";

const localize = (key, data) =>
  data ? game.i18n.format(`PERSONAL_TOOLBOX.Generators.Ambiance.${key}`, data)
       : game.i18n.localize(`PERSONAL_TOOLBOX.Generators.Ambiance.${key}`);

/* -------------------------------------------- */
/*  Sections                                     */
/* -------------------------------------------- */

/**
 * Deux sections. Les trois sens tiennent en colonnes serrées parce que leurs
 * entrées sont courtes ; les détails prennent la largeur, étant des groupes de
 * mots que l'on lit en entier.
 */
const SECTIONS = [
  {
    id: "senses",
    columns: [
      { key: "sight", count: 4 },
      { key: "sound", count: 4 },
      { key: "smell", count: 4 }
    ]
  },
  {
    id: "details",
    wide: true,
    // Une seule colonne, dont l'intitulé ferait doublon avec le titre de section.
    columns: [{ key: "detail", count: 3, unlabelled: true }]
  }
];

/**
 * Tire le contenu d'une section pour un lieu donné.
 * @param {typeof SECTIONS[number]} section
 * @param {typeof PLACES[number]} place
 * @returns {{id: string, wide: boolean, columns: Array<{key: string, unlabelled: boolean, names: string[]}>}}
 */
function fillSection(section, place) {
  return {
    id: section.id,
    wide: Boolean(section.wide),
    columns: section.columns.map((column) => ({
      key: column.key,
      unlabelled: Boolean(column.unlabelled),
      names: pickMany(place[column.key], column.count)
    }))
  };
}

/**
 * Génère une ambiance complète.
 * @param {string} placeKey
 * @returns {ReturnType<typeof fillSection>[]}
 */
export function generateAmbiance(placeKey) {
  const place = PLACES.find((p) => p.key === placeKey) ?? PLACES[0];
  return SECTIONS.map((section) => fillSection(section, place));
}

/* -------------------------------------------- */
/*  Panneau                                      */
/* -------------------------------------------- */

/** Lieu choisi, conservé le temps de la session. */
const lastUsed = { place: PLACES[0].key };

class AmbiancePanel {
  /** Racine du panneau. @type {HTMLElement} */
  element;

  /** Ambiance courante. @type {ReturnType<typeof generateAmbiance>} */
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
    const places = PLACES.map((place) => `
      <button type="button" class="ptg-chip ptg-place${place.key === lastUsed.place ? " active" : ""}"
              data-place="${place.key}">${esc(localize(`Place.${place.key}`))}</button>`).join("");

    return `
      <div class="ptg-controls">
        <div class="ptg-row ptg-places">${places}</div>
        <div class="ptg-row">
          <span class="ptg-hint">${esc(localize("Hint"))}</span>
          <button type="button" class="ptg-roll">
            <i class="fa-solid fa-dice-d20"></i> ${esc(localize("Generate"))}
          </button>
        </div>
      </div>
      <div class="ptg-menu"></div>`;
  }

  /* -------------------------------------------- */

  #activateListeners() {
    const root = this.element;

    root.querySelector(".ptg-roll").addEventListener("click", () => this.roll());

    root.querySelector(".ptg-places").addEventListener("click", (event) => {
      const button = event.target.closest("[data-place]");
      if (!button) return;

      lastUsed.place = button.dataset.place;
      for (const el of root.querySelectorAll(".ptg-place")) el.classList.toggle("active", el === button);
      this.roll();
    });

    root.querySelector(".ptg-menu").addEventListener("click", (event) => {
      const heading = event.target.closest(".ptg-section-title");
      if (heading) return this.#rerollSection(heading.closest(".ptg-section").dataset.section);

      const keyword = event.target.closest(".ptg-keyword");
      if (keyword) copyKeyword(keyword);
    });
  }

  /* -------------------------------------------- */

  /** Régénère toute l'ambiance. */
  roll() {
    this.#sections = generateAmbiance(lastUsed.place);
    this.#render();
  }

  /**
   * Régénère une seule section.
   * @param {string} id
   */
  #rerollSection(id) {
    const index = this.#sections.findIndex((s) => s.id === id);
    const definition = SECTIONS.find((s) => s.id === id);
    if (index < 0 || !definition) return;

    const place = PLACES.find((p) => p.key === lastUsed.place) ?? PLACES[0];
    this.#sections[index] = fillSection(definition, place);
    this.#render();
  }

  /* -------------------------------------------- */

  /** Redessine en préservant la position de défilement. */
  #render() {
    const menu = this.element.querySelector(".ptg-menu");
    const scroll = menu.scrollTop;

    menu.innerHTML = this.#sections.map((section) => renderKeywordSection({
      id: section.id,
      title: localize(`Section.${section.id}`),
      rerollTooltip: localize("RerollSection"),
      itemTooltip: localize("CopyHint"),
      wide: section.wide,
      columns: section.columns.map((column) => ({
        label: column.unlabelled ? undefined : localize(`Column.${column.key}`),
        names: column.names
      }))
    })).join("");

    menu.scrollTop = scroll;
  }

  /* -------------------------------------------- */

  /**
   * Rend l'ambiance courante sous forme de page de journal.
   * @returns {{name: string, content: string}}
   */
  journal() {
    const place = localize(`Place.${lastUsed.place}`);

    const body = this.#sections.map((section) => {
      const columns = section.columns.map((column) => {
        const heading = column.unlabelled ? "" : `<h3>${esc(localize(`Column.${column.key}`))}</h3>`;
        const items = column.names.map((name) => `<li>${esc(name)}</li>`).join("");
        return `${heading}<ul>${items}</ul>`;
      }).join("");
      return `<h2>${esc(localize(`Section.${section.id}`))}</h2>${columns}`;
    }).join("");

    return { name: localize("JournalPageName", { place }), content: body };
  }
}

/* -------------------------------------------- */

/** Définition consommée par la fenêtre des générateurs. */
export const ambianceGenerator = {
  id: "ambiance",
  icon: "fa-solid fa-eye",
  title: "PERSONAL_TOOLBOX.Generators.Ambiance.Title",
  create: () => new AmbiancePanel()
};
