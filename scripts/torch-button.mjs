/* =========================================================================
   Toolbox : bouton torche dans le HUD de token
   -------------------------------------------------------------------------
   Remplace le module « Torch » par le strict nécessaire : un bouton flamme
   dans le HUD du token (clic droit sur un token), qui ouvre une petite modale
   à deux choix.

     - Torche  : 2 cases de lumière vive, 4 cases de tamisée, teinte orangée,
                 animation « flamme » de Foundry.
     - Lumière : mêmes portées, lumière blanche, animation magique (pulsation).

   Rallumer avec l'autre source remplace simplement la lumière. Le bouton est
   marqué « actif » quand une des deux sources brûle ; un clic droit dessus
   éteint et restaure la lumière que le token avait avant.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/torch-button.mjs"]
   ========================================================================= */

const MODULE_ID = "personal-foundry-toolbox";
const FLAG = "torch";

const t = (key, data) => game.i18n.format(`PERSONAL_TOOLBOX.Torch.${key}`, data ?? {});

/**
 * Les deux sources de lumière. Les portées sont en CASES, pas en unités de
 * distance : une scène compte tantôt en « 5 ft » par case, tantôt en « 1
 * space », et scaledLight() fait la conversion. Tout est modifiable ici, c'est
 * le seul endroit qui décrit à quoi ressemble une torche.
 */
const SOURCES = {
  torch: {
    icon: "fa-solid fa-fire",
    image: "icons/sundries/lights/torch-brown-lit.webp",
    light: {
      bright: 2,
      dim: 4,
      alpha: 0.35,
      color: "#ff9329",
      luminosity: 0.5,
      attenuation: 0.6,
      angle: 360,
      animation: { type: "torch", speed: 3, intensity: 3, reverse: false }
    }
  },
  light: {
    icon: "fa-solid fa-wand-sparkles",
    image: "icons/magic/light/explosion-star-glow-blue.webp",
    light: {
      bright: 2,
      dim: 4,
      alpha: 0.25,
      color: "#f4f6ff",
      luminosity: 0.6,
      attenuation: 0.5,
      angle: 360,
      animation: { type: "pulse", speed: 2, intensity: 2, reverse: false }
    }
  }
};

/** Lumière d'un token qui n'éclaire rien, pour les cas sans état sauvegardé. */
const DARK = { bright: 0, dim: 0, alpha: 0.5, animation: { type: null, speed: 5, intensity: 5 } };

/**
 * Source allumée par nous sur ce token, s'il y en a une.
 * @param {TokenDocument} token
 * @returns {string|null} Clé dans SOURCES.
 */
function activeSource(token) {
  const key = token.getFlag(MODULE_ID, FLAG)?.source ?? null;
  return key in SOURCES ? key : null;
}

/**
 * Convertit les portées en cases vers les unités de distance de la scène.
 * @param {string} key Clé dans SOURCES.
 * @returns {object} Données de lumière prêtes pour un update.
 */
function scaledLight(key) {
  const perSquare = canvas.scene?.grid.distance || 1;
  const light = foundry.utils.deepClone(SOURCES[key].light);
  light.bright *= perSquare;
  light.dim *= perSquare;
  return light;
}

/**
 * Allume une source sur un token, en mémorisant sa lumière d'origine.
 * @param {TokenDocument} token
 * @param {string} key Clé dans SOURCES.
 */
async function ignite(token, key) {
  const previous = token.getFlag(MODULE_ID, FLAG)?.previous ?? token.light.toObject();
  await token.update({
    light: scaledLight(key),
    [`flags.${MODULE_ID}.${FLAG}`]: { source: key, previous }
  });
}

/**
 * Éteint la source et restaure la lumière d'avant.
 * @param {TokenDocument} token
 */
async function extinguish(token) {
  const previous = token.getFlag(MODULE_ID, FLAG)?.previous ?? DARK;
  await token.update({
    light: previous,
    [`flags.${MODULE_ID}.-=${FLAG}`]: null
  });
}

/**
 * Une lumière de token ne se voit pas si la scène est éclairée globalement ou
 * si elle n'est tout simplement pas assombrie. C'est la cause n°1 d'un
 * « j'ai cliqué et il ne se passe rien ».
 * @returns {string|null} Message d'avertissement, ou null si tout va bien.
 */
