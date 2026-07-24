/**
 * Shared Timer
 * ------------
 * Un minuteur partagé et synchronisé entre tous les membres de la partie. N'importe
 * qui (MJ ou joueur, selon un réglage) peut le lancer, le mettre en pause, le
 * prolonger ou l'arrêter : tout le monde voit le même compte à rebours à l'écran.
 *
 * Typiquement pour suivre une torche d'une heure façon Shadowdark.
 *
 * Synchronisation
 * ---------------
 *  - L'état du timer est stocké dans un réglage de MONDE. Foundry le propage
 *    automatiquement à tous les clients connectés (callback `onChange`), qui
 *    rafraîchissent leur widget : pas besoin de diffuser quoi que ce soit à la main.
 *  - Le compte à rebours s'appuie sur `game.time.serverTime` (l'horloge du serveur,
 *    identique sur tous les clients) plutôt que sur l'horloge locale : aucune dérive
 *    entre les machines.
 *  - Seuls les MJ peuvent écrire un réglage de monde. Quand un JOUEUR agit, sa
 *    demande est relayée au MJ via un socket ; c'est le MJ « responsable » qui
 *    persiste l'état, lequel est alors rediffusé à tous.
 */

/**
 * Doit correspondre EXACTEMENT à l'`id` de module.json : le canal de socket
 * `module.<id>` n'est relayé par le serveur que pour un module actif déclarant
 * `"socket": true`. Un id erroné fait échouer silencieusement le relais joueur → MJ.
 */
const MODULE_ID = "personal-foundry-toolbox";

/** Réglage de monde : l'état courant du timer (partagé par tous). */
const STATE_SETTING = "sharedTimerState";

/** Réglage client : position à l'écran du widget (propre à chaque utilisateur). */
const POS_SETTING = "sharedTimerPosition";

/**
 * Réglage client : l'utilisateur a-t-il masqué le widget ? Purement local et
 * visuel, sans effet sur l'état partagé : le timer continue de tourner et son
 * alarme d'expiration reste jouée. Chacun choisit d'afficher ou non le sien.
 */
const HIDDEN_SETTING = "sharedTimerHidden";

/** Réglage de monde : les joueurs ont-ils le droit de contrôler le timer ? */
const CONTROL_SETTING = "sharedTimerPlayersControl";

/** Canal de socket du module (les demandes des joueurs y transitent vers le MJ). */
const SOCKET = `module.${MODULE_ID}`;

/** État « aucun timer ». Sert de base pour normaliser toute lecture du réglage. */
const EMPTY_STATE = Object.freeze({
  active: false,   // un timer existe-t-il ?
  running: false,  // tourne-t-il (vs mis en pause) ?
  label: "",       // étiquette affichée (ex. « Torche »)
  duration: 0,     // durée totale en secondes (pour la barre + les prolongations)
  endTime: 0,      // serverTime (ms) auquel il atteint 0, quand il tourne
  remaining: 0     // secondes restantes, quand il est en pause
});

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

const t = (key, data) =>
  data ? game.i18n.format(`PERSONAL_TOOLBOX.SharedTimer.${key}`, data)
       : game.i18n.localize(`PERSONAL_TOOLBOX.SharedTimer.${key}`);

/** Échappe une chaîne pour une insertion sûre dans du HTML (étiquettes joueurs). */
const escapeHTML = (str) => {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
};

/** Horloge serveur (ms), commune à tous les clients. Repli sur l'horloge locale. */
const serverNow = () => game.time?.serverTime ?? Date.now();

/** Lit l'état courant du timer, normalisé sur {@link EMPTY_STATE}. */
function getState() {
  const raw = game.settings.get(MODULE_ID, STATE_SETTING);
  return { ...EMPTY_STATE, ...(raw && typeof raw === "object" ? raw : {}) };
}

/** Secondes restantes pour un état donné (0 s'il est terminé ou inactif). */
function remainingSeconds(state) {
  if (!state.active) return 0;
  if (!state.running) return Math.max(0, state.remaining);
  return Math.max(0, (state.endTime - serverNow()) / 1000);
}

