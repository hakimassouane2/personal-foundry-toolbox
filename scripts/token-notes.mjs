/* =========================================================================
   Toolbox : notes de MJ sur les tokens
   -------------------------------------------------------------------------
   Remplace le duo « GM Notes + Token Note Hover » par un seul panneau qui
   sert à la fois à lire et à écrire, sans jamais ouvrir de fenêtre.

     - Survoler un token (MJ uniquement) affiche sa note après un court délai.
     - Cliquer dans le panneau l'épingle et le passe en saisie sur place.
       Échap ou un clic à l'extérieur enregistre et referme.

   Deux notes cohabitent pour un même token :

     - « Fiche »    : posée sur l'ACTEUR de base, donc partagée par tous ses
                      tokens (ce que le monstre sait faire).
     - « Ce token » : posée sur le TokenDocument, donc propre à cet exemplaire
                      posé sur la scène (celui-ci a la clé, il fuit à 10 PV).

   Le texte est brut, avec trois sucres syntaxiques :

     [ ] / [x] en début de ligne -> vraie case à cocher, cliquable en lecture
     - ou * en début de ligne -> puce de liste
     **gras** et *italique*
     @UUID[...]{...} -> lien cliquable, via l'enrichissement de Foundry

   Tout est stocké en flags de monde, jamais côté client : les notes suivent
   d'un navigateur à l'autre. Rien n'est visible ni modifiable par un joueur.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/token-notes.mjs"]
   ========================================================================= */

const MODULE_ID = "personal-foundry-toolbox";
const FLAG = "note";

const DELAY_SETTING = "tokenNoteDelay";
const PROMPT_EMPTY_SETTING = "tokenNotePromptEmpty";

/** Délai de tolérance avant fermeture, le temps que la souris rejoigne le panneau. */
const CLOSE_GRACE = 200;

/** Marge entre le token et le panneau, et entre le panneau et le bord de l'écran. */
const GAP = 6;
const EDGE = 8;

const t = (key, data) => game.i18n.format(`PERSONAL_TOOLBOX.TokenNotes.${key}`, data ?? {});

/** Une ligne « [ ] texte » ou « [x] texte », éventuellement précédée d'une puce. */
const CHECK_RE = /^(\s*(?:[-*]\s+)?)\[([ xX])\]\s?(.*)$/;

/** Une ligne de liste à puces : « - texte » ou « * texte ». */
const BULLET_RE = /^\s*[-*]\s+(.*)$/;

/**
 * État du panneau unique. On n'en affiche jamais deux : le survol d'un autre
 * token remplace le contenu au lieu d'empiler des fenêtres.
 */
const state = {
  /** @type {HTMLElement|null} */ element: null,
  /** @type {Token|null} */ token: null,
  /** Épinglé : le panneau ne se referme plus quand la souris s'en va. */
  editing: false,
  /** Valeurs chargées au dernier rendu, pour ne sauvegarder que ce qui change. */
  loaded: { actor: "", token: "" },
  openTimer: null,
  closeTimer: null,
  /** Incrémenté à chaque rendu : un rendu asynchrone périmé s'abandonne. */
  renderId: 0
};

/* ---------------------------------------------------------------------------
   Lecture et écriture des notes
   ------------------------------------------------------------------------ */

/**
 * Acteur qui porte la note « Fiche ». Sur un token non lié, `token.actor` est
 * un acteur synthétique : y écrire irait dans le delta du token, donc la note
 * ne serait plus partagée. On vise toujours l'acteur du répertoire.
 * @param {TokenDocument} document
 * @returns {Actor|null}
 */
function baseActorOf(tokenDocument) {
  return tokenDocument.baseActor ?? game.actors.get(tokenDocument.actorId) ?? null;
}

/**
 * Les deux notes d'un token.
 * @param {TokenDocument} tokenDocument
 * @returns {{actor: string, token: string}}
 */
function notesOf(tokenDocument) {
  return {
    actor: baseActorOf(tokenDocument)?.getFlag(MODULE_ID, FLAG) ?? "",
    token: tokenDocument.getFlag(MODULE_ID, FLAG) ?? ""
  };
}

/**
 * Enregistre une note, ou efface le flag si le texte est vide : un flag vide
 * traînerait dans l'export du monde sans rien apporter.
 * @param {TokenDocument} tokenDocument
 * @param {"actor"|"token"} scope
 * @param {string} value
 */
