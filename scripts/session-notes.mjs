/* =========================================================================
   Toolbox : notes de session
   -------------------------------------------------------------------------
   Remplace « Simple Session Notes » par un bloc-notes ouvert d'une touche,
   pensé pour écrire pendant qu'on maîtrise, pas pour rédiger après coup.

     - N ouvre le panneau, curseur déjà en fin de texte. N le referme.
     - Échap ferme aussi, depuis la saisie.
     - Aucun bouton « Enregistrer » : on sauvegarde au fil de la frappe.

   La saisie est une zone éditable riche : le gras, le barré et les listes se
   voient à l'écran pendant qu'on écrit, pas seulement une fois exportés. Un
   `<textarea>` ne sait afficher que du texte nu, et ProseMirror apporte une
   barre d'outils et un cycle de sauvegarde dont on n'a que faire ici.

     Ctrl+B       gras            Ctrl+Maj+8   liste à puces
     Ctrl+I       italique        Ctrl+Maj+7   liste numérotée
     Ctrl+Maj+X   barré           Tab          décale l'élément de liste

   Les marqueurs markdown fonctionnent aussi, et se transforment dès la frappe :

     - ou *    liste à puces        # ## ###   titre de niveau 1 à 3
     1. ou 1)  liste numérotée       ---        filet de séparation, sur Entrée

   Dans une liste, Entrée ajoute un élément et deux Entrée en sortent, c'est le
   navigateur qui s'en charge. À la fin d'un titre, en revanche, il enchainerait
   un second titre : Entrée y repart donc en paragraphe.

   Le contenu vit en flag sur le document `User` de son auteur. Chacun a donc
   les siennes, MJ comme joueurs, et le cœur empêche d'écrire chez autrui. Le
   stockage étant côté serveur, les notes survivent au changement de navigateur
   ou de machine, et un utilisateur n'existant que dans un monde, elles restent
   cloisonnées par monde. Un réglage `client` (localStorage) le serait aussi,
   mais mourrait avec le cache.

   À ne pas confondre avec de la confidentialité : Foundry envoie les documents
   `User` à tous les clients, donc une note reste lisible en console par un
   curieux. Aucune interface ne la montre, rien ne fuite à l'écran, mais ce
   n'est pas un coffre-fort.

   Rien n'est jamais vidé tout seul. Le bouton « vers le journal » recopie les
   notes dans un journal daté SANS toucher au tampon : revenir dans le monde
   trois semaines plus tard retrouve le texte tel quel. Le vidage est un geste
   séparé, confirmé, et rattrapable une fois. Le bouton d'export n'apparaît
   qu'à qui peut créer un journal, ce qu'un joueur ordinaire ne peut pas dans
   la configuration par défaut de Foundry.

   Attention : Foundry coupe tous les raccourcis dès qu'un champ de saisie a
   le focus (`KeyboardManager#hasFocus`). C'est ce qui évite d'ouvrir le
   panneau en tapant « n » dans le chat, mais c'est aussi pourquoi Échap est
   géré ici par un écouteur maison : ni « core.dismiss » ni
   `escape-active-window.mjs` ne reçoivent la touche pendant la saisie.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/session-notes.mjs"]
   ========================================================================= */

const MODULE_ID = "personal-foundry-toolbox";
const KEY = "PERSONAL_TOOLBOX.SessionNotes";

/**
 * Le tampon courant, en HTML, porté par le document `User` de son auteur. Le
 * cœur n'autorise chacun à modifier que le sien (`user.isGM || user.id ===
 * doc.id`, et les flags ne sont pas dans les champs restreints), ce qui donne
 * exactement ce qu'on veut : le MJ et chaque joueur écrivent chez eux.
 */
const FLAG = "sessionNotes";

/** Ce que contenait le tampon avant le dernier vidage, pour pouvoir l'annuler. */
const BACKUP_FLAG = "sessionNotesBackup";

/**
 * Anciens réglages de monde, où les notes du MJ vivaient avant d'être rendues
 * personnelles. Conservés pour la seule reprise au démarrage.
 */
const SETTING = "sessionNotes";
const BACKUP_SETTING = "sessionNotesBackup";

