/* =========================================================================
   Toolbox — Relancer un jet depuis le chat (Foundry v13)
   -------------------------------------------------------------------------
   Problème : Foundry n'offre aucun moyen de relancer un jet déjà posté. Il
   faut retourner cliquer sur l'item / la capacité d'origine, ce qui redéclenche
   tous les effets de bord de l'activation (dans Nimble : une action dépensée,
   des charges consommées…) alors qu'on voulait juste redonner les dés.

   Solution : une entrée « Relancer le jet » dans le menu contextuel natif des
   cartes de chat (clic droit). Elle ne s'affiche que sur les messages qui
   portent réellement un jet, et uniquement pour l'auteur du message ou le MJ.

   Choix de conception :

     - On NE modifie PAS la carte d'origine. Un nouveau message est posté, et
       l'ancien est marqué « relancé » (grisé, total barré). Une valeur qui
       change en silence à la table, c'est le genre de chose qui crée du doute ;
       et créer un message est toujours permis à un joueur, alors que modifier
       un message existant dépend des permissions.

     - Le nouveau message est un CLONE intégral de l'ancien (type, system,
       flags, speaker, whisper…) dont seuls les `rolls` sont ré-évalués. Le
       système conserve donc sa carte complète : boutons d'application de
       dégâts, description, cibles, mode chuchoté, tout est préservé.

     - Les champs que le système dérive du jet (crit/échec, dégâts déjà
       appliqués…) ne peuvent pas être devinés de façon générique : ils passent
       par un adaptateur de système (voir SYSTEM_ADAPTERS) ou par le hook
       public `personalToolboxPrepareReroll`.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/reroll.mjs"]
   ========================================================================= */

const MODULE_ID = "personal-foundry-toolbox";

// Posé sur le NOUVEAU message : { sourceId, generation }.
const FLAG_REROLL = "reroll";

// Posé sur l'ANCIEN message : l'id du message qui le remplace.
const FLAG_SUPERSEDED = "supersededBy";

/* -------------------------------------------------------------------------
   Adaptateurs par système
   -------------------------------------------------------------------------
   Le cœur est agnostique : il relance les formules et rien d'autre. Mais un
   système riche stocke aussi dans `message.system` des données DÉRIVÉES du
   jet, qui deviendraient fausses si on se contentait de recopier l'ancien
   message. Chaque adaptateur reçoit la source du futur message et les jets
   fraîchement relancés, et corrige ces champs-là.
   ------------------------------------------------------------------------- */
const SYSTEM_ADAPTERS = {
  /**
   * Nimble : les cartes d'activation (sort, capacité, objet, réaction) stockent
   * `isCritical` / `isMiss` à plat dans `system`, alors que la vérité vit sur le
   * jet de dégâts (`NimbleDamageRoll` les expose en getters après évaluation).
   * On les recopie depuis le jet relancé plutôt que de réimplémenter la règle.
   */
  nimble(source, rolls) {
    const system = source.system;
    if (!system || typeof system !== "object") return;

    const damageRoll = rolls.find(
      (roll) => typeof roll?.isCritical === "boolean" || typeof roll?.isMiss === "boolean"
    );
    if (damageRoll) {
      if ("isCritical" in system) system.isCritical = damageRoll.isCritical === true;
      if ("isMiss" in system) system.isMiss = damageRoll.isMiss === true;
    }

    // Les dégâts / soins déjà appliqués appartiennent à l'ANCIEN jet : la
    // nouvelle carte doit repartir avec ses boutons d'application intacts.
    if (system.appliedHealing) system.appliedHealing = {};
    if (system.appliedDamage) system.appliedDamage = {};
  },
};

/**
 * Un jet est-il relançable par l'utilisateur courant ?
 * @param {ChatMessage} message
 * @returns {boolean}
 */
function canReroll(message) {
  if (!message?.rolls?.length) return false;

  // Un jet déjà remplacé est un jet mort : on relance sa version courante.
  if (message.getFlag(MODULE_ID, FLAG_SUPERSEDED)) return false;

  return game.user.isGM || message.isAuthor;
}

