/* =========================================================================
   Toolbox — Calculateur de rencontres PF2e -> Nimble (Foundry v13)
   -------------------------------------------------------------------------
   Convertit un budget de rencontre PF2e en budget Nimble, exprimé en niveaux
   de créatures, et propose une composition concrète.

     budget = nombre de héros x niveau des héros x pourcentage de difficulté

   La répartition est gloutonne : on part du plus grand niveau qui tient pour
   toutes les créatures, puis on monte les créatures une par une tant que le
   budget le permet. Deux modes : créatures de même niveau, ou boss + sbires
   avec une part de budget réservée au boss.

   Accès : bouton calculatrice dans les contrôles de scène (section Token, MJ
   uniquement), ou `game.pf2eNimbleCalc.open()`.

   À charger comme MODULE ES dans module.json :
       "esmodules": ["scripts/nimble-calc.mjs"]
   ========================================================================= */

const KEY = "PERSONAL_TOOLBOX.NimbleCalc";
const t = (key, data) => (data ? game.i18n.format(`${KEY}.${key}`, data) : game.i18n.localize(`${KEY}.${key}`));

// Niveaux de créature disponibles : les trois fractions Nimble, puis 1 à 20.
const LEVELS = [0.25, 1 / 3, 0.5];
for (let i = 1; i <= 20; i++) LEVELS.push(i);

// Pourcentage de difficulté PF2e -> palier de difficulté Nimble.
const NIMBLE_TIERS = {
  45: "TierEasy",
  75: "TierMedium",
  100: "TierHard",
  120: "TierDeadly",
  150: "TierVeryDeadly",
};

/**
 * Libellé d'un niveau, les fractions restant écrites en fraction.
 * @param {number} value
 * @returns {string}
 */
function levelName(value) {
  if (value === 0.25) return "1/4";
  if (Math.abs(value - 1 / 3) < 0.001) return "1/3";
  if (value === 0.5) return "1/2";
  return String(value);
}

/**
 * Valeur numérique d'un libellé de niveau (réciproque de levelName).
 * @param {string} label
 * @returns {number}
 */
function levelValue(label) {
  if (label === "1/4") return 0.25;
  if (label === "1/3") return 1 / 3;
  if (label === "1/2") return 0.5;
  return Number.parseFloat(label);
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Indice du plus grand niveau inférieur ou égal à une valeur.
 * @param {number} value
 * @returns {number}
 */
function largestBelow(value) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (LEVELS[i] <= value + 0.0001) index = i;
    else break;
  }
  return index;
}

/**
 * Répartit un budget sur un nombre de créatures donné.
 * @param {number} budget Budget en niveaux.
 * @param {number} count  Nombre de créatures à placer.
 * @returns {{counts: Record<string, number>, sum: number}|null} `null` si même
 *   le niveau minimum pour tout le monde dépasse le budget.
 */
function allocate(budget, count) {
  if (budget < count * 0.25 - 0.001) return null;

  const indices = new Array(count).fill(largestBelow(budget / count));
  let sum = indices.reduce((total, index) => total + LEVELS[index], 0);

  // On monte les créatures d'un cran tant qu'il reste du budget.
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < count; i++) {
      const next = indices[i] < LEVELS.length - 1 ? indices[i] + 1 : indices[i];
      if (next === indices[i]) continue;

      const delta = LEVELS[next] - LEVELS[indices[i]];
      if (sum + delta <= budget + 0.0001) {
        indices[i] = next;
        sum += delta;
        improved = true;
      }
    }
  }

  const counts = {};
  for (const index of indices) {
    const label = levelName(LEVELS[index]);
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return { counts, sum };
}

/**
 * Met une répartition en phrase, du niveau le plus élevé au plus faible.
 * @param {{counts: Record<string, number>}} allocation
 * @param {"Creature"|"Minion"} kind Racine des clés de traduction.
 * @returns {string}
 */
function allocationToText(allocation, kind) {
  return Object.keys(allocation.counts)
    .sort((a, b) => levelValue(b) - levelValue(a))
    .map((label) => {
      const n = allocation.counts[label];
      return t(`Compo${kind}${n > 1 ? "Plural" : "Singular"}`, { n, level: label });
    })
    .join(" + ");
}

