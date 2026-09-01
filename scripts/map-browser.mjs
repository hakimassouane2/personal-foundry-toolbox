/**
 * Map Browser
 * -----------
 * Ajoute un groupe de contrôles « Navigateur de maps » dans la barre d'outils de
 * scène (à gauche). Un clic ouvre une fenêtre de recherche de battlemaps qui
 * interroge Map Atlas (https://mapatlas.orryndnd.com), un index de battlemaps
 * Reddit exposant une API JSON publique.
 *
 * Depuis les résultats on peut, au choix :
 *   - cliquer une vignette pour créer immédiatement une scène ;
 *   - glisser-déposer une vignette sur la zone de dépôt de « Scene Express ».
 *
 * Dans les deux cas, l'image pleine résolution est téléchargée puis transmise à
 * Scene Express (via son propre callback de dépôt), qui se charge de l'upload, de
 * la création de la scène et de la miniature, en respectant tous ses réglages.
 */

const MODULE_ID = "personal-foundry-toolbox";

/** Identifiant du groupe de contrôles ajouté à la barre d'outils. */
const MB_CONTROL = "map-browser";

/** Point d'entrée de l'API de recherche de Map Atlas (renvoie du JSON, CORS ouvert). */
const SEARCH_API = "https://s77djak6x5.us-east-1.awsapprunner.com/search";

/**
 * Type MIME personnalisé transporté par le drag-and-drop interne. Il permet à
 * notre pont de reconnaître un glisser issu du navigateur de maps et de le
 * distinguer d'un vrai dépôt de fichier destiné à Scene Express.
 */
const MB_DND_TYPE = "application/x-personal-toolbox-map";

/** Requête vide → on affiche les maps les plus récentes (jeton reconnu par l'API). */
const NEWEST_QUERY = ":newest:";

/** Nombre de résultats par page renvoyés par l'API (offset `curr` par pas de 30). */
const PAGE_SIZE = 30;

/**
 * Plafond dur de pagination. L'API classe *tout* son corpus (~27 500 maps) par
 * similarité et n'expose ni total ni nombre de pages : sa « dernière page » est
 * la même (~920) pour n'importe quelle recherche, et ne veut donc rien dire.
 * On s'arrête bien avant, là où les résultats ont encore un rapport avec la requête.
 */
const MAX_PAGES = 30;

/**
 * Seuil de pertinence, exprimé en fraction du meilleur score de la première page.
 * On pagine tant que le dernier résultat d'une page reste au-dessus ; en dessous,
 * on cesse de proposer la suite. Un ratio plutôt qu'un seuil absolu, parce que
 * l'échelle des scores varie d'une requête à l'autre.
 */
const RELEVANCE_RATIO = 0.65;

/** Nombre de numéros de page affichés de part et d'autre de la page courante. */
const PAGE_WINDOW = 2;

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

const localize = (key, data) =>
  data ? game.i18n.format(`PERSONAL_TOOLBOX.MapBrowser.${key}`, data)
       : game.i18n.localize(`PERSONAL_TOOLBOX.MapBrowser.${key}`);

/**
 * Lit le score de similarité d'un résultat, quand l'API en fournit un.
 * @param {object} result
 * @returns {number|null}  Le score, ou `null` si l'information est absente.
 */
function similarityOf(result) {
  const score = Number(result?.similarity);
  return Number.isFinite(score) ? score : null;
}

/**
 * Construit la liste des numéros de page à afficher : une fenêtre glissée autour
 * de la page courante, encadrée par la première et, quand on la connaît, par la
 * dernière. Les trous sont matérialisés par `null` (points de suspension).
 *
 * @param {number} current   Index de la page courante (0 = première).
 * @param {number|null} last Index de la dernière page, ou `null` si on l'ignore
 *                           encore : la suite est alors signalée par des points de
 *                           suspension, jamais par un numéro inventé.
 * @returns {Array<number|null>}
 */
function pageItems(current, last) {
  const known = last ?? Math.min(current + PAGE_WINDOW, MAX_PAGES - 1);
  const start = Math.max(0, current - PAGE_WINDOW);
  const end = Math.min(known, current + PAGE_WINDOW);

  const items = [];
  if (start > 0) {
    items.push(0);
    if (start > 1) items.push(null);
  }
  for (let page = start; page <= end; page++) items.push(page);
  if (last === null) items.push(null);
  else if (end < last) {
    if (end < last - 1) items.push(null);
    items.push(last);
  }
  return items;
}