/** L'utilisateur courant peut-il piloter le timer ? */
function canControl() {
  return game.user.isGM || game.settings.get(MODULE_ID, CONTROL_SETTING) === true;
}

/** L'utilisateur a-t-il masqué son widget via le bouton des outils de token ? */
function isHidden() {
  return game.settings.get(MODULE_ID, HIDDEN_SETTING) === true;
}

/**
 * Affiche ou masque le widget chez l'utilisateur courant. On persiste le réglage
 * client, dont l'`onChange` redemande le rendu : l'état du timer n'est jamais
 * touché.
 * @param {boolean} hidden
 */
function setHidden(hidden) {
  game.settings.set(MODULE_ID, HIDDEN_SETTING, Boolean(hidden));
}

/**
 * Le MJ courant est-il celui qui doit appliquer les demandes relayées ? Avec
 * plusieurs MJ connectés, on n'en désigne qu'un (id le plus petit) pour éviter les
 * écritures en double.
 */
function isResponsibleGM() {
  if (!game.user.isGM) return false;
  const activeGMs = game.users.filter(u => u.isGM && u.active).map(u => u.id).sort();
  return activeGMs[0] === game.user.id;
}

/**
 * Persiste un nouvel état. Le MJ écrit directement le réglage de monde ; un joueur
 * relaie sa demande au MJ via le socket (à condition qu'un MJ soit connecté).
 * @param {object} state
 */
async function commit(state) {
  if (game.user.isGM) {
    return game.settings.set(MODULE_ID, STATE_SETTING, state);
  }
  if (!game.users.some(u => u.isGM && u.active)) {
    ui.notifications.warn(t("NoGM"));
    return;
  }
  console.log("Personal Toolbox | Shared Timer | demande relayée au MJ", state);
  game.socket.emit(SOCKET, { type: "commit", state });
}

