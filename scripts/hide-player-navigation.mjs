/* Toolbox — marque le rôle sur le <body> pour permettre des tweaks CSS ciblés.
   Pose .toolbox-player quand l'utilisateur N'EST PAS staff (ni MJ ni assistant).
   Réutilisable pour tout futur comportement "joueur uniquement". */
Hooks.once("ready", () => {
  const isStaff = game.user.role >= CONST.USER_ROLES.ASSISTANT; // ASSISTANT(3) + MJ(4)
  document.body.classList.toggle("toolbox-player", !isStaff);
});