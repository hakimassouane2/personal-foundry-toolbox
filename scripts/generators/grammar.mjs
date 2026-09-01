/**
 * Grammaire française des générateurs
 * -----------------------------------
 * Les générateurs de ce dossier fabriquent des libellés en tirant des mots au
 * hasard puis en les assemblant. Les générateurs anglophones dont on s'inspire
 * se contentent de concaténer des chaînes (« a » + « thick » + « stew »). En
 * français ça ne tient pas : l'adjectif s'accorde avec le nom, et l'article
 * dépend du genre, du nombre et de l'initiale du mot suivant.
 *
 * D'où ce module : chaque nom des tables de données porte son genre et son
 * nombre, chaque adjectif est écrit aux deux genres, et l'accord en nombre est
 * dérivé mécaniquement. C'est la seule façon d'avoir des tables de vocabulaire
 * qui restent lisibles et faciles à étoffer.
 *
 * Notation compacte des noms, « mot|traits » :
 *   "soupe|f"       féminin singulier
 *   "poireaux|mp"   masculin pluriel
 *   "!haricots|mp"  le « ! » interdit l'élision (les haricots, du haricot)
 *
 * Notation des adjectifs : un couple [masculin, féminin]. Un adjectif
 * invariable s'écrit deux fois à l'identique (["à la broche", "à la broche"]).
 */

/** Initiales déclenchant l'élision. Le h muet est majoritaire, les mots à h aspiré sont marqués « ! ». */
const VOWELS = /^[aeiouyàâäéèêëîïôöùûüh]/i;

/* -------------------------------------------- */
/*  Tirage                                       */
/* -------------------------------------------- */

/**
 * Tire un élément au hasard dans un tableau.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Tire `n` éléments distincts au hasard. Si le tableau est plus court que `n`,
 * on renvoie tout le tableau mélangé : mieux vaut un menu court qu'un menu qui
 * propose deux fois le même plat.
 * @template T
 * @param {T[]} arr
 * @param {number} n
 * @returns {T[]}
 */
