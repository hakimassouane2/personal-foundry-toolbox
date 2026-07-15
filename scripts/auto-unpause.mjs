/* =========================================================================
   Toolbox — Retire la pause automatique au chargement du monde
   -------------------------------------------------------------------------
   Foundry met toujours le monde en pause au chargement. Ce script la lève
   dès que le jeu est prêt.

   À charger comme MODULE ES dans ton module.json :
       "esmodules": ["scripts/toolbox-auto-unpause.mjs"]

   Note : l'état de pause est partagé (monde), et seul un MJ peut le diffuser
   aux autres clients. On se limite donc au MJ — quand tu charges le monde,
   ça dépause pour tout le monde.
   ========================================================================= */

Hooks.once("ready", () => {
  if (game.user.isGM && game.paused) {
    // pause = false, broadcast = true -> l'état se propage à tous les clients
    game.togglePause(false, { broadcast: true });
  }
});