/**
 * Gabarit de la fenêtre. Construit au rendu (et non à l'import) pour que les
 * traductions soient déjà chargées.
 * @returns {string}
 */
function buildContent() {
  return `
<div class="pt-nimble-calc">
  <div class="pt-nimble-calc__grid">
    <div class="pt-nimble-calc__field">
      <label>${t("HeroCount")}</label>
      <input type="number" name="heroCount" min="1" max="8" value="2">
    </div>
    <div class="pt-nimble-calc__field">
      <label>${t("HeroLevel")}</label>
      <input type="number" name="heroLevel" min="1" max="20" value="1">
    </div>
    <div class="pt-nimble-calc__field">
      <label>${t("Difficulty")}</label>
      <select name="difficulty">
        <option value="45">${t("DifficultyTrivial")}</option>
        <option value="75" selected>${t("DifficultyLow")}</option>
        <option value="100">${t("DifficultyModerate")}</option>
        <option value="120">${t("DifficultySevere")}</option>
        <option value="150">${t("DifficultyExtreme")}</option>
      </select>
    </div>
    <div class="pt-nimble-calc__field">
      <label>${t("CreatureCount")}</label>
      <input type="number" name="creatureCount" min="1" max="20" value="3">
    </div>
  </div>

  <div class="pt-nimble-calc__modes">
    <label><input type="radio" name="mode" value="equal" checked> ${t("ModeEqual")}</label>
    <label><input type="radio" name="mode" value="boss"> ${t("ModeBoss")}</label>
  </div>

  <div class="pt-nimble-calc__boss-row" data-ref="bossRow">
    <label>${t("BossShare")}</label>
    <input type="range" name="bossShare" min="30" max="70" step="5" value="50">
    <span class="pt-nimble-calc__boss-share" data-ref="bossShareOut">50 %</span>
  </div>

  <div class="pt-nimble-calc__summary">
    <div class="pt-nimble-calc__stat">
      <div class="pt-nimble-calc__stat-label">${t("StatTier")}</div>
      <div class="pt-nimble-calc__stat-value" data-ref="outTier"></div>
    </div>
    <div class="pt-nimble-calc__stat">
      <div class="pt-nimble-calc__stat-label">${t("StatBudget")}</div>
      <div class="pt-nimble-calc__stat-value" data-ref="outBudget"></div>
    </div>
    <div class="pt-nimble-calc__stat">
      <div class="pt-nimble-calc__stat-label">${t("StatRatio")}</div>
      <div class="pt-nimble-calc__stat-value" data-ref="outRatio"></div>
    </div>
  </div>

  <fieldset class="pt-nimble-calc__compo">
    <legend>${t("CompoLegend")}</legend>
    <div data-ref="outCompo"></div>
  </fieldset>

  <div class="pt-nimble-calc__warnings" data-ref="outWarnings"></div>
</div>`;
}

const { ApplicationV2 } = foundry.applications.api;

