/**
 * Listes de propositions à copier
 * -------------------------------
 * Deux générateurs, les noms et l'ambiance, produisent la même chose : des
 * colonnes de courtes propositions qu'on balaie de l'œil et qu'on copie d'un
 * clic. Leur rendu et leur retour de copie vivent ici, pour que la troisième
 * liste qui arrivera n'ait pas à les réécrire une troisième fois.
 *
 * Ce module ne sait rien du contenu affiché : chaque générateur lui passe des
 * intitulés déjà localisés et déjà tirés.
 */

/** Échappe le texte destiné à `innerHTML`. */
export const esc = (str) => String(str).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * @typedef {object} KeywordColumn
 * @property {string}   [label]  Intitulé de la colonne, déjà localisé. Une
 *                               colonne unique s'en passe : le titre de section
 *                               dit déjà ce qu'elle contient.
 * @property {string[]} names    Les propositions.
 */

/**
 * Rend une section : un titre relançable, puis ses colonnes de propositions.
 *
 * `layout` règle la largeur des propositions, qui dépend de leur longueur :
 *   - `grid`  : colonnes étroites, pour des entrées de deux ou trois mots ;
 *   - `pairs` : colonnes larges, pour des groupes nominaux qui tiennent tout
 *               juste sur une ligne ;
 *   - `wide`  : une proposition par ligne, pour les entrées les plus longues.
 *
 * @param {object}                    section
 * @param {string}                    section.id
 * @param {string}                    section.title
 * @param {string}                    section.rerollTooltip
 * @param {string}                    section.itemTooltip
 * @param {KeywordColumn[]}           section.columns
 * @param {"grid"|"pairs"|"wide"}     [section.layout="grid"]
 * @returns {string}
 */
export function renderKeywordSection({ id, title, rerollTooltip, itemTooltip, columns, layout = "grid" }) {
  const body = columns.map((column) => {
    const heading = column.label
      ? `<h4 class="ptg-column-title">${esc(column.label)}</h4>`
      : "";

    const items = column.names.map((name) => `
      <button type="button" class="ptg-keyword" data-name="${esc(name)}"
              data-tooltip="${esc(itemTooltip)}">${esc(name)}</button>`).join("");

    const modifier = layout === "grid" ? "" : ` ${layout}`;
    return `<div class="ptg-column">${heading}<div class="ptg-names${modifier}">${items}</div></div>`;
  }).join("");

  return `
    <section class="ptg-section" data-section="${id}">
      <h3 class="ptg-section-title" data-tooltip="${esc(rerollTooltip)}">
        <span>${esc(title)}</span>
        <i class="fa-solid fa-rotate"></i>
      </h3>
      <div class="ptg-columns${columns.length > 1 ? " split" : ""}">${body}</div>
    </section>`;
}

/**
 * Copie une proposition dans le presse-papier. Le retour visuel se fait sur
 * l'élément cliqué plutôt qu'en notification : on en copie plusieurs à la
 * suite, et autant de notifications masqueraient la liste qu'on est en train
 * de lire.
 * @param {HTMLElement} element
 */
export function copyKeyword(element) {
  game.clipboard.copyPlainText(element.dataset.name ?? element.textContent.trim());

  element.classList.add("copied");
  setTimeout(() => element.classList.remove("copied"), 900);
}
