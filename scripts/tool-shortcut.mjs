/**
 * Tool Shortcut
 * -------------
 * Enregistre des raccourcis clavier (emplacements 1 à N) qui activent les groupes
 * de contrôles de scène en haut à gauche (Token, Lumière, Murs, etc.).
 *
 * Particularité : l'emplacement N ne correspond PAS au N-ième contrôle « de base »
 * de Foundry, mais au N-ième contrôle *réellement affiché* à l'écran. Ainsi, si un
 * autre module masque certains contrôles (ex. Régions), l'emplacement 1 cible le
 * premier contrôle visible, l'emplacement 2 le deuxième visible, et ainsi de suite.
 */

/**
 * Namespace des raccourcis. Ce doit être l'identifiant réel du module : Foundry
 * s'en sert pour retrouver le paquet auquel rattacher chaque raccourci dans la
 * configuration des contrôles. Un namespace qui ne correspond à aucun paquet
 * installé, comme le « tool-shortcut » d'origine, envoie les neuf raccourcis
 * dans la catégorie « Non répertorié ».
 */
const MODULE_ID = "personal-foundry-toolbox";

/** Nombre d'emplacements de raccourci à enregistrer. */
const NUM_SLOTS = 9;

/* -------------------------------------------- */

/**
 * Détermine si un élément est réellement visible à l'écran.
 * Couvre le masquage par suppression du DOM (l'élément n'existe pas),
 * par `display:none` / `visibility:hidden` (CSS) ou par taille nulle.
 * @param {Element} el
 * @returns {boolean}
 */
function isVisible(el) {
  if (!el) return false;
  if (typeof el.checkVisibility === "function") {
    return el.checkVisibility({ checkVisibilityCSS: true });
  }
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/* -------------------------------------------- */

/**
 * Renvoie les boutons de contrôle *réellement affichés*, dans l'ordre d'affichage.
 * On lit le DOM rendu afin de refléter exactement ce que l'utilisateur voit, quel
 * que soit le mécanisme de masquage employé. On inclut aussi les boutons ajoutés
 * par d'autres modules (Icon Vault, Mass Edit, etc.) qui ne sont pas de véritables
 * contrôles enregistrés mais qui apparaissent dans la barre.
 * @returns {HTMLButtonElement[]}
 */
function getVisibleControlButtons() {
  const root = ui.controls?.element;
  if (!root) return [];
  const buttons = root.querySelectorAll("#scene-controls-layers button.layer");
  return Array.from(buttons).filter(isVisible);
}

/* -------------------------------------------- */

/**
 * Active le bouton situé à l'emplacement donné dans la liste affichée.
 * On simule un clic sur le bouton plutôt que d'appeler `ui.controls.activate()` :
 * cela fonctionne aussi bien pour les contrôles standards de Foundry que pour les
 * boutons personnalisés injectés par d'autres modules, en déclenchant leur propre
 * gestionnaire d'événement.
 * @param {number} slot  Position (1 = premier bouton visible).
 * @returns {boolean} `true` si l'événement a été consommé.
 */
function activateControlSlot(slot) {
  if (!ui.controls) return false;

  const target = getVisibleControlButtons()[slot - 1];
  if (!target) return false;

  // Inutile de re-cliquer si ce contrôle standard est déjà actif.
  if (target.dataset.control && target.dataset.control === ui.controls.control?.name) return true;

  target.click();
  return true;
}

/* -------------------------------------------- */

Hooks.once("init", () => {
  for (let i = 1; i <= NUM_SLOTS; i++) {
    // Le hook `init` se déclenche avant le chargement des traductions : on passe des
    // clés de localisation, que Foundry résout au moment d'afficher la configuration.
    game.keybindings.register(MODULE_ID, `slot${i}`, {
      name: `TOOL_SHORTCUT.SlotName${i}`,
      hint: "TOOL_SHORTCUT.SlotHint",
      editable: [{ key: `Digit${i}` }],
      restricted: false,
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
      onDown: () => activateControlSlot(i)
    });
  }
});