function visibilityWarning() {
  const scene = canvas.scene;
  if (!scene) return null;

  // v13 : scene.environment ; on garde un repli sur les champs historiques.
  const globalLight = scene.environment?.globalLight?.enabled ?? scene.globalLight ?? false;
  const darkness = scene.environment?.darknessLevel ?? scene.darkness ?? 0;

  if (globalLight) return t("WarnGlobalLight");
  if (darkness < 0.25) return t("WarnBrightScene");
  return null;
}

/**
 * Modale de choix de la source. On éteint par un clic droit sur le bouton du
 * HUD, pas depuis cette fenêtre.
 * @returns {Promise<string|null>} "torch", "light", ou null si annulé.
 */
async function promptSource() {
  const card = key => `
    <button type="button" class="pft-torch__choice" data-pft-source="${key}">
      <img class="pft-torch__icon" src="${SOURCES[key].image}" alt="">
      <span class="pft-torch__label">${t(`Source.${key}.Label`)}</span>
    </button>`;

  const content = `<div class="pft-torch__choices">
    ${card("torch")}
    ${card("light")}
  </div>`;

  // DialogV2.wait est le seul chemin qui câble les callbacks render et close :
  // en instanciant DialogV2 à la main, ils ne sont jamais appelés.
  let choice = null;
  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: t("Title"), icon: "fa-solid fa-fire" },
    classes: ["pft-torch"],
    position: { width: 380 },
    content,
    // DialogV2 refuse de s'ouvrir sans bouton : on en déclare un, et le CSS
    // masque tout le pied de page. On ferme par la croix ou par Échap.
    buttons: [{ action: "cancel", label: t("Cancel") }],
    render: (_event, dialog) => {
      for (const button of dialog.element.querySelectorAll("[data-pft-source]")) {
        button.addEventListener("click", () => {
          choice = button.dataset.pftSource;
          dialog.close();
        });
      }
    },
    // Renvoyé par wait() quand la fenêtre se ferme, y compris via une carte.
    close: () => choice
  });

  // "cancel" vient du bouton de pied de page, null d'une fermeture à la croix.
  return result === "cancel" ? null : (result ?? null);
}

/**
 * Tokens visés par le bouton : la sélection courante si le token du HUD en
 * fait partie, sinon ce seul token.
 * @param {Token} hudToken
 * @returns {TokenDocument[]}
 */
function targets(hudToken) {
  const controlled = canvas.tokens.controlled;
  const tokens = controlled.includes(hudToken) && controlled.length > 1 ? controlled : [hudToken];
  return tokens.map(token => token.document).filter(doc => doc.canUserModify(game.user, "update"));
}

Hooks.on("renderTokenHUD", (hud, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  const column = root?.querySelector(".col.left");
  const hudToken = hud.object;
  if (!column || !hudToken?.document.canUserModify(game.user, "update")) return;

  const lit = !!activeSource(hudToken.document);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `control-icon pft-torch-toggle${lit ? " active" : ""}`;
  button.dataset.tooltip = t("Tooltip");
  button.innerHTML = `<i class="${SOURCES.torch.icon}" inert></i>`;

  // Clic droit : on éteint sans passer par la modale. On ne touche qu'aux
  // tokens allumés par ce bouton, pour ne jamais écraser la lumière qu'un
  // token tient de sa propre fiche.
  button.addEventListener("contextmenu", async event => {
    event.preventDefault();
    event.stopPropagation();

    const tokens = targets(hudToken).filter(token => activeSource(token));
    if (!tokens.length) {
      ui.notifications.info(t("NothingLit"));
      return;
    }

    try {
      for (const token of tokens) await extinguish(token);
    } catch (err) {
      console.error("[toolbox/torch]", err);
      ui.notifications.error(t("Failed"));
      return;
    }

    ui.notifications.info(t("Extinguished", { n: tokens.length }));
    hud.render();
  });

  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();

    const tokens = targets(hudToken);
    if (!tokens.length) return;

    const choice = await promptSource();
    if (!choice) return;

    try {
      for (const token of tokens) await ignite(token, choice);
    } catch (err) {
      console.error("[toolbox/torch]", err);
      ui.notifications.error(t("Failed"));
      return;
    }

    const sample = tokens[0];
    console.debug("[toolbox/torch]", choice, sample.name, sample.light.toObject());

    ui.notifications.info(t("Lit", { source: t(`Source.${choice}.Label`), n: tokens.length }));
    const warning = visibilityWarning();
    if (warning) ui.notifications.warn(warning);

    hud.render();
  });

  column.prepend(button);
});
