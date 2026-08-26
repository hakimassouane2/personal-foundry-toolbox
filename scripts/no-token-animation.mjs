/* =========================================================================
   Toolbox : pas d'animation de déplacement des tokens
   -------------------------------------------------------------------------
   Reprend la fonctionnalité du module « No Token Animations » (Fyorl), resté
   bloqué en compatibilité Foundry v11.

   Différence avec l'original : celui-ci posait `options.animate = false` dans
   le hook `preUpdateToken`, or ces options de mise à jour sont rediffusées à
   tous les clients. Un réglage « client » supprimait donc l'animation chez
   tout le monde dès que ce client bougeait un token, et ne faisait rien quand
   c'était quelqu'un d'autre qui bougeait.

   Ici on intercepte le mouvement à l'affichage, dans `Token#_onUpdate` : le
   réglage n'agit que sur ce navigateur, mais il agit sur tous les
   déplacements visibles, d'où qu'ils viennent (drag, flèches, règle,
   déplacement d'un autre joueur, macro).

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/no-token-animation.mjs"]
   ========================================================================= */

const MODULE_ID = "personal-foundry-toolbox";
const SETTING = "disableTokenMovementAnimation";

/** Cache du réglage : `_onUpdate` est appelé très souvent. */
let enabled = true;

/**
 * L'update en cours déplace-t-il le token ?
 * On ne coupe l'animation que pour le mouvement : les autres transitions
 * (apparition, changement de texture, anneau dynamique) restent animées.
 * @param {TokenDocument} doc Le document mis à jour.
 * @param {object} changed Les changements appliqués.
 * @param {object} options Les options de l'opération.
 * @returns {boolean}
 */
function isMovement(doc, changed, options) {
  if (options._movement?.[doc.id]) return true;
  const TokenDocumentClass = foundry.documents?.TokenDocument ?? globalThis.TokenDocument;
  return TokenDocumentClass?._isMovementUpdate?.(changed) ?? false;
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING, {
    name: "PERSONAL_TOOLBOX.NoTokenAnimation.Name",
    hint: "PERSONAL_TOOLBOX.NoTokenAnimation.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => { enabled = value; }
  });

  const proto = (foundry.canvas?.placeables?.Token ?? globalThis.Token)?.prototype;
  if (typeof proto?._onUpdate !== "function") {
    console.warn(`${MODULE_ID} | Token#_onUpdate est introuvable : les animations de déplacement restent actives.`);
    return;
  }

  const wrapped = proto._onUpdate;
  proto._onUpdate = function (changed, options, userId) {
    // `animate: false` fait sauter le token à sa case et coupe la règle de
    // déplacement, exactement comme le chemin « téléportation » du cœur.
    if (enabled && isMovement(this.document, changed, options)) options.animate = false;
    return wrapped.call(this, changed, options, userId);
  };
});

Hooks.once("ready", () => {
  enabled = game.settings.get(MODULE_ID, SETTING);
});