/** Position et taille de la fenêtre, propres à ce navigateur. */
const POSITION_SETTING = "sessionNotesPosition";

/** Identifiant de l'outil greffé dans les contrôles de token. */
const TOOL = "pt-session-notes";

/** Couleur du dossier de journaux, pour le repérer dans la barre latérale. */
const FOLDER_COLOR = "#5c5c5c";

/**
 * Taille par défaut d'avant l'agrandissement. La fenêtre mémorise ses
 * dimensions à la fermeture : sans ce rattrapage, un monde déjà ouvert une
 * fois resterait bloqué sur l'ancien petit format.
 */
const LEGACY_SIZE = { width: 420, height: 480 };

/**
 * Anti-rebond de la sauvegarde. Toute écriture d'un réglage de monde est
 * diffusée à l'ensemble des clients connectés : sauvegarder à chaque touche
 * inonderait la socket pour rien. À 800 ms, une coupure brutale ne peut coûter
 * qu'une seconde de frappe.
 */
const SAVE_DELAY = 800;

/**
 * Heure à laquelle la journée bascule pour la datation du journal. Une séance
 * qui se termine à 00h30 appartient à la veille, pas au lendemain.
 */
const DAY_START_HOUR = 5;

const t = (key, data) =>
  data ? game.i18n.format(`${KEY}.${key}`, data) : game.i18n.localize(`${KEY}.${key}`);

/**
 * Raccourcis de mise en forme. Ctrl+B et Ctrl+I sont déjà gérés nativement par
 * le navigateur, mais les redéclarer garantit le même comportement partout.
 * Ctrl+Maj+X pour le barré vient de Discord et de Slack, Ctrl+Maj+7 et 8 pour
 * les listes viennent de Google Docs : aucun des deux n'a de convention
 * système, autant reprendre celles que tout le monde a déjà dans les doigts.
 */
const SHORTCUTS = [
  { code: "KeyB", shift: false, command: "bold" },
  { code: "KeyI", shift: false, command: "italic" },
  { code: "KeyX", shift: true, command: "strikeThrough" },
  { code: "Digit8", shift: true, command: "insertUnorderedList" },
  { code: "Digit7", shift: true, command: "insertOrderedList" }
];

/**
 * Marqueurs markdown qui transforment le bloc courant dès qu'on tape l'espace
 * qui les suit. La classe de caractères comprend l'espace insécable : une zone
 * éditable remplace par `&nbsp;` toute espace qui termine une ligne.
 */