/**
 * Retrouve le ChatMessage visé par une entrée de menu contextuel.
 * Le callback reçoit l'élément HTML de la ligne (v13) ou un objet jQuery.
 * @param {HTMLElement|JQuery} target
 * @returns {ChatMessage|undefined}
 */
function resolveMessage(target) {
  const element = target instanceof HTMLElement ? target : target?.[0];
  const id =
    element?.dataset?.messageId ??
    element?.closest?.("[data-message-id]")?.dataset?.messageId;
  return id ? game.messages.get(id) : undefined;
}

/**
 * Ré-évalue un jet en repartant de sa formule d'origine.
 *
 * On reconstruit via `roll.constructor` pour préserver les classes de jet
 * personnalisées des systèmes (NimbleRoll, NimbleDamageRoll…), et on privilégie
 * `originalFormula` quand elle existe : certains systèmes pré-traitent la
 * formule à la construction (extraction du dé primaire chez Nimble), si bien
 * que réinjecter la formule DÉJÀ traitée l'altérerait une seconde fois.
 *
 * @param {Roll} roll
 * @returns {Promise<Roll>}
 */
async function rerollFormula(roll) {
  const original = roll.originalFormula;
  const formula = typeof original === "string" && original.trim() ? original : roll.formula;

  try {
    const fresh = new roll.constructor(
      formula,
      foundry.utils.deepClone(roll.data ?? {}),
      foundry.utils.deepClone(roll.options ?? {})
    );
    await fresh.evaluate();
    return fresh;
  } catch (error) {
    // Classe de jet exotique : on retombe sur le reroll générique du core.
    console.warn(`${MODULE_ID} | reconstruction du jet impossible, repli sur Roll#reroll`, error);
    return roll.reroll();
  }
}

/**
 * Relance un message : poste un clone au jet ré-évalué, puis marque l'original.
 * @param {ChatMessage} message
 * @returns {Promise<ChatMessage|null>}
 */
async function rerollMessage(message) {
  if (!canReroll(message)) return null;

  const rolls = [];
  for (const roll of message.rolls) rolls.push(await rerollFormula(roll));

  const source = message.toObject();
  delete source._id;
  delete source.timestamp;
  source.rolls = rolls.map((roll) => JSON.stringify(roll));

  // Le clone ne doit pas hériter du marqueur « remplacé » de son parent.
  const ownFlags = source.flags?.[MODULE_ID];
  if (ownFlags) delete ownFlags[FLAG_SUPERSEDED];

  const generation = (message.getFlag(MODULE_ID, FLAG_REROLL)?.generation ?? 0) + 1;
  foundry.utils.setProperty(source, `flags.${MODULE_ID}.${FLAG_REROLL}`, {
    sourceId: message.id,
    generation,
  });

  SYSTEM_ADAPTERS[game.system.id]?.(source, rolls, message);

  // Point d'extension : un autre module peut corriger ses propres données
  // dérivées avant que le message ne parte.
  Hooks.callAll("personalToolboxPrepareReroll", source, rolls, message);

  // On garde l'auteur d'origine : quand le MJ relance le jet d'un joueur, la
  // carte doit rester attribuée à ce joueur. Si le serveur refuse cette
  // usurpation, on repost sous notre propre nom plutôt que d'échouer.
  let created = null;
  try {
    created = await ChatMessage.implementation.create(source);
  } catch (error) {
    console.warn(`${MODULE_ID} | auteur d'origine refusé, repli sur l'utilisateur courant`, error);
    source.author = game.user.id;
    created = await ChatMessage.implementation.create(source);
  }

  if (created) await message.setFlag(MODULE_ID, FLAG_SUPERSEDED, created.id);
  return created ?? null;
}

/* -------------------------------------------------------------------------
   Menu contextuel (clic droit sur une carte de chat)
   ------------------------------------------------------------------------- */