/** Met en forme une durée en secondes : H:MM:SS au-delà d'une heure, sinon MM:SS. */
function formatTime(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = n => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/** Lance un nouveau timer partagé. */
function startTimer(durationSeconds, label) {
  const duration = Math.max(1, Math.round(durationSeconds));
  commit({
    active: true,
    running: true,
    label: (label || "").trim(),
    duration,
    endTime: serverNow() + duration * 1000,
    remaining: duration
  });
}

/** Met en pause le timer courant (fige les secondes restantes). */
function pauseTimer(state) {
  if (!state.active || !state.running) return;
  commit({ ...state, running: false, remaining: remainingSeconds(state) });
}

/** Relance un timer en pause à partir des secondes restantes figées. */
function resumeTimer(state) {
  if (!state.active || state.running) return;
  commit({ ...state, running: true, endTime: serverNow() + Math.round(state.remaining * 1000) });
}

/**
 * Ajuste le temps du timer de `seconds` secondes (positif pour prolonger, négatif
 * pour raccourcir). Si le timer est déjà expiré, on repart de maintenant afin que
 * les secondes ajoutées soient réellement décomptées. Tout est borné pour ne jamais
 * descendre sous 0 (et la durée totale reste ≥ au temps restant, pour la barre).
 */
function addTime(state, seconds) {
  if (!state.active) return;
  if (state.running) {
    const now = serverNow();
    const base = Math.max(state.endTime, now);
    const endTime = Math.max(now, base + seconds * 1000);
    const remaining = (endTime - now) / 1000;
    const duration = Math.max(1, state.duration + seconds, remaining);
    commit({ ...state, duration, endTime });
  } else {
    const remaining = Math.max(0, state.remaining + seconds);
    const duration = Math.max(1, state.duration + seconds, remaining);
    commit({ ...state, duration, remaining });
  }
}

/** Arrête et retire le timer pour tout le monde. */
function stopTimer() {
  commit({ ...EMPTY_STATE });
}

/* -------------------------------------------- */
/*  Widget flottant                              */
/* -------------------------------------------- */

class SharedTimerWidget {
  /** @type {HTMLElement|null} */
  #el = null;

  /** @type {number|null} */
  #interval = null;

  /** A-t-on déjà signalé l'expiration du timer courant ? */
  #expiredNotified = false;

  /** Le widget est-il replié (propre à chaque client, non persisté) ? Replié par défaut. */
  #minimized = true;

  /* -------------------------------------------- */

  /** Crée le widget (une seule fois) et démarre la boucle d'affichage. */
  mount() {
    if (this.#el) return;
    const el = document.createElement("div");
    el.id = "pt-shared-timer";
    el.className = "pt-shared-timer";
    document.body.appendChild(el);
    this.#el = el;

    el.addEventListener("click", (event) => this.#onClick(event));
    el.addEventListener("keydown", (event) => this.#onKeydown(event));
    el.addEventListener("mousedown", (event) => this.#onMouseDown(event));

    this.#restorePosition();
    this.render();

    console.log("Personal Toolbox | Shared Timer | widget monté | isGM :", game.user.isGM,
      "| canControl :", canControl(), "| réglage joueurs :", game.settings.get(MODULE_ID, CONTROL_SETTING));

    // 500 ms : suffisant pour un rendu fluide des secondes sans coût notable.
    this.#interval = window.setInterval(() => this.#tick(), 500);
  }

  /* -------------------------------------------- */

  /** Reconstruit entièrement le widget à partir de l'état courant. */
  render() {
    if (!this.#el) return;
    const state = getState();
    const rem = remainingSeconds(state);

    // Un nouveau timer valide réarme la notification d'expiration. Fait avant le
    // test de masquage pour que l'alarme parte même widget caché : le timer et
    // son décompte tournent en arrière-plan (voir #tick).
    if (rem > 0.5) this.#expiredNotified = false;

    // Masquage manuel (bouton dans les outils de token) : on cache l'affichage
    // sans toucher à l'état partagé du timer.
    if (isHidden()) {
      this.#el.style.display = "none";
      return;
    }

    this.#el.classList.toggle("pt-minimized", this.#minimized);

    // Aucun timer : les contrôleurs voient le lanceur, les autres ne voient rien.
    if (!state.active) {
      if (!canControl()) {
        this.#el.style.display = "none";
        return;
      }
      this.#el.style.display = "";
      this.#el.innerHTML = this.#launcherHTML();
      return;
    }

    this.#el.style.display = "";
    this.#el.innerHTML = this.#countdownHTML(state, rem);
  }

  /* -------------------------------------------- */

  /** Met à jour le chrono et la barre à chaque tic, sans reconstruire le DOM. */
  #tick() {
    if (!this.#el) return;
    const state = getState();
    if (!state.active) return;

    const rem = remainingSeconds(state);
    if (!(state.running && rem <= 0)) {
      const text = formatTime(rem);
      this.#el.querySelectorAll(".pt-timer-time").forEach(el => { el.textContent = text; });
    }

    const fill = this.#el.querySelector(".pt-timer-bar-fill");
    if (fill && state.duration > 0) {
      fill.style.width = `${Math.max(0, Math.min(100, (rem / state.duration) * 100))}%`;
    }

    if (state.running && rem <= 0 && !this.#expiredNotified) {
      this.#expiredNotified = true;
      this.#onExpire(state);
      this.render(); // bascule sur l'affichage « Terminé »
    }
  }

  /** À l'expiration : notification locale + sonnerie (chaque client la joue). */
  #onExpire(state) {
    ui.notifications.info(t("ExpiredNotify", { label: state.label || t("DefaultLabel") }));
    try {
      foundry.audio.AudioHelper.play(
        { src: "sounds/notify.wav", volume: 0.8, autoplay: true, loop: false },
        false
      );
    } catch (err) {
      console.error("Personal Toolbox | Shared Timer |", err);
    }
  }

  /* -------------------------------------------- */
  /*  Rendus                                      */
  /* -------------------------------------------- */

  #headerHTML(heading, miniTimeHTML = "") {
    const safe = escapeHTML(heading);
    const icon = this.#minimized ? "fa-chevron-down" : "fa-chevron-up";
    const title = this.#minimized ? t("Expand") : t("Minimize");
    return `
      <div class="pt-timer-header" data-drag>
        <i class="fa-solid fa-hourglass-half"></i>
        <span class="pt-timer-heading" title="${safe}">${safe}</span>
        ${miniTimeHTML}
        <button type="button" class="pt-timer-min-btn" data-action="minimize" title="${title}">
          <i class="fa-solid ${icon}"></i>
        </button>
      </div>`;
  }

  #launcherHTML() {
    return `
      ${this.#headerHTML(t("Heading"))}
      <div class="pt-timer-body">
        <div class="pt-timer-form">
          <div class="pt-timer-row pt-timer-inputs">
            <input type="number" class="pt-timer-minutes" min="1" max="999" value="60"
                   title="${t("Minutes")}">
            <span class="pt-timer-unit">${t("Minutes")}</span>
          </div>
          <div class="pt-timer-row pt-timer-actions">
            <button type="button" data-action="start">
              <i class="fa-solid fa-play"></i> ${t("Start")}
            </button>
          </div>
          <button type="button" class="pt-timer-preset" data-action="preset-torch">
            <i class="fa-solid fa-fire"></i> ${t("PresetTorch")}
          </button>
        </div>
      </div>`;
  }

  #countdownHTML(state, rem) {
    const expired = rem <= 0;
    const heading = state.label || t("DefaultLabel");
    const pct = state.duration > 0 ? Math.max(0, Math.min(100, (rem / state.duration) * 100)) : 0;

    let controls = "";
    if (canControl()) {
      const toggle = expired ? "" : (state.running
        ? `<button type="button" data-action="pause" title="${t("Pause")}"><i class="fa-solid fa-pause"></i></button>`
        : `<button type="button" data-action="resume" title="${t("Resume")}"><i class="fa-solid fa-play"></i></button>`);
      const minus = expired ? "" : `
        <button type="button" data-action="add" data-secs="-600" title="${t("RemoveTenMinutes")}">-10</button>
        <button type="button" data-action="add" data-secs="-60" title="${t("RemoveMinute")}">-1</button>`;
      const plus = expired ? "" : `
        <button type="button" data-action="add" data-secs="60" title="${t("AddMinute")}">+1</button>
        <button type="button" data-action="add" data-secs="600" title="${t("AddTenMinutes")}">+10</button>`;
      controls = `
        <div class="pt-timer-controls">
          ${minus}${toggle}${plus}
          <button type="button" data-action="stop" title="${t("Stop")}"><i class="fa-solid fa-stop"></i></button>
        </div>`;
    }

    const miniTime = `<span class="pt-timer-time pt-timer-mini-time${expired ? " pt-expired" : ""}">${expired ? t("Finished") : formatTime(rem)}</span>`;

    return `
      ${this.#headerHTML(heading, miniTime)}
      <div class="pt-timer-body">
        <div class="pt-timer-time${expired ? " pt-expired" : ""}">
          ${expired ? t("Finished") : formatTime(rem)}
        </div>
        <div class="pt-timer-bar"><div class="pt-timer-bar-fill" style="width:${pct}%"></div></div>
        ${controls}
      </div>`;
  }

  /* -------------------------------------------- */
  /*  Interactions                                */
  /* -------------------------------------------- */

  #startFromForm() {
    const minutesEl = this.#el.querySelector(".pt-timer-minutes");
    let minutes = Number.parseInt(minutesEl?.value, 10);
    if (!Number.isFinite(minutes)) minutes = 1;
    minutes = Math.max(1, Math.min(999, minutes));
    // Pas de nom saisi : le décompte retombe sur l'étiquette par défaut (« Timer »).
    startTimer(minutes * 60, "");
  }

  #onClick(event) {
    console.log("Personal Toolbox | Shared Timer | clic capté sur le widget", event.target);
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    console.log("Personal Toolbox | Shared Timer | action :", btn.dataset.action);
    const state = getState();
    switch (btn.dataset.action) {
      case "minimize": this.#minimized = !this.#minimized; this.render(); break;
      case "start": this.#startFromForm(); break;
      case "preset-torch": startTimer(3600, t("TorchLabel")); break;
      case "pause": pauseTimer(state); break;
      case "resume": resumeTimer(state); break;
      case "add": addTime(state, Number(btn.dataset.secs) || 0); break;
      case "stop": stopTimer(); break;
    }
  }

  #onKeydown(event) {
    if (event.key === "Enter" && event.target.closest(".pt-timer-form")) {
      event.preventDefault();
      this.#startFromForm();
    }
  }

  /* -------------------------------------------- */
  /*  Déplacement + position                       */
  /* -------------------------------------------- */

  #onMouseDown(event) {
    if (event.button !== 0 || !event.target.closest("[data-drag]")) return;
    // Les boutons de l'en-tête (minimiser…) ne doivent pas amorcer un déplacement.
    if (event.target.closest("button")) return;
    event.preventDefault();

    const rect = this.#el.getBoundingClientRect();
    const offX = event.clientX - rect.left;
    const offY = event.clientY - rect.top;
    const el = this.#el;

    const move = (e) => {
      const left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, e.clientX - offX));
      const top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - offY));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      // On abandonne le centrage par transform dès qu'on positionne à la main.
      el.style.transform = "none";
      el.style.right = "auto";
      el.style.bottom = "auto";
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      this.#savePosition();
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  #savePosition() {
    game.settings.set(MODULE_ID, POS_SETTING, {
      left: this.#el.style.left,
      top: this.#el.style.top
    });
  }

  #restorePosition() {
    const pos = game.settings.get(MODULE_ID, POS_SETTING);
    if (pos?.left && pos?.top) {
      this.#el.style.left = pos.left;
      this.#el.style.top = pos.top;
      this.#el.style.transform = "none";
      this.#el.style.right = "auto";
      this.#el.style.bottom = "auto";
    }
  }
}