const BLOCK_PREFIXES = [
  { re: /^[-*][  ]$/, command: "insertUnorderedList" },
  { re: /^\d+[.)][  ]$/, command: "insertOrderedList" },
  { re: /^#[  ]$/, command: "formatBlock", value: "<h1>" },
  { re: /^##[  ]$/, command: "formatBlock", value: "<h2>" },
  { re: /^###[  ]$/, command: "formatBlock", value: "<h3>" }
];

/** Une ligne réduite à trois tirets ou plus, qui devient un filet sur Entrée. */
const DIVIDER_RE = /^-{3,}$/;

/** Blocs susceptibles de contenir le curseur, pour retrouver la ligne courante. */
const BLOCK_SELECTOR = "p, div, h1, h2, h3, li, blockquote";

/** Balises de présentation produites par `execCommand`, et leur équivalent moderne. */
const TAG_REPLACEMENTS = { B: "strong", I: "em", STRIKE: "s", DIV: "p" };

/* ---------------------------------------------------------------------------
   Lecture et écriture du tampon
   ------------------------------------------------------------------------ */

/**
 * Le tampon, toujours rendu en HTML. Les notes prises avant le passage à
 * l'édition riche sont du texte brut : on les convertit à la lecture, sans
 * réécrire le réglage, pour qu'un retour en arrière reste possible.
 * @returns {string}
 */
function readBuffer() {
  const raw = game.user.getFlag(MODULE_ID, FLAG) ?? "";
  if (!raw.trim()) return "";
  return /<(p|div|ul|ol|br|hr|h[1-6])\b/i.test(raw) ? raw : plainTextToHTML(raw);
}

/**
 * Écrit le tampon sur le document de l'utilisateur courant.
 * @param {string} html
 */
async function writeBuffer(html) {
  try {
    await game.user.setFlag(MODULE_ID, FLAG, html);
  } catch (error) {
    console.error(`${MODULE_ID} | Notes de session : sauvegarde impossible`, error);
  }
}

/** @returns {string} La dernière chose vidée, tant qu'elle est récupérable. */
function readBackup() {
  return game.user.getFlag(MODULE_ID, BACKUP_FLAG) ?? "";
}

/**
 * Met de côté ce qu'on vient de vider, ou efface le filet une fois consommé :
 * un flag vide traînerait dans l'export du monde sans rien apporter.
 * @param {string} html
 */
async function writeBackup(html) {
  try {
    if (html) await game.user.setFlag(MODULE_ID, BACKUP_FLAG, html);
    else await game.user.unsetFlag(MODULE_ID, BACKUP_FLAG);
  } catch (error) {
    console.error(`${MODULE_ID} | Notes de session : filet de vidage impossible`, error);
  }
}

/**
 * Reprise des notes écrites quand elles vivaient encore dans un réglage de
 * monde, partagé et réservé au MJ. On recopie d'abord chez lui, on efface
 * ensuite : dans cet ordre, une coupure au milieu ne perd rien.
 */
async function migrateWorldSetting() {
  if (!game.user.isGM) return;

  const notes = game.settings.get(MODULE_ID, SETTING) ?? "";
  const backup = game.settings.get(MODULE_ID, BACKUP_SETTING) ?? "";
  if (!notes && !backup) return;

  // On ne remplace jamais des notes personnelles déjà écrites.
  if (notes && !game.user.getFlag(MODULE_ID, FLAG)) await writeBuffer(notes);
  if (backup && !readBackup()) await writeBackup(backup);

  await game.settings.set(MODULE_ID, SETTING, "");
  await game.settings.set(MODULE_ID, BACKUP_SETTING, "");
}

/**
 * Contenu en attente d'écriture. Reste `null` quand tout est sauvegardé, ce qui
 * permet à un anti-rebond en retard de ne rien réécrire après un envoi forcé.
 * @type {string|null}
 */
let pendingText = null;

/** Écrit sans attendre ce qui traîne encore en mémoire. */
async function flushSave() {
  if (pendingText === null) return;
  const html = pendingText;
  pendingText = null;
  await writeBuffer(html);
}

const scheduleSave = foundry.utils.debounce(() => flushSave(), SAVE_DELAY);

/* ---------------------------------------------------------------------------
   Conversion et nettoyage du HTML
   ------------------------------------------------------------------------ */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Texte brut vers HTML, un paragraphe par ligne. Sert à deux choses : reprendre
 * des notes écrites avant l'édition riche, et coller du texte venu d'ailleurs.
 * @param {string} text
 * @returns {string}
 */
function plainTextToHTML(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => (line.trim() ? `<p>${escapeHTML(line)}</p>` : "<p><br></p>"))
    .join("");
}

/**
 * Remet le HTML d'`execCommand` au propre avant de le verser dans un journal.
 * Le navigateur produit encore `<b>`, `<i>`, `<strike>` et des `<div>` de
 * bloc : lisibles à l'écran, mais l'éditeur du journal les jette dès qu'on
 * ouvre la page. On les remplace par leurs équivalents, et on retire les
 * attributs de style que rien ne justifie dans un document partagé.
 * @param {string} html
 * @returns {string}
 */
function normalizeHTML(html) {
  const root = document.createElement("div");
  root.innerHTML = html;

  for (const [tag, replacement] of Object.entries(TAG_REPLACEMENTS)) {
    for (const node of [...root.getElementsByTagName(tag)]) {
      const swapped = document.createElement(replacement);
      swapped.append(...node.childNodes);
      node.replaceWith(swapped);
    }
  }

  for (const node of root.querySelectorAll("[style], [class], font")) {
    if (node.tagName === "FONT") {
      node.replaceWith(...node.childNodes);
      continue;
    }
    node.removeAttribute("style");
    node.removeAttribute("class");
  }

  return root.innerHTML;
}

/* ---------------------------------------------------------------------------
   Export vers le journal
   ------------------------------------------------------------------------ */

/**
 * Date de la séance en cours, au format ISO pour que le tri alphabétique du
 * répertoire soit chronologique.
 * @returns {string} Par exemple `2026-09-02`.
 */
function sessionDate() {
  const now = new Date();
  if (now.getHours() < DAY_START_HOUR) now.setDate(now.getDate() - 1);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** @returns {string} L'heure courante, écrite selon la langue de l'interface. */
function timeLabel() {
  return new Date().toLocaleTimeString(game.i18n.lang, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Le dossier qui recueille les journaux de séance, créé au premier export.
 * @returns {Promise<Folder>}
 */
async function sessionFolder() {
  const name = t("JournalFolder");
  const existing = game.folders.find(
    (folder) => folder.type === "JournalEntry" && folder.name === name
  );

  if (existing) {
    // Un dossier créé avant que la couleur soit prévue la reçoit au premier
    // export suivant. Une couleur choisie à la main n'est jamais écrasée.
    if (existing.color === null && game.user.isGM) await existing.update({ color: FOLDER_COLOR });
    return existing;
  }

  // Créer un dossier n'est pas donné à tout le monde : un joueur qui n'en a pas
  // le droit pose son journal à la racine plutôt que de rater son export.
  try {
    return await Folder.create({ name, type: "JournalEntry", color: FOLDER_COLOR });
  } catch (error) {
    console.warn(`${MODULE_ID} | Notes de session : dossier impossible à créer`, error);
    return null;
  }
}

/**
 * Le journal du jour. Celui du MJ garde son nom d'origine ; ceux des joueurs
 * portent le leur, sans quoi deux personnes en créeraient un du même nom sans
 * jamais voir celui de l'autre.
 * @returns {string}
 */
function journalName() {
  const date = sessionDate();
  return game.user.isGM
    ? t("JournalName", { date })
    : t("JournalNamePlayer", { user: game.user.name, date });
}

/**
 * Recopie le tampon dans le journal du jour. Un deuxième export le même soir
 * n'ouvre pas un second journal : il s'ajoute à la page existante derrière un
 * séparateur horodaté. Le tampon, lui, n'est pas touché.
 * @param {string} html
 * @returns {Promise<JournalEntry|null>}
 */
async function exportToJournal(html) {
  const name = journalName();
  const pageName = t("PageName");
  const block = `<p><em>${escapeHTML(timeLabel())}</em></p>${normalizeHTML(html)}`;

  try {
    const entry =
      game.journal.getName(name)
      ?? (await JournalEntry.create({ name, folder: (await sessionFolder())?.id ?? null }));

    const page = entry.pages.getName(pageName);
    if (page) {
      await page.update({ "text.content": `${page.text.content ?? ""}<hr>${block}` });
    } else {
      await entry.createEmbeddedDocuments("JournalEntryPage", [
        {
          name: pageName,
          type: "text",
          text: { content: block, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML }
        }
      ]);
    }

    return entry;
  } catch (error) {
    console.error(`${MODULE_ID} | Notes de session : export vers le journal impossible`, error);
    return null;
  }
}

/* ---------------------------------------------------------------------------
   Édition
   ------------------------------------------------------------------------ */

/**
 * Place le curseur à la fin du contenu et déroule la vue jusqu'en bas : on
 * écrit à la suite sans avoir à viser quoi que ce soit à la souris.
 * @param {HTMLElement} field
 */
function caretToEnd(field) {
  field.focus();
  const range = document.createRange();
  range.selectNodeContents(field);
  range.collapse(false);

  const selection = document.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  field.scrollTop = field.scrollHeight;
}

/**
 * Le bloc qui contient le curseur : paragraphe, titre, élément de liste. Renvoie
 * `null` tant que la saisie est nue, c'est-à-dire avant que le navigateur ait
 * enrobé la première ligne.
 * @param {HTMLElement} field
 * @returns {HTMLElement|null}
 */
function currentBlock(field) {
  const node = document.getSelection()?.anchorNode;
  if (!node || !field.contains(node)) return null;

  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  const block = element?.closest(BLOCK_SELECTOR);
  return block && block !== field ? block : null;
}

/**
 * La ligne courante, bloc quand il y en a un, nœud de texte sinon. Les deux se
 * sélectionnent de la même façon, ce qui suffit pour effacer une ligne entière.
 * @param {HTMLElement} field
 * @returns {Node|null}
 */
function currentLine(field) {
  const node = document.getSelection()?.anchorNode;
  if (!node || !field.contains(node)) return null;
  return currentBlock(field) ?? node;
}

/**
 * Vrai s'il n'y a plus rien après le curseur dans ce bloc.
 * @param {Node} block
 * @returns {boolean}
 */
function caretAtEndOf(block) {
  const selection = document.getSelection();
  if (!selection?.isCollapsed) return false;

  const rest = document.createRange();
  rest.selectNodeContents(block);
  rest.setStart(selection.anchorNode, selection.anchorOffset);
  return !rest.toString().trim();
}

/** Sélectionne tout le contenu d'un nœud, pour le remplacer ensuite. */
function selectContents(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = document.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Applique le marqueur markdown qu'on vient de taper : liste, titre. Le
 * marqueur lui-même est effacé, le bloc prend sa nouvelle forme. C'est le geste
 * markdown, mais le résultat est visible tout de suite.
 * @param {HTMLElement} field
 * @returns {boolean} `true` si un bloc a été transformé.
 */
function autoFormatBlock(field) {
  const selection = document.getSelection();
  if (!selection?.isCollapsed) return false;

  const node = selection.anchorNode;
  if (node?.nodeType !== Node.TEXT_NODE || node.previousSibling) return false;
  if (!field.contains(node)) return false;

  // Dans une liste, « - » reste un tiret : on n'imbrique pas sans le demander.
  if (node.parentElement?.closest("li")) return false;

  const typed = node.textContent.slice(0, selection.anchorOffset);
  const prefix = BLOCK_PREFIXES.find((entry) => entry.re.test(typed));
  if (!prefix) return false;

  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, selection.anchorOffset);
  selection.removeAllRanges();
  selection.addRange(range);

  document.execCommand("delete");
  document.execCommand(prefix.command, false, prefix.value);
  return true;
}

/* ---------------------------------------------------------------------------
   Fenêtre
   ------------------------------------------------------------------------ */

class SessionNotesApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "personal-toolbox-session-notes",
    classes: ["personal-toolbox", "session-notes"],
    tag: "div",
    window: {
      title: `${KEY}.Title`,
      icon: "fa-solid fa-pen-to-square",
      resizable: true
    },
    position: { width: 760, height: 840 }
  };

  /**
   * Le monde figure dans le titre : les notes lui sont propres, et deux mondes
   * ouverts dans deux onglets ne se distinguent plus une fois la fenêtre posée.
   * @inheritDoc
   */
  get title() {
    return t("Title", { world: game.world.title });
  }

  /** @inheritDoc */
  async _renderHTML(_context, _options) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="pt-session-notes">
        <div class="pt-session-notes__text" contenteditable="true" spellcheck="false"></div>
        <div class="pt-session-notes__actions">
          <button type="button" data-action="clear"></button>
          ${game.user.can("JOURNAL_CREATE") ? `
            <button type="button" data-action="journal">
              <i class="fa-solid fa-book"></i> ${t("ToJournal")}
            </button>` : ""}
        </div>
      </div>`;
    return wrapper.firstElementChild;
  }

  /** @inheritDoc */
  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  /** @inheritDoc */
  _onRender(_context, _options) {
    const field = this.#field;

    // Sans ça, le navigateur écrit la mise en forme en styles en ligne, qui ne
    // survivraient pas au passage dans une page de journal.
    document.execCommand("styleWithCSS", false, false);

    field.innerHTML = readBuffer();
    field.addEventListener("input", () => {
      autoFormatBlock(field);
      this.#onEdit();
    });

    // Quitter le champ sauvegarde tout de suite : c'est le moment où l'on
    // repart vers la table, donc celui où une perte se verrait.
    field.addEventListener("blur", () => flushSave());

    // Le collage arrive en texte nu. Récupérer la mise en forme d'une page web
    // amènerait ses polices et ses couleurs dans les notes.
    field.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text) document.execCommand("insertText", false, text);
    });

    field.addEventListener("keydown", (event) => this.#onKeyDown(event));

    // Absent pour qui n'a pas le droit de créer un journal, un joueur ordinaire
    // dans la configuration par défaut de Foundry.
    this.element
      .querySelector('[data-action="journal"]')
      ?.addEventListener("click", () => this.#export());
    this.element
      .querySelector('[data-action="clear"]')
      .addEventListener("click", () => this.#clearOrRestore());

    this.#refreshClearButton();
    caretToEnd(field);
  }

  /** @inheritDoc */
  async _preClose(_options) {
    await flushSave();
    const { left, top, width, height } = this.position;
    await game.settings.set(MODULE_ID, POSITION_SETTING, { left, top, width, height });
  }

  /** @returns {HTMLElement} */
  get #field() {
    return this.element.querySelector(".pt-session-notes__text");
  }

  /**
   * Tout passe par ici : Foundry ne transmet aucun raccourci tant qu'une zone
   * de saisie a le focus, donc Échap comme la mise en forme sont à notre
   * charge.
   * @param {KeyboardEvent} event
   */
  #onKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      const field = this.#field;
      const line = currentLine(field);

      // Une ligne de trois tirets devient un filet, comme le « --- » markdown.
      if (line && DIVIDER_RE.test(line.textContent.trim())) {
        event.preventDefault();
        selectContents(line);
        document.execCommand("delete");
        document.execCommand("insertHorizontalRule");
        this.#onEdit();
        return;
      }

      // Sans ça, le navigateur enchaine un second titre sous le premier.
      const heading = currentBlock(field);
      if (heading && /^H[1-3]$/.test(heading.tagName) && caretAtEndOf(heading)) {
        event.preventDefault();
        document.execCommand("insertParagraph");
        document.execCommand("formatBlock", false, "<p>");
        this.#onEdit();
        return;
      }
    }

    // Dans une liste, Tab décale l'élément au lieu de quitter la fenêtre.
    if (event.key === "Tab" && document.getSelection()?.anchorNode?.parentElement?.closest("li")) {
      event.preventDefault();
      document.execCommand(event.shiftKey ? "outdent" : "indent");
      this.#onEdit();
      return;
    }

    if (!event.ctrlKey && !event.metaKey) return;
    const shortcut = SHORTCUTS.find(
      (entry) => entry.code === event.code && entry.shift === event.shiftKey
    );
    if (!shortcut) return;

    event.preventDefault();
    document.execCommand(shortcut.command);
    this.#onEdit();
  }

  /**
   * Une frappe, ou une mise en forme au clavier : on programme la sauvegarde
   * et on remet le bouton de droite d'accord avec ce que contient le champ.
   */
  #onEdit() {
    pendingText = this.#field.innerHTML;
    scheduleSave();
    this.#refreshClearButton();
  }

  /** @returns {boolean} Vrai si le champ ne contient rien de lisible. */
  get #isEmpty() {
    return !this.#field.textContent.trim();
  }

  /**
   * Le bouton de droite vide le tampon, ou rend la dernière chose vidée tant
   * qu'on n'a rien réécrit par-dessus. Appelé à chaque frappe, d'où la sortie
   * anticipée : on ne réécrit le bouton que lorsqu'il change de rôle.
   */
  #refreshClearButton() {
    const button = this.element.querySelector('[data-action="clear"]');
    const restorable = this.#isEmpty && !!readBackup();
    if (button.dataset.restorable === String(restorable)) return;

    button.dataset.restorable = String(restorable);
    button.innerHTML = restorable
      ? `<i class="fa-solid fa-rotate-left"></i> ${t("Undo")}`
      : `<i class="fa-solid fa-eraser"></i> ${t("Clear")}`;
    button.classList.toggle("is-destructive", !restorable);
  }

  async #export() {
    if (this.#isEmpty) return;

    await flushSave();
    await exportToJournal(this.#field.innerHTML);
  }

  async #clearOrRestore() {
    const backup = readBackup();
    const current = this.#field.innerHTML;

    if (this.#isEmpty && backup) {
      await writeBackup("");
      pendingText = null;
      await writeBuffer(backup);
      this.#field.innerHTML = backup;
    } else {
      if (this.#isEmpty) return;

      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: t("ConfirmTitle"), icon: "fa-solid fa-eraser" },
        content: `<p>${t("ConfirmContent")}</p>`,
        modal: true,
        rejectClose: false
      });
      if (!confirmed) return;

      await writeBackup(current);
      pendingText = null;
      await writeBuffer("");
      this.#field.innerHTML = "";
    }

    this.#refreshClearButton();
    caretToEnd(this.#field);
  }

  /**
   * Recharge le contenu quand la note a changé ailleurs, typiquement un second
   * onglet ouvert sur le même monde. On ne touche à rien pendant la saisie :
   * personne ne se fait voler ce qu'il est en train d'écrire.
   */
  syncFromFlag() {
    if (!this.rendered) return;
    if (pendingText !== null) return;
    if (this.element.contains(document.activeElement)) return;
    this.#field.innerHTML = readBuffer();
    this.#refreshClearButton();
  }
}

/* ---------------------------------------------------------------------------
   Intégration à Foundry
   ------------------------------------------------------------------------ */

/** @type {SessionNotesApp|null} */
let instance = null;

/** Ouvre le panneau, ou le referme s'il est déjà là : la touche fait les deux. */
function toggleNotes() {
  if (instance?.rendered) {
    instance.close();
    return;
  }
  const position = game.settings.get(MODULE_ID, POSITION_SETTING) ?? {};
  instance = new SessionNotesApp({ position });
  instance.render({ force: true });
}

Hooks.once("init", () => {
  // Les deux réglages de monde ne servent plus qu'à `migrateWorldSetting` :
  // sans enregistrement, `game.settings.get` refuserait de les lire.
  game.settings.register(MODULE_ID, SETTING, {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, BACKUP_SETTING, {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, POSITION_SETTING, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  // Le hook `init` précède le chargement des traductions : on passe des clés,
  // que Foundry résout au moment d'afficher la configuration des raccourcis.
  game.keybindings.register(MODULE_ID, "sessionNotes", {
    name: `${KEY}.Keybinding`,
    hint: `${KEY}.KeybindingHint`,
    editable: [{ key: "KeyN" }],
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    onDown: () => {
      toggleNotes();
      return true;
    }
  });
});

Hooks.once("ready", () => {
  migrateWorldSetting().catch((error) => {
    console.error(`${MODULE_ID} | Notes de session : reprise des anciennes notes impossible`, error);
  });

  const saved = game.settings.get(MODULE_ID, POSITION_SETTING) ?? {};
  if (saved.width !== LEGACY_SIZE.width || saved.height !== LEGACY_SIZE.height) return;
  // On garde l'endroit où la fenêtre était posée, on rend la taille au défaut.
  game.settings.set(MODULE_ID, POSITION_SETTING, { left: saved.left, top: saved.top });
});

// Filet de sécurité : au rechargement de la page, on tente l'écriture de ce qui
// n'a pas encore été sauvegardé. Le message part sans qu'on puisse en attendre
// la confirmation, d'où l'anti-rebond court plus haut.
window.addEventListener("beforeunload", () => { flushSave(); });

Hooks.on("updateUser", (user, changes) => {
  if (user.id !== game.user.id) return;
  if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${FLAG}`)) return;
  instance?.syncFromFlag();
});

/**
 * Un simple bouton (`button: true`) déclenche son `onChange` sans devenir
 * l'outil actif : pas besoin de rebasculer sur le contrôle précédent après.
 */
Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls.tokens;
  if (!tokens?.tools) return;

  tokens.tools[TOOL] = {
    name: TOOL,
    title: `${KEY}.Open`,
    icon: "fa-solid fa-pen-to-square",
    button: true,
    onChange: () => toggleNotes(),
    order: 102
  };
});

export { SessionNotesApp };