Hooks.on("getChatMessageContextOptions", (_application, options) => {
  options.push({
    name: "PERSONAL_TOOLBOX.Reroll.ContextLabel",
    icon: '<i class="fa-solid fa-rotate-right"></i>',
    condition: (target) => canReroll(resolveMessage(target)),
    callback: async (target) => {
      const message = resolveMessage(target);
      if (!message) return;
      try {
        await rerollMessage(message);
      } catch (error) {
        console.error(`${MODULE_ID} | échec de la relance`, error);
        ui.notifications.error(game.i18n.localize("PERSONAL_TOOLBOX.Reroll.Failed"));
      }
    },
  });
});

/* -------------------------------------------------------------------------
   Rendu : griser l'ancien jet, signaler le nouveau
   ------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
   Ancrage du badge
   -------------------------------------------------------------------------
   Le `.message-header` du core ne convient pas aux systèmes qui redessinent
   leur propre en-tête dans le contenu du message : chez Nimble il ne reste
   qu'une bande vide AU-DESSUS de la carte, où le badge flotte hors du cadre.

   On vise donc d'abord un point d'ancrage interne à la carte du système, et on
   retombe sur l'en-tête du core pour tout le reste.

     variant "inline" → le parent est un flex : le badge se pousse à droite.
     variant "banner" → le parent est la grille d'en-tête de Nimble : le badge
       se place en tête et la grille gagne une colonne (voir reroll.css).
   ------------------------------------------------------------------------- */
const BADGE_ANCHORS = {
  nimble: [
    // Ligne « image + titre + sous-titre » : c'est l'encart visé.
    { selector: ".nimble-chat-card__body-header", position: "append", variant: "inline" },
    // Repli pour les cartes sans encart de titre : la bande colorée du joueur.
    { selector: ".nimble-chat-card__header", position: "prepend", variant: "banner" },
  ],
};

const CORE_ANCHOR = { selector: ".message-header", position: "append", variant: "inline" };

/**
 * Insère un badge dans la carte d'un message (idempotent).
 * @param {HTMLElement} root
 * @param {string} label
 * @param {string} modifier Suffixe de classe BEM (`superseded` ou `result`).
 */
function addBadge(root, label, modifier) {
  if (root.querySelector(".pft-reroll-badge")) return;

  const anchors = [...(BADGE_ANCHORS[game.system.id] ?? []), CORE_ANCHOR];
  let host = null;
  let anchor = null;
  for (const candidate of anchors) {
    host = root.querySelector(candidate.selector);
    if (host) {
      anchor = candidate;
      break;
    }
  }
  if (!host) return;

  const badge = document.createElement("span");
  badge.className = `pft-reroll-badge pft-reroll-badge--${modifier} pft-reroll-badge--${anchor.variant}`;

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-rotate-right";
  badge.append(icon, document.createTextNode(` ${label}`));

  if (anchor.position === "prepend") host.prepend(badge);
  else host.appendChild(badge);
}

Hooks.on("renderChatMessageHTML", (message, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  if (message.getFlag(MODULE_ID, FLAG_SUPERSEDED)) {
    root.classList.add("pft-reroll-superseded");
    // Les cartes des systèmes à rendu réactif (Svelte chez Nimble) sont montées
    // APRÈS ce hook : on attend le frame suivant pour trouver notre ancrage.
    requestAnimationFrame(() =>
      addBadge(root, game.i18n.localize("PERSONAL_TOOLBOX.Reroll.SupersededBadge"), "superseded")
    );
    return;
  }

  const info = message.getFlag(MODULE_ID, FLAG_REROLL);
  if (!info) return;

  root.classList.add("pft-reroll-result");
  const generation = Number(info.generation) || 1;
  const label =
    generation > 1
      ? game.i18n.format("PERSONAL_TOOLBOX.Reroll.BadgeCount", { n: generation })
      : game.i18n.localize("PERSONAL_TOOLBOX.Reroll.Badge");
  requestAnimationFrame(() => addBadge(root, label, "result"));
});
