/* =========================================================================
   Toolbox : monter et descendre l'élévation depuis le HUD de token
   -------------------------------------------------------------------------
   Foundry n'offre qu'un champ de saisie pour l'élévation. On le remplace par
   deux boutons qui ajoutent ou retirent une case (soit 5 ft, soit 1 space,
   selon l'unité de la scène). Maj + clic déplace de cinq cases d'un coup.

   Le champ d'origine est masqué par la feuille de style qui accompagne ce
   script : Foundry affiche déjà l'élévation sur le token lui-même.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/elevation-stepper.mjs"]
   ========================================================================= */

const BIG_STEP = 5;

const t = (key, data) => game.i18n.format(`PERSONAL_TOOLBOX.Elevation.${key}`, data ?? {});

/**
 * Tokens visés : la sélection courante si le token du HUD en fait partie,
 * sinon ce seul token.
 * @param {Token} hudToken
 * @returns {TokenDocument[]}
 */
function targets(hudToken) {
  const controlled = canvas.tokens.controlled;
  const tokens = controlled.includes(hudToken) && controlled.length > 1 ? controlled : [hudToken];
  return tokens.map(token => token.document).filter(doc => doc.canUserModify(game.user, "update"));
}

/**
 * Décale l'élévation des tokens visés.
 * @param {Token} hudToken Token du HUD.
 * @param {number} direction 1 pour monter, -1 pour descendre.
 * @param {boolean} big Maj enfoncée : cinq cases au lieu d'une.
 */
async function stepElevation(hudToken, direction, big) {
  // Une case vaut « 5 » sur une scène en pieds et « 1 » sur une scène en
  // spaces : l'élévation se stocke dans la même unité que les distances.
  const perSquare = canvas.scene?.grid.distance || 1;
  const delta = direction * perSquare * (big ? BIG_STEP : 1);

  const updates = targets(hudToken).map(token => ({
    _id: token.id,
    elevation: (token.elevation ?? 0) + delta
  }));
  if (!updates.length) return;

  await canvas.scene.updateEmbeddedDocuments("Token", updates);
}

Hooks.on("renderTokenHUD", (hud, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const block = root?.querySelector(".col.left .attribute.elevation");
  const hudToken = hud.object;
  if (!block || !hudToken?.document.canUserModify(game.user, "update")) return;

  // Masqué par le CSS, mais on le tient à jour au cas où il serait réaffiché.
  const field = block.querySelector('input[name="elevation"]');

  /**
   * Fabrique un des deux boutons.
   * @param {number} direction 1 pour monter, -1 pour descendre.
   * @returns {HTMLButtonElement}
   */
  const makeButton = direction => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "control-icon pft-elevation-step";
    button.dataset.tooltip = t(direction > 0 ? "Up" : "Down", { n: BIG_STEP });
    button.innerHTML = `<i class="fa-solid ${direction > 0 ? "fa-arrow-up-wide-short" : "fa-arrow-down-short-wide"}" inert></i>`;

    button.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await stepElevation(hudToken, direction, event.shiftKey);
      } catch (err) {
        console.error("[toolbox/elevation]", err);
        ui.notifications.error(t("Failed"));
        return;
      }
      // Le HUD ne se rafraîchit pas tout seul : on recale le champ masqué.
      if (field) field.value = hudToken.document.elevation;
    });

    return button;
  };

  block.before(makeButton(1));
  block.after(makeButton(-1));
});