class PF2eNimbleCalculator extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "pt-nimble-calc",
    window: {
      title: `${KEY}.Title`,
      resizable: true,
      icon: "fa-solid fa-calculator",
    },
    position: { width: 420, height: "auto" },
  };

  /** @inheritDoc */
  async _renderHTML(_context, _options) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildContent();
    return wrapper.firstElementChild;
  }

  /** @inheritDoc */
  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  /** @inheritDoc */
  _onRender(_context, _options) {
    for (const input of this.element.querySelectorAll("input, select")) {
      input.addEventListener("input", () => this.#calculate());
    }
    this.#calculate();
  }

  #ref(name) {
    return this.element.querySelector(`[data-ref="${name}"]`);
  }

  #field(name) {
    return this.element.querySelector(`[name="${name}"]`);
  }

  #intField(name, min = 1) {
    return Math.max(min, Number.parseInt(this.#field(name).value) || min);
  }

  /**
   * Recalcule le budget, la composition suggérée et les avertissements.
   */
  #calculate() {
    const heroCount = this.#intField("heroCount");
    const heroLevel = this.#intField("heroLevel");
    const creatureCount = this.#intField("creatureCount");
    const difficulty = Number.parseInt(this.#field("difficulty").value);
    const mode = this.element.querySelector('[name="mode"]:checked').value;
    const bossShare = Number.parseInt(this.#field("bossShare").value);

    this.#ref("bossRow").classList.toggle("pt-nimble-calc__boss-row--visible", mode === "boss");
    this.#ref("bossShareOut").textContent = `${bossShare} %`;

    const budget = (heroCount * heroLevel * difficulty) / 100;
    this.#ref("outTier").textContent = t(NIMBLE_TIERS[difficulty]);
    this.#ref("outBudget").textContent = t("LevelUnit", { n: round1(budget) });
    this.#ref("outRatio").textContent = String(round1(creatureCount / heroCount));

    const warnings = [];
    let compo = "";
    let total = null;

    if (mode === "equal") {
      const allocation = allocate(budget, creatureCount);
      if (!allocation) {
        compo = t("OverBudget", { n: creatureCount, budget: round1(budget) });
        warnings.push(t("WarnOverBudget"));
      } else {
        compo = allocationToText(allocation, "Creature");
        total = allocation.sum;
      }
    } else if (creatureCount < 2) {
      compo = t("BossNeedsTwo");
    } else {
      // Le boss prend sa part du budget, arrondie au niveau existant en dessous,
      // sans jamais descendre sous le niveau 1 quand le budget le permet.
      let bossLevel = LEVELS[largestBelow((budget * bossShare) / 100)];
      if (bossLevel < 1 && budget >= 1) bossLevel = 1;

      const remaining = budget - bossLevel;
      const minionCount = creatureCount - 1;
      const allocation = allocate(remaining, minionCount);

      if (!allocation) {
        compo = t("BossNoRoom", {
          level: levelName(bossLevel),
          rest: round1(remaining),
          n: minionCount,
        });
        warnings.push(t("WarnBossNoRoom"));
      } else {
        compo = `${t("CompoBoss", { level: levelName(bossLevel) })} + ${allocationToText(allocation, "Minion")}`;
        total = bossLevel + allocation.sum;
      }
    }

    this.#renderCompo(compo, total, budget);

    if (creatureCount / heroCount > 4) warnings.push(t("WarnTooManyCreatures"));
    if (creatureCount === 1 && difficulty >= 100) warnings.push(t("WarnSingleCreature"));
    if (difficulty === 150) warnings.push(t("WarnVeryDeadly"));
    this.#renderWarnings(warnings);
  }

  /**
   * @param {string} text          Composition en clair.
   * @param {number|null} total    Somme des niveaux placés, `null` si aucune.
   * @param {number} budget        Budget visé.
   */
  #renderCompo(text, total, budget) {
    const host = this.#ref("outCompo");
    host.replaceChildren(document.createTextNode(text));
    if (total === null) return;

    const suffix = document.createElement("span");
    suffix.className = "pt-nimble-calc__total";
    suffix.textContent =
      Math.abs(total - budget) < 0.05
        ? t("TotalExact", { total: round1(total) })
        : t("TotalOf", { total: round1(total), budget: round1(budget) });
    host.append(" ", suffix);
  }

  /**
   * @param {string[]} warnings
   */
  #renderWarnings(warnings) {
    const host = this.#ref("outWarnings");
    host.replaceChildren();

    for (const warning of warnings) {
      const line = document.createElement("div");
      line.className = "pt-nimble-calc__warning";

      const icon = document.createElement("i");
      icon.className = "fa-solid fa-triangle-exclamation";
      line.append(icon, document.createTextNode(` ${warning}`));
      host.append(line);
    }
  }
}

/* -------------------------------------------------------------------------
   Ouverture : singleton + API globale + bouton dans les contrôles de scène
   ------------------------------------------------------------------------- */
let instance = null;

function openCalculator() {
  instance ??= new PF2eNimbleCalculator();
  instance.render(true);
  return instance;
}

Hooks.once("init", () => {
  game.pf2eNimbleCalc = { open: openCalculator };
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls.tokens;
  if (!tokens?.tools) return;

  tokens.tools["pt-nimble-calc"] = {
    name: "pt-nimble-calc",
    title: `${KEY}.Title`,
    icon: "fa-solid fa-calculator",
    button: true,
    visible: game.user.isGM,
    onChange: () => openCalculator(),
    order: 100,
  };
});

export { PF2eNimbleCalculator };