async function saveNote(tokenDocument, scope, value) {
  const target = scope === "actor" ? baseActorOf(tokenDocument) : tokenDocument;
  if (!target) return;

  const text = value.trim();
  const key = text ? `flags.${MODULE_ID}.${FLAG}` : `flags.${MODULE_ID}.-=${FLAG}`;
  try {
    await target.update({ [key]: text || null });
  } catch (err) {
    console.error("[toolbox/token-notes]", err);
    ui.notifications.error(t("SaveFailed"));
  }
}

/**
 * Bascule la n-ième case à cocher d'un texte.
 * @param {string} text
 * @param {number} index Rang de la case, dans l'ordre d'apparition.
 * @returns {string} Le texte modifié.
 */
function toggleCheckbox(text, index) {
  let seen = -1;
  return String(text ?? "").split("\n").map(line => {
    const match = CHECK_RE.exec(line);
    if (!match || ++seen !== index) return line;
    const done = match[2] !== " ";
    return `${match[1]}[${done ? " " : "x"}] ${match[3]}`;
  }).join("\n");
}

/* ---------------------------------------------------------------------------
   Rendu du texte
   ------------------------------------------------------------------------ */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Mise en forme d'une ligne : on échappe d'abord, puis on rouvre juste les
 * balises qu'on veut. Les @UUID passent intacts, l'enrichissement s'en charge
 * une fois le document complet assemblé.
 * @param {string} line
 * @returns {string}
 */
function inline(line) {
  return escapeHTML(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\W)\*(?!\s)(.+?)(?<!\s)\*(?=\W|$)/g, "$1<em>$2</em>");
}

/**
 * Transforme le texte d'une note en HTML de lecture.
 * @param {string} text
 * @param {"actor"|"token"} scope Reporté sur les cases, pour savoir quoi sauver.
 * @returns {Promise<string>}
 */
