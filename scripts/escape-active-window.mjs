/* =========================================================================
   Toolbox : Échap ne ferme que la fenêtre active
   -------------------------------------------------------------------------
   Par défaut, Échap déclenche le raccourci « core.dismiss », dont le cas 4
   ferme d'un coup TOUTES les fenêtres ouvertes (voir
   ClientKeybindings.#onDismiss dans le cœur). Une fiche ouverte par erreur
   par-dessus dix autres, et tout le bureau disparaît.

   On enregistre un raccourci Échap concurrent, de précédence NORMAL, donc
   traité avant « core.dismiss » qui est en DEFERRED : il ferme la fenêtre du
   dessus et renvoie « événement consommé », ce qui empêche le cas 4 de
   s'exécuter. Chaque Échap suivant ferme la fenêtre suivante.

   Attention aux fenêtres qui REFUSENT de se fermer sur Échap : elles testent
   l'option `closeKey` et renvoient la main sans se fermer (SmallTime, épinglé
   en permanence, fait exactement ça). Le cœur les gère en vérifiant qu'une
   fenêtre s'est réellement fermée (`closedApp`) avant de consommer
   l'événement. On fait pareil : on descend la pile jusqu'à la première
   fenêtre qui accepte de se fermer et, si aucune n'accepte, on rend la main à
   « core.dismiss » pour qu'il désélectionne les tokens ou ouvre le menu
   principal.

   Tout le reste du comportement natif est préservé : on rend la main au cœur
   (en renvoyant false) pour l'annulation d'un glisser-déposer, le menu
   principal, le menu contextuel, les tours guidés, la désélection des tokens
   et l'ouverture du menu principal quand plus rien n'est ouvert. Les
   DialogV2 gèrent Échap eux-mêmes et coupent la propagation avant d'arriver
   ici : ils continuent donc de se fermer normalement.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/escape-active-window.mjs"]
   ========================================================================= */

const MODULE_ID = "personal-foundry-toolbox";
const SETTING = "escapeClosesActiveWindowOnly";

/**
 * L'élément racine d'une application, quelle que soit sa génération
 * (ApplicationV2 renvoie un HTMLElement, ApplicationV1 un objet jQuery).
 * @param {object} app L'application.
 * @returns {HTMLElement|null}
 */
function rootElement(app) {
  const el = app?.element;
  if (!el) return null;
  return el instanceof HTMLElement ? el : (el[0] ?? null);
}

/**
 * Les fenêtres actuellement ouvertes et fermables par Échap.
 * On reprend exactement le filtre du cœur (`hasFrame` pour les V2, toute
 * fenêtre listée dans `ui.windows` pour les V1) afin de ne jamais fermer
 * quelque chose que Foundry aurait laissé tranquille.
 * @returns {object[]}
 */
function openWindows() {
  const apps = [];
  for (const app of foundry.applications.instances.values()) {
    if (app.hasFrame && app.rendered) apps.push(app);
  }
  for (const app of Object.values(ui.windows ?? {})) {
    if (app.rendered) apps.push(app);
  }
  return apps;
}

/**
 * La position d'une fenêtre dans la pile : son z-index, les fenêtres réduites
 * passant systématiquement en dernier.
 * @param {object} app L'application.
 * @returns {number}
 */
function stackRank(app) {
  const el = rootElement(app);
  const z = Number(el?.style.zIndex) || app.position?.zIndex || 0;
  return app.minimized ? z - Number.MAX_SAFE_INTEGER : z;
}

/**
 * Les fenêtres ouvertes, de la plus active à la moins active : celle qui
 * détient le focus clavier d'abord, puis les autres du dessus vers le dessous
 * de la pile. On a besoin de la liste entière (et pas seulement de la
 * première) parce qu'une fenêtre peut refuser de se fermer sur Échap.
 * @returns {object[]}
 */
function windowsByPriority() {
  const apps = openWindows().sort((a, b) => stackRank(b) - stackRank(a));

  // La fenêtre qui contient le focus clavier passe devant.
  const focused = document.activeElement?.closest?.(".application, .window-app");
  if (focused) {
    const index = apps.findIndex(a => rootElement(a) === focused);
    if (index > 0) apps.unshift(apps.splice(index, 1)[0]);
  }
  return apps;
}

/**
 * Ferme la première fenêtre de la pile qui accepte de se fermer. Si aucune
 * n'accepte (toutes refusent `closeKey`), on rejoue « core.dismiss » pour
 * retrouver le comportement natif : désélection des tokens, puis ouverture du
 * menu principal.
 * @param {object[]} apps               Les fenêtres, de la plus active à la moins active.
 * @param {KeyboardEventContext} context Le contexte du raccourci, transmis au cœur.
 * @returns {Promise<void>}
 */
async function closeFirstClosable(apps, context) {
  for (const app of apps) {
    await app.close({closeKey: true});
    if (!app.rendered) return;
  }
  await game.keybindings.actions.get("core.dismiss")?.onDown?.(context);
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING, {
    name: "PERSONAL_TOOLBOX.EscapeActiveWindow.Name",
    hint: "PERSONAL_TOOLBOX.EscapeActiveWindow.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.keybindings.register(MODULE_ID, "escapeActiveWindow", {
    name: "PERSONAL_TOOLBOX.EscapeActiveWindow.Keybinding",
    hint: "PERSONAL_TOOLBOX.EscapeActiveWindow.KeybindingHint",
    editable: [{key: "Escape"}],
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    onDown: context => {
      if (!game.settings.get(MODULE_ID, SETTING)) return false;

      // Cas gérés par le cœur avant les fenêtres : on ne s'en mêle pas.
      if (canvas?.currentMouseManager) return false;
      if (ui.menu?.rendered) return false;
      if (ui.context?.element) return false;
      if (foundry.nue?.Tour?.tourInProgress) return false;

      const apps = windowsByPriority();
      if (apps.length === 0) return false; // Rien d'ouvert : le cœur désélectionne ou ouvre le menu.

      // `close` est asynchrone alors que le raccourci doit répondre tout de
      // suite : on consomme l'événement et on gère la suite en arrière-plan,
      // quitte à rejouer « core.dismiss » si rien ne s'est fermé.
      closeFirstClosable(apps, context);
      return true;
    }
  });
});
