/**
 * Vocabulaire du générateur de noms
 * ---------------------------------
 * Tables consommées par `names.mjs`, séparées de la logique pour la même raison
 * que celles du menu de taverne : la logique se fige, le vocabulaire s'étoffe.
 *
 * Registre : médiéval-fantastique européen, à consonance française. Les noms
 * sont choisis pour être prononçables à voix haute du premier coup, ce qui est
 * la seule qualité qui compte quand on improvise un PNJ en pleine partie. Les
 * apostrophes exotiques et les grappes de consonnes sont donc écartées.
 *
 * Conventions de `grammar.mjs` : nom en « mot|traits », adjectif en couple
 * [masculin, féminin] dont seul le premier mot s'accorde.
 *
 * Les noms de personnes vivent à part, dans `ancestries-data.mjs` : ils se
 * déclinent par peuple, et ils pèsent à eux seuls autant que tout le reste.
 */

/* -------------------------------------------- */
/*  Enseignes                                    */
/* -------------------------------------------- */

export const SIGN = {
  /** Le nom de tête d'une enseigne : bête, objet, membre ou élément. */
  heads: [
    "sanglier|m", "cheval|m", "loup|m", "corbeau|m", "cerf|m", "lion|m",
    "dragon|m", "griffon|m", "renard|m", "ours|m", "bouc|m", "coq|m",
    "!hibou|m", "!hérisson|m", "chat|m", "aigle|m", "cygne|m", "brochet|m",
    "anguille|f", "truie|f", "chèvre|f", "licorne|f", "sirène|f", "vouivre|f",
    "pie|f", "oie|f", "biche|f", "louve|f", "mule|f", "crapaud|m",
    "chope|f", "tonneau|m", "enclume|f", "marteau|m", "fer|m", "lanterne|f",
    "chandelle|f", "couronne|f", "épée|f", "!hache|f", "bouclier|m", "!heaume|m",
    "gantelet|m", "clé|f", "roue|f", "charrue|f", "faux|f", "besace|f",
    "botte|f", "broche|f", "chaudron|m", "cruche|f", "pichet|m", "tabouret|m",
    "balai|m", "corde|f", "ancre|f", "voile|f", "!harpe|f", "luth|m", "dé|m",
    "bourse|f", "tête|f", "main|f", "poing|m", "cœur|m", "œil|m", "dent|f",
    "griffe|f", "corne|f", "aile|f", "patte|f", "langue|f", "barbe|f",
    "lune|f", "soleil|m", "étoile|f", "comète|f", "aube|f", "orage|m",
    "rose|f", "chêne|m", "!houx|m", "églantine|f", "fougère|f", "gland|m",
    "pierre|f", "source|f", "pont|m", "tour|f", "puits|m", "meule|f",
    "armes|fp", "trois rois|mp", "quatre vents|mp", "deux chopes|fp"
  ],

  adjectives: [
    ["borgne", "borgne"], ["noir", "noire"], ["blanc", "blanche"],
    ["rouge", "rouge"], ["doré", "dorée"], ["fendu", "fendue"],
    ["tordu", "tordue"], ["brisé", "brisée"], ["rouillé", "rouillée"],
    ["joyeux", "joyeuse"], ["endormi", "endormie"], ["ivre", "ivre"],
    ["muet", "muette"], ["boiteux", "boiteuse"], ["errant", "errante"],
    ["perdu", "perdue"], ["sauvage", "sauvage"], ["fidèle", "fidèle"],
    ["pendu", "pendue"], ["couronné", "couronnée"], ["ailé", "ailée"],
    ["affamé", "affamée"], ["rieur", "rieuse"], ["assoiffé", "assoiffée"],
    ["bavard", "bavarde"], ["têtu", "têtue"], ["gras", "grasse"],
    ["boueux", "boueuse"], ["content", "contente"], ["hardi", "hardie"],
    ["fumant", "fumante"], ["solitaire", "solitaire"], ["patient", "patiente"]
  ],

  /** Têtes des enseignes construites en complément : « Le Repos du Pèlerin ». */
  possessedHeads: [
    "repos|m", "abri|m", "refuge|m", "!halte|f", "tête|f", "corne|f", "main|f",
    "table|f", "cave|f", "bourse|f", "clé|f", "chope|f", "lanterne|f",
    "dernier verre|m", "coin|m", "banc|m", "toit|m", "feu|m", "détour|m"
  ],

  /** Compléments : « ... du Pèlerin », « ... de la Veuve ». */
  possessors: [
    "voyageur|m", "pèlerin|m", "roi|m", "reine|f", "forgeron|m", "meunier|m",
    "abbé|m", "sorcière|f", "noyé|m", "pendu|m", "marchand|m", "chasseur|m",
    "veuve|f", "diable|m", "saint|m", "aïeul|m", "matelot|m", "braconnier|m",
    "vieux loup|m", "sanglier|m", "abondance|f", "fortune|f", "espérance|f",
    "paix|f", "dernière heure|f", "mauvaise nuit|f", "beau temps|m"
  ]
};