/**
 * Détermine si Scene Express est disponible ET actif. La création de scène repose
 * entièrement sur son callback de dépôt : sans lui, rien ne peut aboutir.
 * @returns {boolean}
 */
function isSceneExpressReady() {
  const cb = game.scene_express_drop?.callbacks?.drop;
  if (!(cb instanceof Function)) return false;
  try {
    return game.settings.get("scene-express", "enableSceneExpress") !== false;
  } catch {
    return false;
  }
}

/**
 * Déduit l'extension d'image (jpg, png, webp…) à partir de l'URL, en la validant
 * contre les extensions d'image reconnues par Foundry.
 * @param {string} url
 * @returns {string}
 */
function inferExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    const ext = match?.[1]?.toLowerCase();
    if (ext && ext in CONST.IMAGE_FILE_EXTENSIONS) return ext;
  } catch { /* URL invalide : on retombe sur le défaut */ }
  return "jpg";
}

/**
 * Construit un nom de fichier propre à partir du titre de la map. Scene Express
 * déduit le nom de la scène de ce nom de fichier (avant l'extension, en
 * remplaçant « _ » et « + » par des espaces) : on évite donc tout point parasite
 * et les caractères invalides pour un système de fichiers.
 * @param {string} title
 * @param {string} ext
 * @returns {string}
 */
function buildFileName(title, ext) {
  let base = (title || "Map")
    .normalize("NFKD")
    .replace(/[^\w \-]/g, "")   // conserve lettres/chiffres/_/espaces/-
    .replace(/\s+/g, " ")
    .trim();
  if (!base) base = "Map";
  return `${base}.${ext}`;
}

/**
 * Télécharge une image pleine résolution puis délègue à Scene Express la création
 * de la scène. On reconstruit un événement de dépôt minimal portant un vrai
 * `File`, exactement ce qu'attend le `handleDrop` de Scene Express.
 * @param {string} url    URL de l'image pleine résolution (i.redd.it).
 * @param {string} title  Titre de la map (deviendra le nom de la scène).
 */
async function createSceneFromUrl(url, title) {
  if (!url) return;

  if (!isSceneExpressReady()) {
    ui.notifications.error(localize("SceneExpressMissing"), { permanent: true });
    return;
  }

  ui.notifications.info(localize("Downloading", { title }));

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();

    const ext = inferExtension(url);
    const type = blob.type || CONST.IMAGE_FILE_EXTENSIONS[ext] || "image/jpeg";
    const file = new File([blob], buildFileName(title, ext), { type });

    // Empreinte des scènes existantes : permet de retrouver, après coup, la scène
    // issue de ce dépôt (Scene Express ne nous la renvoie pas).
    const before = new Set(game.scenes.map(s => s.id));

    // Événement de dépôt synthétique : seul `dataTransfer.files` est lu par
    // Scene Express, mais on fournit une interface complète par prudence.
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    await game.scene_express_drop.callbacks.drop({
      preventDefault() {},
      stopPropagation() {},
      dataTransfer
    });

    // Retrouver puis activer la scène (nouvellement créée, ou existante réutilisée).
    const expectedName = file.name.replace(/\.[^.]+$/, "").replace(/[_+]/g, " ");
    const scene = game.scenes.find(s => !before.has(s.id)) ?? game.scenes.getName(expectedName);
    if (scene) await scene.activate();

    ui.notifications.info(localize("SceneCreated", { title: scene?.name ?? title }));
  } catch (err) {
    console.error("Personal Toolbox | Map Browser |", err);
    ui.notifications.error(localize("DownloadFailed", { title }));
  }
}

/* -------------------------------------------- */
/*  Application de recherche                     */
/* -------------------------------------------- */

class MapBrowserApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "personal-toolbox-map-browser",
    classes: ["personal-toolbox", "map-browser"],
    tag: "div",
    window: {
      title: "PERSONAL_TOOLBOX.MapBrowser.Title",
      icon: "fa-solid fa-map-location-dot",
      resizable: true
    },
    position: { width: 780, height: 700 }
  };

  /** Requête courante (texte tapé par l'utilisateur). @type {string} */
  #query = "";

  /** Identifiant renvoyé par l'API, réémis pour la continuité de session. */
  #uid = null;

  /** Numéro de requête, pour ignorer les réponses obsolètes (anti-course). */
  #reqId = 0;

  /** Page courante (0 = première page). */
  #page = 0;

  /** Y a-t-il vraisemblablement une page suivante ? */
  #hasNext = false;

  /** Index de la dernière page connue, ou `null` tant qu'on ne l'a pas atteinte. */
  #lastPage = null;

  /** Meilleur score de similarité de la page 1, référence du seuil de pertinence. */
  #baseScore = null;

  /** Minuteur de debounce sur la saisie. */
  #debounce = null;

  /* -------------------------------------------- */

  /**
   * Ouvre la fenêtre (ou la ramène au premier plan si déjà ouverte).
   * @returns {MapBrowserApp}
   */
  static show() {
    const existing = foundry.applications.instances.get(this.DEFAULT_OPTIONS.id);
    if (existing) {
      existing.bringToFront();
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
    wrap.className = "ptmb-wrap";
    wrap.innerHTML = `
      <div class="ptmb-searchbar">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" class="ptmb-input" spellcheck="false" autocomplete="off"
               placeholder="${localize("SearchPlaceholder")}">
      </div>
      <p class="ptmb-hint">${localize("Hint")}</p>
      <div class="ptmb-results"></div>
      <div class="ptmb-footer">
        <button type="button" class="ptmb-prev" disabled>
          <i class="fa-solid fa-chevron-left"></i> ${localize("Previous")}
        </button>
        <div class="ptmb-center">
          <nav class="ptmb-pages" aria-label="${localize("Pagination")}"></nav>
          <span class="ptmb-status"></span>
        </div>
        <button type="button" class="ptmb-next" disabled>
          ${localize("Next")} <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>`;
    return wrap;
  }

  /** @override */
  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
    this.#activateListeners(content);
    // Chargement initial : les maps les plus récentes.
    this.#search();
  }

  /* -------------------------------------------- */

  /**
   * Attache les écouteurs (recherche, clic, glisser, « charger plus »).
   * @param {HTMLElement} root  Le contenu de la fenêtre (.window-content).
   */
  #activateListeners(root) {
    const input = root.querySelector(".ptmb-input");
    const grid = root.querySelector(".ptmb-results");
    const prev = root.querySelector(".ptmb-prev");
    const next = root.querySelector(".ptmb-next");

    // Recherche à la frappe, avec un léger debounce. Toute nouvelle recherche
    // repart de la première page.
    input.addEventListener("input", () => {
      this.#query = input.value.trim();
      // Nouvelle requête : le seuil de pertinence et la dernière page connue
      // portaient sur l'ancienne, ils ne valent plus rien.
      this.#lastPage = null;
      this.#baseScore = null;
      if (this.#debounce) clearTimeout(this.#debounce);
      this.#debounce = setTimeout(() => this.#search(0), 300);
    });

    // Clic sur une vignette → création immédiate de la scène.
    grid.addEventListener("click", (event) => {
      const tile = event.target.closest(".ptmb-tile");
      if (!tile) return;
      createSceneFromUrl(tile.dataset.url, tile.dataset.title);
    });

    // Début de glisser → on inscrit un payload que notre pont saura reconnaître
    // au dépôt sur la zone Scene Express (aucune donnée binaire ici : juste l'URL).
    grid.addEventListener("dragstart", (event) => {
      const tile = event.target.closest(".ptmb-tile");
      if (!tile) return;
      const payload = JSON.stringify({ url: tile.dataset.url, title: tile.dataset.title });
      event.dataTransfer.setData(MB_DND_TYPE, payload);
      event.dataTransfer.setData("text/plain", tile.dataset.url);
      event.dataTransfer.effectAllowed = "copy";
    });

    // Saut direct à une page depuis les numéros (délégation : ils sont recréés
    // à chaque recherche).
    root.querySelector(".ptmb-pages").addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;
      const page = Number(button.dataset.page);
      if (Number.isInteger(page) && page !== this.#page) this.#search(page);
    });

    prev.addEventListener("click", () => {
      if (this.#page > 0) this.#search(this.#page - 1);
    });
    next.addEventListener("click", () => {
      if (this.#hasNext) this.#search(this.#page + 1);
    });
  }

  /* -------------------------------------------- */

  /**
   * Affiche une page de résultats. On remplace intégralement le contenu de la
   * grille (pas d'empilement) : le nombre de cards reste borné, donc leur taille
   * ne se dégrade jamais.
   * @param {number} page  Index de page à charger (0 = première).
   */
  async #search(page = 0) {
    const grid = this.element.querySelector(".ptmb-results");
    const prev = this.element.querySelector(".ptmb-prev");
    const next = this.element.querySelector(".ptmb-next");

    page = Math.max(0, Math.min(page, MAX_PAGES - 1));
    const query = this.#query.length ? this.#query : NEWEST_QUERY;
    const curr = page * PAGE_SIZE;

    const reqId = ++this.#reqId;
    // Tant qu'il y a déjà des résultats à l'écran, on laisse les numéros en place,
    // simplement inertes : les masquer ferait clignoter le pied de page à chaque
    // frappe. Le message d'attente n'apparaît donc qu'à grille vide.
    const pages = this.element.querySelector(".ptmb-pages");
    if (grid.childElementCount) pages.classList.add("busy");
    else this.#showStatus("Searching");
    prev.disabled = true;
    next.disabled = true;

    try {
      let url = `${SEARCH_API}?curr=${curr}&query=${encodeURIComponent(query)}`;
      if (this.#uid) url += `&uid=${encodeURIComponent(this.#uid)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (reqId !== this.#reqId) return; // Une requête plus récente a pris le relais.
      if (data.uid) this.#uid = data.uid;

      const results = Array.isArray(data.results) ? data.results : [];

      // Page vide au-delà de la première : on ne l'affiche pas, on rentre au bord.
      // Au passage, on sait désormais où s'arrêtent les résultats.
      if (results.length === 0 && page > 0) {
        this.#lastPage = page - 1;
        this.#hasNext = this.#page < this.#lastPage;
        next.disabled = !this.#hasNext;
        prev.disabled = this.#page === 0;
        this.#renderPager();
        return;
      }

      this.#page = page;
      // Référence du seuil de pertinence : le meilleur score de la première page.
      if (page === 0) this.#baseScore = results.length ? similarityOf(results[0]) : null;
      this.#hasNext = results.length >= PAGE_SIZE
        && page + 1 < MAX_PAGES
        && this.#isRelevant(results.at(-1));
      // On vient de buter sur la fin (plafond ou pertinence) : elle est ici.
      if (!this.#hasNext) this.#lastPage = page;
      else if (this.#lastPage !== null && this.#lastPage <= page) this.#lastPage = null;

      const fragment = document.createDocumentFragment();
      for (const result of results) fragment.appendChild(this.#buildTile(result));
      grid.replaceChildren(fragment);
      grid.scrollTop = 0;

      prev.disabled = page === 0;
      next.disabled = !this.#hasNext;
      // Les numéros disent déjà où l'on est : le statut ne sert plus qu'aux
      // messages transitoires (recherche, résultat vide, erreur).
      if (results.length) this.#renderPager();
      else this.#showStatus("NoResults");
    } catch (err) {
      if (reqId !== this.#reqId) return;
      console.error("Personal Toolbox | Map Browser |", err);
      this.#showStatus("SearchError");
    }
  }

  /* -------------------------------------------- */

  /**
   * Affiche un message transitoire à la place des numéros de page.
   * @param {string} key  Clé de localisation, relative à `MapBrowser`.
   */
  #showStatus(key) {
    const status = this.element.querySelector(".ptmb-status");
    const pages = this.element.querySelector(".ptmb-pages");
    if (pages) {
      pages.hidden = true;
      pages.classList.remove("busy");
    }
    if (!status) return;
    status.hidden = false;
    status.textContent = localize(key);
  }

  /* -------------------------------------------- */

  /**
   * Le dernier résultat d'une page est-il encore assez proche de la requête pour
   * qu'il vaille la peine d'en proposer une suivante ?
   *
   * L'API ne filtre pas : elle classe tout son corpus par similarité et sert une
   * tranche de 30. Sans ce garde-fou, on proposerait des centaines de pages dont
   * l'immense majorité n'a aucun rapport avec ce qui a été tapé.
   *
   * @param {object} last  Dernier résultat de la page qui vient d'arriver.
   * @returns {boolean}  `true` aussi quand l'API ne fournit pas de score : dans le
   *                     doute, on ne bride pas la navigation.
   */
  #isRelevant(last) {
    const score = similarityOf(last);
    if (score === null || this.#baseScore === null || this.#baseScore <= 0) return true;
    return score >= this.#baseScore * RELEVANCE_RATIO;
  }

  /* -------------------------------------------- */

  /**
   * (Re)construit les numéros de page : une fenêtre glissée autour de la page
   * courante, encadrée par la première et (quand on la connaît) la dernière page.
   *
   * Aucune requête supplémentaire : afficher les voisins de la page courante ne
   * demande pas de connaître le total. Tant que la fin n'a pas été atteinte, elle
   * est signalée par des points de suspension plutôt que par un numéro inventé.
   */
  #renderPager() {
    const nav = this.element.querySelector(".ptmb-pages");
    const status = this.element.querySelector(".ptmb-status");
    if (!nav) return;
    if (status) status.hidden = true;
    nav.hidden = false;
    nav.classList.remove("busy");

    const fragment = document.createDocumentFragment();
    for (const item of pageItems(this.#page, this.#lastPage)) {
      if (item === null) {
        const gap = document.createElement("span");
        gap.className = "ptmb-gap";
        gap.textContent = "...";
        fragment.append(gap);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ptmb-page";
      button.dataset.page = String(item);
      button.textContent = String(item + 1);
      button.setAttribute("aria-label", localize("GoToPage", { page: item + 1 }));
      if (item === this.#page) {
        button.classList.add("active");
        button.setAttribute("aria-current", "page");
      }
      fragment.append(button);
    }
    nav.replaceChildren(fragment);
  }

  /* -------------------------------------------- */

  /**
   * Construit une vignette de résultat. On privilégie une preview de taille
   * raisonnable pour la grille ; l'URL pleine résolution est conservée en dataset
   * et n'est téléchargée qu'au moment de créer la scène.
   * @param {object} result  Un élément du tableau `results` de l'API.
   * @returns {HTMLElement}
   */
  #buildTile(result) {
    const fullUrl = result.url;
    // Preview un peu plus grande (640 px) pour des cards nettes une fois agrandies.
    const thumb = result.img_url_res_3 || result.img_url_res_2 || result.source_img_url || fullUrl;
    const title = String(result.title || result.clean_title || "Map").trim();

    const tile = document.createElement("figure");
    tile.className = "ptmb-tile";
    tile.draggable = true;
    tile.dataset.url = fullUrl;
    tile.dataset.title = title;

    const media = document.createElement("div");
    media.className = "ptmb-media";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = thumb;
    img.alt = "";
    img.draggable = false; // c'est la <figure> qui porte le drag, pas l'image

    // Image introuvable (404 / supprimée) → placeholder à la place de la vignette.
    img.addEventListener("error", () => {
      img.remove();
      const placeholder = document.createElement("div");
      placeholder.className = "ptmb-placeholder";
      placeholder.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
      const label = document.createElement("span");
      label.textContent = localize("ImageUnavailable");
      placeholder.append(label);
      media.prepend(placeholder);
    }, { once: true });

    const create = document.createElement("div");
    create.className = "ptmb-create";
    create.innerHTML = `<i class="fa-solid fa-circle-plus"></i>`;
    create.append(` ${localize("CreateScene")}`);

    media.append(img, create);

    // Titre en légende sous l'image : toujours visible, sur une ligne.
    const caption = document.createElement("figcaption");
    caption.className = "ptmb-title";
    caption.textContent = title;
    caption.title = title;

    tile.append(media, caption);
    return tile;
  }
}

/* -------------------------------------------- */
/*  Pont vers la zone de dépôt de Scene Express  */
/* -------------------------------------------- */

let bridgeInstalled = false;

/**
 * Installe (une seule fois) l'interception du glisser-déposer sur la zone de dépôt
 * de Scene Express.
 *
 * Pourquoi c'est nécessaire : Scene Express ne lit que `dataTransfer.files`, or un
 * glisser d'élément DOM ne remplit pas ce tableau. On capture donc le dépôt en
 * amont, on lit notre payload (URL + titre) et on déclenche nous-mêmes le
 * téléchargement puis la création de scène. Les vrais dépôts de fichiers (sans
 * notre payload) sont laissés intacts à Scene Express.
 */
function installSceneExpressBridge() {
  if (bridgeInstalled) return;
  bridgeInstalled = true;

  const hasPayload = (event) => {
    const types = event.dataTransfer?.types;
    return !!types && Array.from(types).includes(MB_DND_TYPE);
  };
  const dropzoneOf = (event) => event.target?.closest?.("#scene-express-dropzone");

  // dragover : autoriser le dépôt (preventDefault) et signaler visuellement la cible.
  document.addEventListener("dragover", (event) => {
    if (!hasPayload(event)) return;
    const dropzone = dropzoneOf(event);
    if (!dropzone) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    dropzone.classList.add("ptmb-dropzone-active");
  }, true);

  document.addEventListener("dragleave", (event) => {
    const dropzone = dropzoneOf(event);
    if (dropzone && !dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove("ptmb-dropzone-active");
    }
  }, true);

  // drop : intercepter uniquement NOS glissers ; sinon laisser passer à Scene Express.
  document.addEventListener("drop", (event) => {
    const dropzone = dropzoneOf(event);
    if (!dropzone) return;
    const raw = event.dataTransfer?.getData(MB_DND_TYPE);
    if (!raw) return; // Vrai fichier : c'est l'affaire de Scene Express.

    event.preventDefault();
    event.stopImmediatePropagation(); // empêche le handler (inopérant) de Scene Express
    dropzone.classList.remove("ptmb-dropzone-active");

    try {
      const { url, title } = JSON.parse(raw);
      createSceneFromUrl(url, title);
    } catch (err) {
      console.error("Personal Toolbox | Map Browser |", err);
    }
  }, true);
}

/* -------------------------------------------- */
/*  Intégration à la barre d'outils              */
/* -------------------------------------------- */

/**
 * Dernier contrôle réellement actif (hors navigateur de maps). Sert à rendre la
 * main au bon calque après l'ouverture de la fenêtre, pour que le groupe ne
 * « colle » jamais comme contrôle actif et reste cliquable à volonté.
 */
let lastControl = "tokens";

Hooks.on("renderSceneControls", (app) => {
  const name = app?.control?.name;
  if (name && name !== MB_CONTROL) lastControl = name;
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;

  controls[MB_CONTROL] = {
    name: MB_CONTROL,
    title: "PERSONAL_TOOLBOX.MapBrowser.Title",
    icon: "fa-solid fa-map-location-dot",
    order: Object.keys(controls).length,
    visible: true,
    activeTool: "search",
    tools: {
      search: {
        name: "search",
        title: "PERSONAL_TOOLBOX.MapBrowser.Open",
        icon: "fa-solid fa-magnifying-glass",
        order: 0,
        button: true,
        onChange: () => MapBrowserApp.show()
      }
    },
    // Ce groupe est un simple bouton : on ouvre la fenêtre à son activation puis on
    // rebascule immédiatement sur le contrôle précédent (le groupe ne doit pas
    // rester actif, sinon il ne serait plus recliquable).
    onChange: (_event, active) => {
      if (!active) return;
      MapBrowserApp.show();
      const back = lastControl && lastControl !== MB_CONTROL ? lastControl : "tokens";
      setTimeout(() => {
        if (ui.controls?.control?.name === MB_CONTROL) ui.controls.activate({ control: back });
      }, 0);
    }
  };
});

Hooks.once("ready", () => installSceneExpressBridge());

Hooks.once("init", () => {
  // Le hook `init` précède le chargement des traductions : on passe des clés,
  // que Foundry résout au moment d'afficher la configuration des raccourcis.
  game.keybindings.register(MODULE_ID, "mapBrowser", {
    name: "PERSONAL_TOOLBOX.MapBrowser.Keybinding",
    hint: "PERSONAL_TOOLBOX.MapBrowser.KeybindingHint",
    editable: [{ key: "KeyM" }],
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    onDown: () => {
      MapBrowserApp.show();
      return true;
    }
  });
});