async function renderNote(text, scope) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const parts = [];
  let paragraph = [];
  let items = [];
  let index = 0;

  // Les lignes s'accumulent dans un tampon jusqu'à ce qu'autre chose arrive :
  // un paragraphe regroupe ses lignes, une liste regroupe ses puces.
  const flushParagraph = () => {
    if (paragraph.length) parts.push(`<p>${paragraph.join("<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (items.length) parts.push(`<ul class="pft-note__list">${items.join("")}</ul>`);
    items = [];
  };
  const flush = () => { flushParagraph(); flushList(); };

  for (const line of lines) {
    // Une case à cocher se reconnaît avant la puce : « - [ ] truc » est une
    // case, pas une puce dont le texte commencerait par des crochets.
    const check = CHECK_RE.exec(line);
    if (check) {
      flush();
      const done = check[2] !== " ";
      parts.push(`
        <label class="pft-note__check${done ? " is-done" : ""}">
          <span class="pft-note__check-box">
            <input type="checkbox" data-pft-check="${index++}" data-pft-scope="${scope}"${done ? " checked" : ""}>
          </span>
          <span class="pft-note__check-text">${inline(check[3])}</span>
        </label>`);
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      flushParagraph();
      items.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    flushList();
    if (!line.trim()) flushParagraph();
    else paragraph.push(inline(line));
  }
  flush();

  return textEditor().enrichHTML(parts.join(""), { secrets: true });
}

/* ---------------------------------------------------------------------------
   Position du panneau
   ------------------------------------------------------------------------ */

/**
 * Emprise du token en pixels écran.
 * @param {Token} token
 * @returns {{left: number, top: number, right: number, bottom: number}|null}
 */
function tokenScreenRect(token) {
  const size = canvas.dimensions?.size;
  if (!size || !canvas.stage) return null;

  const { x, y, width, height } = token.document;
  const bounds = token.bounds ?? new PIXI.Rectangle(x, y, width * size, height * size);

  const transform = canvas.stage.worldTransform;
  const topLeft = transform.apply(new PIXI.Point(bounds.x, bounds.y));
  const bottomRight = transform.apply(new PIXI.Point(bounds.right, bounds.bottom));
  const view = canvas.app.view.getBoundingClientRect();

  return {
    left: view.left + topLeft.x,
    top: view.top + topLeft.y,
    right: view.left + bottomRight.x,
    bottom: view.top + bottomRight.y
  };
}

/**
 * Colle le panneau au-dessus du token, ou en dessous s'il déborde en haut.
 * Un panneau détaché du token casserait le trajet de la souris vers lui.
 */
function reposition() {
  if (!state.element || !state.token) return;

  const rect = tokenScreenRect(state.token);
  if (!rect) return;

  const { offsetWidth: width, offsetHeight: height } = state.element;
  const center = (rect.left + rect.right) / 2;

  let left = center - width / 2;
  left = Math.min(Math.max(left, EDGE), window.innerWidth - width - EDGE);

  let top = rect.top - height - GAP;
  if (top < EDGE) top = Math.min(rect.bottom + GAP, window.innerHeight - height - EDGE);

  state.element.style.left = `${Math.round(left)}px`;
  state.element.style.top = `${Math.round(top)}px`;
}

/* ---------------------------------------------------------------------------
   Panneau
   ------------------------------------------------------------------------ */

function buildElement() {
  const element = document.createElement("div");
  element.className = "pft-note";
  element.addEventListener("mouseenter", () => window.clearTimeout(state.closeTimer));
  element.addEventListener("mouseleave", () => { if (!state.editing) scheduleClose(); });

  // Un clic n'importe où dans le corps passe en saisie, sauf sur ce qui a déjà
  // un rôle : case à cocher, lien enrichi, bouton de fermeture.
  element.addEventListener("click", event => {
    const check = event.target.closest("input[data-pft-check]");
    if (check) return onToggleCheck(check);

    // Un clic sur le libellé est relayé par le <label> vers sa case : on laisse
    // faire, le second clic repassera ici avec la case pour cible.
    if (event.target.closest(".pft-note__check")) return;

    if (event.target.closest(".content-link, a, button")) return;
    if (state.editing) return;

    const section = event.target.closest("[data-pft-scope]");
    startEditing(section?.dataset.pftScope ?? "token");
  });

  document.body.append(element);
  return element;
}

/**
 * Reconstruit le contenu du panneau pour le token courant.
 * @param {object} [options]
 * @param {"actor"|"token"} [options.focus] Champ à activer, en saisie.
 */
async function refresh({ focus } = {}) {
  const token = state.token;
  if (!token) return;

  const element = state.element ??= buildElement();
  const notes = notesOf(token.document);
  state.loaded = { ...notes };

  const id = ++state.renderId;
  const sections = state.editing
    ? ["actor", "token"].map(scope => editSection(scope, notes[scope]))
    : await readSections(notes);
  if (id !== state.renderId) return;

  // Ni titre, ni bouton de fermeture, ni ligne d'aide : le panneau est pour un
  // seul MJ qui connaît ses raccourcis, tout l'espace va au texte. La bordure
  // qui change de couleur suffit à signaler la saisie, et Échap referme.
  element.classList.toggle("is-editing", state.editing);
  element.innerHTML = sections.join("");

  for (const area of element.querySelectorAll("textarea")) {
    autosize(area);
    area.addEventListener("input", () => autosize(area));
    area.addEventListener("keydown", onEditKey);
    area.addEventListener("dragover", event => event.preventDefault());
    area.addEventListener("drop", onEditDrop);
  }

  reposition();

  const target = element.querySelector(`textarea[data-pft-edit="${focus ?? "token"}"]`);
  if (target) {
    target.focus();
    target.setSelectionRange(target.value.length, target.value.length);
  }
}

/**
 * Blocs de lecture. On n'étiquette les deux notes que si les deux existent :
 * sur un token qui n'en a qu'une, l'étiquette est du bruit.
 * @param {{actor: string, token: string}} notes
 * @returns {Promise<string[]>}
 */
async function readSections(notes) {
  const both = !!notes.actor && !!notes.token;
  const sections = [];

  for (const scope of ["actor", "token"]) {
    if (!notes[scope]) continue;
    sections.push(`
      <section class="pft-note__section" data-pft-scope="${scope}">
        ${both ? `<span class="pft-note__label">${t(`Scope.${scope}`)}</span>` : ""}
        <div class="pft-note__body">${await renderNote(notes[scope], scope)}</div>
      </section>`);
  }

  if (!sections.length) sections.push(`
    <section class="pft-note__section" data-pft-scope="token">
      <div class="pft-note__body pft-note__body--empty">${t("Empty")}</div>
    </section>`);

  return sections;
}

/**
 * Bloc de saisie. Les deux champs sont toujours présents en saisie, sinon on
 * ne pourrait pas créer la note qui manque.
 * @param {"actor"|"token"} scope
 * @param {string} value
 * @returns {string}
 */
function editSection(scope, value) {
  return `
    <section class="pft-note__section" data-pft-scope="${scope}">
      <span class="pft-note__label">${t(`Scope.${scope}`)}</span>
      <textarea class="pft-note__input" data-pft-edit="${scope}" rows="1"
        placeholder="${t(`Placeholder.${scope}`)}">${escapeHTML(value)}</textarea>
    </section>`;
}

/**
 * Le TextEditor de Foundry. v13 le déplace sous `foundry.applications.ux` ; le
 * global reste en place mais déprécié, d'où le repli.
 * @returns {typeof foundry.applications.ux.TextEditor}
 */
function textEditor() {
  return foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor;
}

/**
 * Dépôt d'un document dans un champ de saisie. Sans ça, glisser une attaque
 * depuis une fiche y collerait le JSON brut du presse-papier de Foundry : on
 * insère le lien @UUID à la place, à la position du curseur.
 * @param {DragEvent} event
 */
async function onEditDrop(event) {
  const editor = textEditor();

  // getDragEventData ne lève pas : il rend {} quand le presse-papier ne porte
  // pas de JSON. Sans « type », ce n'est pas un document Foundry et on laisse
  // le navigateur coller ce qu'il veut.
  const data = editor.getDragEventData(event);
  if (!data?.type) return;

  event.preventDefault();
  event.stopPropagation();

  // Pas de « relativeTo » : on veut un lien absolu, qui reste valide même si
  // la note est relue depuis un autre document.
  const link = await editor.getContentLink(data);
  if (!link) {
    ui.notifications.warn(t("DropFailed"));
    return;
  }

  const area = event.currentTarget;
  area.setRangeText(link, area.selectionStart, area.selectionEnd, "end");
  autosize(area);
  area.focus();
}

/** Une note fait deux lignes ou quinze : le champ suit son contenu. */
function autosize(area) {
  area.style.height = "auto";
  area.style.height = `${area.scrollHeight}px`;
}

/**
 * Ouvre le panneau sur un token.
 * @param {Token} token
 */
async function openPanel(token) {
  state.token = token;
  state.editing = false;
  await refresh();
  state.element?.classList.add("is-open");
}

/**
 * Ferme le panneau, en enregistrant la saisie en cours.
 */
async function closePanel() {
  window.clearTimeout(state.openTimer);
  window.clearTimeout(state.closeTimer);

  if (state.editing) await commit();

  state.renderId++;
  state.editing = false;
  state.token = null;
  state.element?.remove();
  state.element = null;
}

function scheduleClose() {
  window.clearTimeout(state.closeTimer);
  state.closeTimer = window.setTimeout(() => { if (!state.editing) closePanel(); }, CLOSE_GRACE);
}

/**
 * Passe le panneau en saisie et l'épingle.
 * @param {"actor"|"token"} scope Champ qui reçoit le curseur.
 */
function startEditing(scope) {
  window.clearTimeout(state.closeTimer);
  state.editing = true;
  refresh({ focus: scope });
}

/**
 * Enregistre les deux champs, s'ils ont changé.
 */
async function commit() {
  const element = state.element;
  const token = state.token;
  if (!element || !token) return;

  for (const scope of ["actor", "token"]) {
    const area = element.querySelector(`textarea[data-pft-edit="${scope}"]`);
    if (!area) continue;
    if (area.value.trim() === String(state.loaded[scope] ?? "").trim()) continue;
    await saveNote(token.document, scope, area.value);
  }
}

/**
 * Coche ou décoche depuis la lecture, sans passer par la saisie.
 * @param {HTMLInputElement} input
 */
async function onToggleCheck(input) {
  const token = state.token;
  if (!token) return;

  const scope = input.dataset.pftScope;
  const index = Number(input.dataset.pftCheck);
  await saveNote(token.document, scope, toggleCheckbox(state.loaded[scope], index));
  if (state.token === token) refresh();
}

/**
 * Échap referme, Ctrl+Entrée valide et repasse en lecture. Les deux doivent
 * couper la propagation : Foundry écoute Échap pour ses propres fermetures.
 * @param {KeyboardEvent} event
 */
async function onEditKey(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    await closePanel();
    return;
  }
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    event.stopPropagation();
    await commit();
    state.editing = false;
    refresh();
  }
}

/* ---------------------------------------------------------------------------
   Branchements
   ------------------------------------------------------------------------ */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, DELAY_SETTING, {
    name: "PERSONAL_TOOLBOX.TokenNotes.DelayName",
    hint: "PERSONAL_TOOLBOX.TokenNotes.DelayHint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 1500, step: 50 },
    default: 350
  });

  game.settings.register(MODULE_ID, PROMPT_EMPTY_SETTING, {
    name: "PERSONAL_TOOLBOX.TokenNotes.PromptEmptyName",
    hint: "PERSONAL_TOOLBOX.TokenNotes.PromptEmptyHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.on("hoverToken", (token, hovered) => {
  if (!game.user.isGM) return;

  // En saisie, le panneau est épinglé : survoler ailleurs ne doit rien changer,
  // sinon on perd le texte en cours de frappe.
  if (state.editing) return;

  window.clearTimeout(state.openTimer);

  if (!hovered) {
    if (state.token === token) scheduleClose();
    return;
  }

  // Un token qu'on est en train de déplacer n'a pas à être commenté.
  if (token.mouseInteractionManager?.isDragging) return;

  const notes = notesOf(token.document);
  const empty = !notes.actor && !notes.token;
  if (empty && !game.settings.get(MODULE_ID, PROMPT_EMPTY_SETTING)) return;

  window.clearTimeout(state.closeTimer);
  if (state.token === token) return;

  const delay = game.settings.get(MODULE_ID, DELAY_SETTING) ?? 350;
  state.openTimer = window.setTimeout(() => {
    if (token.hover && !state.editing) openPanel(token);
  }, delay);
});

// Le panneau vit au-dessus du canvas : il doit suivre le déplacement de la vue
// et celui de son token.
Hooks.on("canvasPan", () => reposition());

Hooks.on("updateToken", (tokenDocument, changed) => {
  if (state.token?.document !== tokenDocument) return;
  if ("x" in changed || "y" in changed) return reposition();

  // Note modifiée ailleurs (autre client, macro) : on se resynchronise, sauf
  // si c'est nous qui sommes en train de taper.
  if (!state.editing && foundry.utils.hasProperty(changed, `flags.${MODULE_ID}.${FLAG}`)) refresh();
});

Hooks.on("deleteToken", tokenDocument => {
  if (state.token?.document === tokenDocument) closePanel();
});

// La note « Fiche » vit sur l'acteur : elle peut changer depuis un autre client.
Hooks.on("updateActor", (actor, changed) => {
  if (state.editing || !state.token) return;
  if (baseActorOf(state.token.document) !== actor) return;
  if (foundry.utils.hasProperty(changed, `flags.${MODULE_ID}.${FLAG}`)) refresh();
});

Hooks.on("canvasTearDown", () => closePanel());

// Le HUD du token occupe la même place que le panneau, et vise le même geste.
Hooks.on("renderTokenHUD", () => { if (!state.editing) closePanel(); });

Hooks.once("ready", () => {
  if (!game.user.isGM) return;

  // Un clic hors du panneau enregistre et referme, mais « hors du panneau » se
  // juge sur DEUX évènements, pas un seul :
  //
  //   - On écoute « click » et non « pointerdown », parce que commencer à
  //     glisser un objet depuis une fiche ouverte produit un pointerdown mais
  //     jamais de click : le panneau reste en place le temps du dépôt.
  //
  //   - Mais un « click » est dispatché sur le plus proche ancêtre COMMUN du
  //     mousedown et du mouseup. Sélectionner le texte d'un champ en relâchant
  //     hors du panneau vise donc <body>, et refermait le panneau en pleine
  //     sélection. On mémorise où le geste a commencé : parti de l'intérieur,
  //     il ne ferme rien, où qu'il finisse.
  //
  // Les deux écoutes sont en capture, pour passer avant les gestionnaires du
  // canvas qui pourraient avaler l'évènement.
  let startedInside = false;

  document.addEventListener("pointerdown", event => {
    startedInside = !!state.element?.contains(event.target);
  }, { capture: true });

  document.addEventListener("click", event => {
    if (!state.editing || !state.element) return;
    if (startedInside || state.element.contains(event.target)) return;
    closePanel();
  }, { capture: true });
});
