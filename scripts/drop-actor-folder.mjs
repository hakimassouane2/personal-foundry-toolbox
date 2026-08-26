/* =========================================================================
   Toolbox : déposer un dossier d'acteurs sur la scène
   -------------------------------------------------------------------------
   Foundry ne sait déposer qu'un acteur à la fois sur le canvas : un dossier
   glissé depuis la barre latérale est simplement ignoré. Ce script reprend la
   fonctionnalité de « DF Dropable » : on glisse un dossier d'acteurs, tous les
   acteurs qu'il contient sont posés en tokens sur des cases distinctes mais
   adjacentes, en bloc à peu près carré à partir de la case survolée.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/drop-actor-folder.mjs"]
   ========================================================================= */

const MODULE_ID = "personal-foundry-toolbox";
const SUBFOLDERS_SETTING = "dropFolderIncludeSubfolders";
const CONFIRM_SETTING = "dropFolderConfirmThreshold";

const t = (key, data) => game.i18n.format(`PERSONAL_TOOLBOX.DropActorFolder.${key}`, data ?? {});

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SUBFOLDERS_SETTING, {
    name: "PERSONAL_TOOLBOX.DropActorFolder.SubfoldersName",
    hint: "PERSONAL_TOOLBOX.DropActorFolder.SubfoldersHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, CONFIRM_SETTING, {
    name: "PERSONAL_TOOLBOX.DropActorFolder.ConfirmName",
    hint: "PERSONAL_TOOLBOX.DropActorFolder.ConfirmHint",
    scope: "client",
    config: true,
    type: Number,
    default: 12,
    range: { min: 0, max: 50, step: 1 }
  });
});

/**
 * Résout le dossier ciblé par un drop, quelle que soit la forme des données
 * (v13 fournit un uuid, d'anciennes versions un simple id).
 * @param {object} data Données du drop.
 * @returns {Promise<Folder|null>}
 */
async function resolveFolder(data) {
  if (data.uuid) {
    const doc = await fromUuid(data.uuid);
    return doc instanceof Folder ? doc : null;
  }
  return data.id ? (game.folders.get(data.id) ?? null) : null;
}

/**
 * Collecte les acteurs d'un dossier, éventuellement ceux des sous-dossiers.
 * @param {Folder} folder Dossier d'acteurs déposé.
 * @param {boolean} recursive Inclure les sous-dossiers.
 * @returns {Actor[]}
 */
function collectActors(folder, recursive) {
  const folders = recursive ? [folder, ...folder.getSubfolders(true)] : [folder];
  const actors = folders.flatMap(f => f.contents);
  // Un même acteur ne peut vivre que dans un dossier, mais on reste prudent.
  return [...new Set(actors)];
}

/**
 * Calcule les positions du bloc de tokens : un carré, cases adjacentes, dont
 * le coin haut-gauche est la case survolée au moment du drop.
 * @param {{x: number, y: number}} origin Point du drop, en coordonnées scène.
 * @param {number} count Nombre de tokens à placer.
 * @param {number} stepCol Largeur d'un emplacement, en cases.
 * @param {number} stepRow Hauteur d'un emplacement, en cases.
 * @returns {{x: number, y: number}[]}
 */
function layoutPositions(origin, count, stepCol, stepRow) {
  const grid = canvas.grid;
  const base = grid.getOffset(origin);
  const cols = Math.ceil(Math.sqrt(count));

  return Array.fromRange(count).map(index => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    return grid.getTopLeftPoint({
      i: base.i + (row * stepRow),
      j: base.j + (col * stepCol)
    });
  });
}

/**
 * Crée les tokens du dossier sur la scène active.
 * @param {Folder} folder Dossier d'acteurs.
 * @param {{x: number, y: number}} origin Point du drop.
 */
async function dropFolder(folder, origin) {
  const actors = collectActors(folder, game.settings.get(MODULE_ID, SUBFOLDERS_SETTING));
  if (!actors.length) {
    ui.notifications.warn(t("EmptyFolder", { folder: folder.name }));
    return;
  }

  const threshold = game.settings.get(MODULE_ID, CONFIRM_SETTING);
  if (threshold > 0 && actors.length > threshold) {
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title: t("ConfirmTitle") },
      content: `<p>${t("ConfirmContent", { n: actors.length, folder: folder.name })}</p>`
    });
    if (!proceed) return;
  }

  // Un emplacement assez grand pour le plus gros token du lot : personne ne
  // se marche dessus, même si le dossier mêle gobelins et dragons.
  const stepCol = Math.max(1, ...actors.map(a => Math.ceil(a.prototypeToken.width || 1)));
  const stepRow = Math.max(1, ...actors.map(a => Math.ceil(a.prototypeToken.height || 1)));
  const positions = layoutPositions(origin, actors.length, stepCol, stepRow);

  const tokens = [];
  for (const [index, actor] of actors.entries()) {
    // getTokenDocument applique le prototype (image aléatoire, effets, etc.).
    const token = await actor.getTokenDocument(positions[index]);
    tokens.push(token.toObject());
  }

  const created = await canvas.scene.createEmbeddedDocuments("Token", tokens);
  ui.notifications.info(t("Dropped", { n: created.length, folder: folder.name }));
}

Hooks.on("dropCanvasData", (canvasRef, data) => {
  if (data.type !== "Folder") return;

  // On rend la main tout de suite : le hook est synchrone, le travail non.
  (async () => {
    const folder = await resolveFolder(data);
    if (!folder || folder.type !== "Actor") return;

    if (!game.user.can("TOKEN_CREATE")) {
      ui.notifications.warn(t("NoPermission"));
      return;
    }

    try {
      await dropFolder(folder, { x: data.x, y: data.y });
    } catch (err) {
      console.error("[toolbox/drop-actor-folder]", err);
      ui.notifications.error(t("Failed", { folder: folder.name }));
    }
  })();

  return false;
});