const TimerWidget = new SharedTimerWidget();

/* -------------------------------------------- */
/*  Cycle de vie                                 */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, STATE_SETTING, {
    scope: "world",
    config: false,
    type: Object,
    default: { ...EMPTY_STATE },
    onChange: () => TimerWidget.render()
  });

  game.settings.register(MODULE_ID, POS_SETTING, {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, HIDDEN_SETTING, {
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: () => TimerWidget.render()
  });

  game.settings.register(MODULE_ID, CONTROL_SETTING, {
    name: "PERSONAL_TOOLBOX.SharedTimer.PlayersControlName",
    hint: "PERSONAL_TOOLBOX.SharedTimer.PlayersControlHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => TimerWidget.render()
  });
});

/**
 * Bouton bascule dans les outils de token, pour afficher ou masquer le widget.
 *
 * `getSceneControlButtons` est émis à chaque (re)construction de la barre de
 * contrôles (v13 : `controls` est un `Record<string, SceneControl>`, et
 * `tools` un `Record<string, SceneControlTool>`). On greffe un outil de type
 * `toggle` calqué sur `unconstrainedMovement` du cœur : actif = widget visible.
 *
 * Volontairement visible par tous et non réservé au MJ : tout le monde voit le
 * timer, donc chacun peut vouloir le masquer chez soi. Le masquage est un
 * réglage client, aucun impact sur l'état partagé.
 */
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControl = controls.tokens;
  if (!tokenControl?.tools) return;

  tokenControl.tools.sharedTimer = {
    name: "sharedTimer",
    order: 5,
    title: "PERSONAL_TOOLBOX.SharedTimer.ToggleTitle",
    icon: "fa-solid fa-hourglass-half",
    toggle: true,
    active: !isHidden(),
    onChange: (event, active) => setHidden(!active)
  };
});

Hooks.once("ready", () => {
  // Le MJ responsable applique les demandes relayées par les joueurs.
  game.socket.on(SOCKET, (data) => {
    if (data?.type !== "commit") return;
    console.log("Personal Toolbox | Shared Timer | demande reçue", data, "| responsable :", isResponsibleGM());
    if (isResponsibleGM()) game.settings.set(MODULE_ID, STATE_SETTING, data.state);
  });

  TimerWidget.mount();
});
