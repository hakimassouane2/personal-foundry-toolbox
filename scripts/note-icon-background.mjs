/* =========================================================================
   Toolbox : masquer le fond sombre des notes de carte
   -------------------------------------------------------------------------
   Les notes du canvas ne sont pas du DOM : aucune règle CSS ne les atteint.
   Le carré arrondi sombre derrière le marqueur est le `bg` du ControlIcon,
   un PIXI.Graphics rempli en noir à 40 % avec un contour noir (voir
   ControlIcon dans le cœur de Foundry). On se contente de le masquer : le
   marqueur, sa bordure de survol et sa zone cliquable restent intacts.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/note-icon-background.mjs"]
   ========================================================================= */

const MODULE_ID = "personal-foundry-toolbox";
const SETTING = "hideNoteIconBackground";

let hidden = true;

/**
 * Applique l'état courant à une note.
 * @param {Note} note La note du canvas.
 */
function apply(note) {
  const bg = note?.controlIcon?.bg;
  if (bg) bg.visible = !hidden;
}

/** Réapplique l'état à toutes les notes de la scène affichée. */
function applyAll() {
  for (const note of canvas.notes?.placeables ?? []) apply(note);
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING, {
    name: "PERSONAL_TOOLBOX.NoteIconBackground.Name",
    hint: "PERSONAL_TOOLBOX.NoteIconBackground.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      hidden = value;
      applyAll();
    }
  });
});

// Chaque note redessinée repasse par ici (changement de scène, d'icône, de taille).
Hooks.on("drawNote", apply);

Hooks.once("ready", () => {
  hidden = game.settings.get(MODULE_ID, SETTING);
  applyAll();
});
