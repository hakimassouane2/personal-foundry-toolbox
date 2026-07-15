/* =========================================================================
   Toolbox — Cache le nom des PNJ dans les cartes de chat de Nimble
   -------------------------------------------------------------------------
   Problème : le module « Hide NPC Names » cache le nom des PNJ partout, sauf
   dans les jets du système Nimble. Raison :

     - Hide NPC Names détourne le nom du *token* pour renvoyer le nom de
       remplacement, et fait un remplacement de texte sur cette chaîne.
     - Mais Nimble affiche le *vrai* nom (`speaker.alias` / `system.actorName`,
       figés à la création côté MJ = vrai nom) dans son propre DOM
       (`.nimble-chat-card__header`, `.nimble-hidden-roll`), reconstruit APRÈS
       coup → le remplacement de Hide NPC Names ne le touche pas.

   Solution : après le (re)montage de la carte Nimble, on remplace nous-mêmes
   le nom dans son DOM, via l'API publique de Hide NPC Names
   (`game.hnn.getReplacementInfo`). Calculé par utilisateur : le MJ / le
   propriétaire garde le vrai nom, les joueurs voient le nom masqué.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/hide-npc-names-nimble.mjs"]
   ========================================================================= */

// Mets à true pour réactiver les logs de diagnostic dans la console (F12).
const DEBUG = false;
const log = (...a) => { if (DEBUG) console.log("[toolbox/nimble-hide]", ...a); };

// Le contenu texte de ces éléments EST le nom en entier → on le remplace tout.
const FULL_NAME_SELECTORS = [
  ".nimble-chat-card__header > span",
  ".nimble-hidden-roll__header",
];

// Ici le nom est noyé dans une phrase → on remplace les occurrences du nom.
const EMBEDDED_SELECTORS = [
  ".nimble-hidden-roll__message",
];

/**
 * Résout l'acteur d'un message, même côté joueur (fallback via le token).
 * @param {ChatMessage} message
 * @returns {Actor|null}
 */
function resolveActor(message) {
  let actor = ChatMessage.getSpeakerActor(message.speaker);
  if (actor) return actor;

  const sp = message.speaker;
  if (sp?.scene && sp?.token) {
    const token = game.scenes.get(sp.scene)?.tokens.get(sp.token);
    if (token?.actor) return token.actor;
  }
  return null;
}

/**
 * Applique le masquage sur tous les emplacements connus d'une carte.
 * @param {HTMLElement} root        Élément racine du message.
 * @param {Actor}       actor       Acteur (PNJ) à l'origine du message.
 * @param {string[]}    realNames   Noms réels possibles, triés du + long au + court.
 * @param {string}      displayName Nom à afficher (masqué pour les joueurs).
 */
function maskCard(root, actor, realNames, displayName) {
  // 1) Éléments dont TOUT le contenu est le nom → on écrase entièrement.
  for (const selector of FULL_NAME_SELECTORS) {
    for (const el of root.querySelectorAll(selector)) {
      const before = el.textContent;
      if (before && before !== displayName) {
        el.textContent = displayName;
        log("nom entier:", JSON.stringify(before), "->", JSON.stringify(displayName));
      }
    }
  }

  // 2) Éléments où le nom est dans une phrase → remplacement d'occurrences.
  for (const selector of EMBEDDED_SELECTORS) {
    for (const el of root.querySelectorAll(selector)) {
      const before = el.textContent;
      if (!before) continue;
      let after = before;
      for (const name of realNames) {
        if (name && name !== displayName) after = after.split(name).join(displayName);
      }
      if (after !== before) {
        el.textContent = after;
        log("dans phrase:", JSON.stringify(before), "->", JSON.stringify(after));
      }
    }
  }
}

Hooks.on("renderChatMessageHTML", (message, html) => {
  if (game.system.id !== "nimble") return;
  if (!game.hnn?.getReplacementInfo) { log("game.hnn absent"); return; }

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const actor = resolveActor(message);
  log("render", {
    msgId: message.id,
    whisper: message.whisper,
    alias: message.speaker?.alias,
    systemActorName: message.system?.actorName,
    actor: actor?.name ?? null,
    hasPlayerOwner: actor?.hasPlayerOwner ?? null,
    isGM: game.user.isGM,
  });

  if (!actor || actor.hasPlayerOwner) return;

  const info = game.hnn.getReplacementInfo(actor, actor.name);
  log("replacementInfo", info);
  if (!info.shouldReplace) return;

  // Noms réels à chercher, triés du plus long au plus court pour éviter les
  // remplacements partiels (« Ruffian » dans « Ruffian Fer-Rouge »).
  const realNames = [...new Set(
    [message.system?.actorName, message.speaker?.alias, actor.name].filter(Boolean)
  )].sort((a, b) => b.length - a.length);

  // On repasse APRÈS le (re)montage de la carte Nimble, au prochain frame.
  requestAnimationFrame(() => maskCard(root, actor, realNames, info.displayName));
});