/* -------------------------------------------- */
/*  Lieux                                        */
/* -------------------------------------------- */

export const PLACE = {
  /** Premier élément d'un toponyme soudé : Val + bourg = Valbourg. */
  stems: [
    "Val", "Mont", "Roche", "Font", "Bourg", "Beau", "Clair", "Haut", "Pierre",
    "Bois", "Champ", "Pré", "Puy", "Ville", "Combe", "Gué", "Pont", "Sault",
    "Cour", "Fresne", "Aulne", "Saule", "Chêne", "Corbe", "Serre", "Mor",
    "Bel", "Grand", "Vieil", "Neuf", "Sombre", "Ferre", "Aigue", "Vaux"
  ],

  /** Second élément. On refuse la répétition (« Montmont ») à la génération. */
  endings: [
    "mont", "val", "roche", "font", "bourg", "ville", "court", "champ", "pré",
    "bois", "fort", "garde", "tour", "pont", "gué", "combe", "sault", "chastel",
    "fosse", "lande", "marche", "rive", "clair", "noir", "fer", "vent", "sang",
    "cendre", "brune", "sec", "mare", "houx"
  ],

  /** Lieux nommés d'après ce qu'on y trouve : « La Combe aux Loups ». */
  features: [
    "combe|f", "gué|m", "lande|f", "fosse|f", "butte|f", "clairière|f",
    "vallon|m", "col|m", "pierre|f", "source|f", "chaussée|f", "mare|f",
    "tourbière|f", "carrière|f", "chapelle|f", "moulin|m", "ferme|f",
    "grange|f", "tour|f", "ruine|f", "pont|m", "sentier|m", "!hameau|m",
    "clos|m", "vigne|f", "bois|m", "futaie|f", "roselière|f"
  ],

  /** Ce qui hante l'endroit : « ... aux Loups », « ... du Pendu ». */
  inhabitants: [
    "loups|mp", "corbeaux|mp", "cerfs|mp", "sangliers|mp", "moines|mp",
    "noyés|mp", "pendu|m", "sorcière|f", "ermite|m", "fées|fp", "morts|mp",
    "chèvres|fp", "cendres|fp", "brumes|fp", "vieux roi|m", "géant|m",
    "batelier|m", "charbonniers|mp", "trois sœurs|fp", "dernier loup|m"
  ],

  /** Groupes nominaux tout faits, au pluriel ou avec un nombre. */
  standalone: [
    "trois fontaines|fp", "sept pierres|fp", "deux ponts|mp", "hautes landes|fp",
    "cendres|fp", "brumes|fp", "essarts|mp", "marches|fp", "confins|mp",
    "quatre chemins|mp", "vieilles murailles|fp", "salines|fp"
  ]
};

/* -------------------------------------------- */
/*  Organisations                                */
/* -------------------------------------------- */

export const ORDER = {
  /** Têtes au singulier : « L'Ordre du Chêne ». */
  heads: [
    "ordre|m", "confrérie|f", "compagnie|f", "guilde|f", "fraternité|f",
    "cercle|m", "alliance|f", "main|f", "chaîne|f", "meute|f", "bannière|f",
    "garde|f", "maison|f", "loge|f", "table|f", "veille|f", "cour|f"
  ],

  /** Collectifs au pluriel : « Les Fils du Sel ». */
  collectives: [
    "frères|mp", "fils|mp", "filles|fp", "sœurs|fp", "enfants|mp",
    "veilleurs|mp", "couteaux|mp", "lames|fp", "mains|fp", "masques|mp",
    "corbeaux|mp", "clés|fp", "chiens|mp", "loups|mp", "errants|mp",
    "muets|mp", "gardiens|mp", "porteurs|mp", "témoins|mp", "cendres|fp"
  ],

  /** Ce au nom de quoi ils agissent : « ... du Serment », « ... de la Cendre ». */
  causes: [
    "sel|m", "fer|m", "cendre|f", "sang|m", "chêne|m", "corbeau|m", "nuit|f",
    "aube|f", "silence|m", "serment|m", "dernier feu|m", "roue|f",
    "vieux pont|m", "onzième heure|f", "sillon|m", "marteau|m", "clé|f",
    "porte close|f", "longue marche|f", "eau noire|f", "juste poids|m"
  ],

  /** Adjectifs accordés au collectif : « Les Lames rouges ». */
  adjectives: [
    ["rouge", "rouge"], ["noir", "noire"], ["muet", "muette"],
    ["gris", "grise"], ["fidèle", "fidèle"], ["brisé", "brisée"],
    ["silencieux", "silencieuse"], ["errant", "errante"], ["creux", "creuse"],
    ["patient", "patiente"], ["sourd", "sourde"], ["blanc", "blanche"],
    ["sanglant", "sanglante"], ["oublié", "oubliée"], ["libre", "libre"],
    ["ardent", "ardente"], ["cendré", "cendrée"], ["tranquille", "tranquille"]
  ]
};
