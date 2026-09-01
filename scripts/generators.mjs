/**
 * Générateurs
 * -----------
 * Une fenêtre unique qui rassemble les générateurs de contenu improvisé, ceux
 * qu'on ouvre en pleine partie quand les joueurs vont là où rien n'était prévu.
 * Elle s'ouvre depuis la barre d'outils de scène ou, plus vite, au raccourci
 * clavier, et produit un résultat sans qu'aucun réglage ne soit nécessaire :
 * la fenêtre a déjà généré quelque chose au moment où elle s'affiche.
 *
 * L'ajout d'un générateur tient en deux lignes : importer son module ici et
 * l'ajouter à `GENERATORS`. Chaque générateur expose un objet
 * `{ id, icon, title, create() }` dont `create()` renvoie un panneau
 * `{ element, roll(), journal() }` autonome, maître de son propre contenu.
 *
 * Le contenu produit est en français et le restera : ces tables ne sont pas
 * traduisibles au sens habituel, elles sont écrites dans une langue donnée
 * (voir `generators/grammar.mjs`). Seule l'interface est localisée.
 */

import { ambianceGenerator } from "./generators/ambiance.mjs";
import { namesGenerator } from "./generators/names.mjs";
import { tavernMenuGenerator } from "./generators/tavern-menu.mjs";

/**
 * Doit être l'identifiant réel du module : c'est lui qui range les raccourcis
 * sous le nom du module dans la configuration des contrôles. Un namespace
 * fantaisiste les envoie dans la catégorie « Non répertorié ».
 */
const MODULE_ID = "personal-foundry-toolbox";

/** Identifiant de l'outil greffé dans les contrôles de token. */
const TOOL = "pt-generators";

/** Nom du journal qui recueille les pages exportées. */
const JOURNAL_NAME = "Générateurs";

/** Générateurs disponibles, dans l'ordre des onglets. */
const GENERATORS = [tavernMenuGenerator, namesGenerator, ambianceGenerator];

const localize = (key, data) =>
  data ? game.i18n.format(`PERSONAL_TOOLBOX.Generators.${key}`, data)
       : game.i18n.localize(`PERSONAL_TOOLBOX.Generators.${key}`);

/* -------------------------------------------- */
/*  Fenêtre                                      */
/* -------------------------------------------- */

class GeneratorsApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "personal-toolbox-generators",
    classes: ["personal-toolbox", "generators"],
    tag: "div",
    window: {
      title: "PERSONAL_TOOLBOX.Generators.Title",
      icon: "fa-solid fa-wand-magic-sparkles",
      resizable: true
    },
    position: { width: 620, height: 780 }
  };

  /** Panneaux déjà construits, indexés par identifiant de générateur. @type {Map<string, object>} */
  #panels = new Map();

  /** Générateur affiché. @type {string} */
  #active = GENERATORS[0].id;

  /* -------------------------------------------- */

  /**
   * Ouvre la fenêtre, ou relance le générateur affiché si elle l'est déjà.
   * C'est ce qui rend le raccourci clavier utilisable en rafale : on le
   * martèle jusqu'à tomber sur un résultat qui plaît.
   * @returns {GeneratorsApp}
   */
  static openOrRoll() {
    const existing = foundry.applications.instances.get(this.DEFAULT_OPTIONS.id);
    if (existing) {
      existing.bringToFront();
      existing.rollActive();
      return existing;
    }
    const app = new this();
    app.render({ force: true });
    return app;
  }

  /* -------------------------------------------- */

  /** @override */
  async _renderHTML(_context, _options) {
    const wrap = document.createElement("div");
    wrap.className = "ptg-wrap";

    const tabs = GENERATORS.map((generator) => `
      <button type="button" class="ptg-tab${generator.id === this.#active ? " active" : ""}"
              data-generator="${generator.id}">
        <i class="${generator.icon}"></i> ${game.i18n.localize(generator.title)}
      </button>`).join("");

    wrap.innerHTML = `
      <nav class="ptg-tabs">${tabs}</nav>
      <div class="ptg-body"></div>
      <footer class="ptg-footer">
        <button type="button" class="ptg-journal">
          <i class="fa-solid fa-book"></i> ${localize("ToJournal")}
        </button>
      </footer>`;

    return wrap;
  }

  /** @override */
  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);

    content.querySelector(".ptg-tabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-generator]");
      if (button) this.#activate(button.dataset.generator);
    });

    content.querySelector(".ptg-journal").addEventListener("click", () => this.#exportToJournal());

    this.#activate(this.#active);
  }

  /* -------------------------------------------- */

  /**
   * Affiche un générateur, en construisant son panneau au premier passage. Les
   * panneaux sont conservés d'un onglet à l'autre : revenir sur un onglet
   * retrouve le résultat qu'on y avait laissé.
   * @param {string} id
   */
  #activate(id) {
    const generator = GENERATORS.find((g) => g.id === id);
    if (!generator) return;

    this.#active = id;

    let panel = this.#panels.get(id);
    if (!panel) {
      panel = generator.create();
      this.#panels.set(id, panel);
    }

    const body = this.element.querySelector(".ptg-body");
    body.replaceChildren(panel.element);

    for (const tab of this.element.querySelectorAll(".ptg-tab")) {
      tab.classList.toggle("active", tab.dataset.generator === id);
    }
  }

  /* -------------------------------------------- */

  /** Relance le générateur affiché. */
  rollActive() {
    this.#panels.get(this.#active)?.roll?.();
  }

  /* -------------------------------------------- */

  /**
   * Verse le résultat affiché dans une page de journal. Toutes les pages
   * atterrissent dans un même journal, pour ne pas semer un document par
   * génération dans la barre latérale.
   */
  async #exportToJournal() {
    const page = this.#panels.get(this.#active)?.journal?.();
    if (!page) return;

    try {
      const entry = game.journal.getName(JOURNAL_NAME)
        ?? await JournalEntry.create({ name: JOURNAL_NAME });

      const [created] = await entry.createEmbeddedDocuments("JournalEntryPage", [{
        name: page.name,
        type: "text",
        text: { content: page.content, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML }
      }]);

      entry.sheet.render(true, { pageId: created.id });
      ui.notifications.info(localize("JournalCreated", { name: page.name }));
    } catch (error) {
      console.error(`${MODULE_ID} | Génération : export vers le journal impossible`, error);
      ui.notifications.error(localize("JournalFailed"));
    }
  }
}

/* -------------------------------------------- */
/*  Intégration à Foundry                        */
/* -------------------------------------------- */

/**
 * L'ouverture se greffe dans les outils de token plutôt que dans un groupe de
 * contrôles à part. Un groupe dédié coûte une colonne dans la barre de gauche
 * et oblige à rebasculer sur le contrôle précédent après chaque clic, puisqu'il
 * ne correspond à aucun calque. Un simple bouton (`button: true`) déclenche son
 * `onChange` sans jamais devenir l'outil actif.
 */
Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls.tokens;
  if (!tokens?.tools) return;

  tokens.tools[TOOL] = {
    name: TOOL,
    title: "PERSONAL_TOOLBOX.Generators.Open",
    icon: "fa-solid fa-wand-magic-sparkles",
    button: true,
    visible: game.user.isGM,
    onChange: () => GeneratorsApp.openOrRoll(),
    order: 101
  };
});

Hooks.once("init", () => {
  // Le hook `init` précède le chargement des traductions : on passe des clés,
  // que Foundry résout au moment d'afficher la configuration des raccourcis.
  game.keybindings.register(MODULE_ID, "generators", {
    name: "PERSONAL_TOOLBOX.Generators.Keybinding",
    hint: "PERSONAL_TOOLBOX.Generators.KeybindingHint",
    editable: [{ key: "KeyG", modifiers: ["Shift"] }],
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    onDown: () => {
      GeneratorsApp.openOrRoll();
      return true;
    }
  });
});
