Hooks.on("renderDialogV2", (dialog, element) => {
  // On ne cible QUE les dialogues de suppression (icône corbeille dans l'en-tête)
  if (!element.querySelector("header .window-icon.fa-trash")) return;

  const yes = element.querySelector('button[data-action="yes"]');
  const no  = element.querySelector('button[data-action="no"]');
  if (!yes) return;

  no?.removeAttribute("autofocus");
  yes.setAttribute("autofocus", "");

  // Foundry applique son propre focus après le rendu : on repasse derrière lui
  requestAnimationFrame(() => yes.focus());
});