export function pickMany(arr, n) {
  const pool = arr.slice();
  const out = [];
  while (pool.length && out.length < n) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/**
 * Entier aléatoire dans l'intervalle fermé [min, max].
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Vrai avec la probabilité donnée.
 * @param {number} p  Probabilité entre 0 et 1.
 * @returns {boolean}
 */
export function chance(p) {
  return Math.random() < p;
}

/* -------------------------------------------- */
/*  Noms                                         */
/* -------------------------------------------- */

/**
 * @typedef {object} Noun
 * @property {string}  s      Forme écrite du nom, telle qu'elle apparaîtra.
 * @property {"m"|"f"} g      Genre grammatical.
 * @property {boolean} pl     Nom au pluriel.
 * @property {boolean} elide  Le nom déclenche-t-il l'élision (l', d').
 */

/** Mémoïsation de `noun()`. @type {Map<string, Noun>} */
const CACHE = new Map();

/**
 * Analyse la notation compacte « mot|traits » et renvoie un nom exploitable.
 * Le résultat est mémoïsé : les tables sont relues à chaque tirage, autant ne
 * pas refaire l'analyse à chaque fois.
 * @param {string|Noun} input
 * @returns {Noun}
 */
export function noun(input) {
  if (typeof input === "object") return input;

  const cached = CACHE.get(input);
  if (cached) return cached;

  const [rawWord, traits = "m"] = input.split("|");
  const blocked = rawWord.startsWith("!");
  const s = blocked ? rawWord.slice(1) : rawWord;

  const parsed = {
    s,
    g: traits.includes("f") ? "f" : "m",
    pl: traits.includes("p"),
    elide: !blocked && VOWELS.test(s)
  };

  CACHE.set(input, parsed);
  return parsed;
}

/* -------------------------------------------- */
/*  Accord                                       */
/* -------------------------------------------- */

/**
 * Mots qui, en tête d'une locution, la rendent invariable : « en ragoût », « à
 * la broche », « au pot », « qui a bouilli trop longtemps ». Une locution
 * prépositionnelle ou relative ne s'accorde jamais avec le nom qu'elle suit.
 */
const INVARIABLE_HEADS = new Set([
  "à", "au", "aux", "en", "de", "du", "des", "dans", "sous", "sur", "sans",
  "avec", "par", "pour", "qui", "que"
]);

/**
 * Met un mot au pluriel selon les règles régulières du français. Les tables
 * n'emploient que des adjectifs réguliers : les cas tordus (bancal, fatal…)
 * sont écartés à l'écriture plutôt que traités ici.
 * @param {string} word
 * @param {"m"|"f"} gender
 * @returns {string}
 */
function pluralizeWord(word, gender) {
  if (/[sxz]$/.test(word)) return word;                 // épais, doux, gris
  if (/(eau|eu)$/.test(word)) return `${word}x`;         // nouveau, hébreu
  if (gender === "m" && /al$/.test(word)) return `${word.slice(0, -2)}aux`;
  return `${word}s`;
}

/**
 * Met une locution adjectivale au pluriel. Seul le premier mot s'accorde : dans
 * « relevé au poivre » c'est « relevé » qui prend la marque, pas « poivre ».
 * Suffixer la locution entière donnerait « relevé au poivres », et tester sa
 * terminaison ferait passer « croustillant sur le dessus » pour un mot déjà au
 * pluriel.
 *
 * Corollaire à respecter en écrivant les tables : **une locution ne contient
 * qu'un seul mot variable, et c'est le premier**. On écrit donc ["froid",
 * "froide"] plutôt que ["servi froid", "servie froide"], qui demanderait deux
 * accords.
 * @param {string} phrase
 * @param {"m"|"f"} gender
 * @returns {string}
 */
function pluralizePhrase(phrase, gender) {
  const [head, ...rest] = phrase.split(" ");
  if (INVARIABLE_HEADS.has(head)) return phrase;
  return [pluralizeWord(head, gender), ...rest].join(" ");
}

/**
 * Accorde un adjectif avec un nom, en genre et en nombre.
 * @param {[string, string]} adj  Couple [masculin, féminin].
 * @param {Noun} n
 * @returns {string}
 */
export function agree(adj, n) {
  const base = n.g === "f" ? adj[1] : adj[0];
  return n.pl ? pluralizePhrase(base, n.g) : base;
}

/* -------------------------------------------- */
/*  Articles                                     */
/* -------------------------------------------- */

/**
 * Article indéfini : un / une / des.
 * @param {Noun} n
 * @returns {string}
 */
export function indef(n) {
  if (n.pl) return `des ${n.s}`;
  return `${n.g === "f" ? "une" : "un"} ${n.s}`;
}

/**
 * Article défini : le / la / l' / les.
 * @param {Noun} n
 * @returns {string}
 */
export function def(n) {
  if (n.pl) return `les ${n.s}`;
  if (n.elide) return `l'${n.s}`;
  return `${n.g === "f" ? "la" : "le"} ${n.s}`;
}

/**
 * Article partitif : du / de la / de l' / des. C'est la forme naturelle pour
 * parler d'un plat servi à table (« du sanglier braisé », « des tripes »).
 * @param {Noun} n
 * @returns {string}
 */
export function part(n) {
  if (n.pl) return `des ${n.s}`;
  if (n.elide) return `de l'${n.s}`;
  return `${n.g === "f" ? "de la" : "du"} ${n.s}`;
}

/**
 * Complément de nom introduit par « de » : « soupe de poireaux ». Avec
 * `withArticle`, on contracte : « soupe des marais ».
 * @param {Noun} n
 * @param {boolean} [withArticle=false]
 * @returns {string}
 */
export function of(n, withArticle = false) {
  if (!withArticle) return n.elide ? `d'${n.s}` : `de ${n.s}`;
  if (n.pl) return `des ${n.s}`;
  if (n.elide) return `de l'${n.s}`;
  return `${n.g === "f" ? "de la" : "du"} ${n.s}`;
}

/**
 * Complément introduit par « à » : « tarte aux prunes », « poulet à l'estragon ».
 * @param {Noun} n
 * @returns {string}
 */
export function at(n) {
  if (n.pl) return `aux ${n.s}`;
  if (n.elide) return `à l'${n.s}`;
  return `${n.g === "f" ? "à la" : "au"} ${n.s}`;
}

/* -------------------------------------------- */
/*  Mise en forme                                */
/* -------------------------------------------- */

/**
 * Met la première lettre en capitale sans toucher au reste : les noms de plats
 * contiennent des mots qui doivent rester en minuscules.
 * @param {string} str
 * @returns {string}
 */
export function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Assemble des fragments en une phrase : les fragments vides sont ignorés, le
 * reste est séparé par des virgules et terminé par un point.
 * @param {...string} parts
 * @returns {string}
 */
export function sentence(...parts) {
  const body = parts.filter(Boolean).join(", ");
  return body ? `${cap(body)}.` : "";
}
