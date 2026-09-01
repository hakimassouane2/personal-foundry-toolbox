/**
 * Vocabulaire du menu de taverne
 * ------------------------------
 * Tables de mots consommées par `tavern-menu.mjs`. Elles sont séparées de la
 * logique pour une raison simple : la logique ne bouge plus une fois écrite,
 * alors que le vocabulaire s'étoffe à chaque partie. Ajouter une entrée ici
 * suffit à enrichir le générateur, sans jamais toucher au code.
 *
 * Conventions (détaillées dans `grammar.mjs`) :
 *   - un nom s'écrit « mot|traits » : f = féminin, p = pluriel, ! = pas d'élision ;
 *   - un adjectif s'écrit [masculin, féminin], invariable si les deux sont égaux.
 *
 * Le registre visé est celui d'une vraie carte de restaurant : des groupes
 * nominaux courts et concrets, pas de prose d'ambiance. « Sauce au poivre,
 * purée de pois et navets confits » se lit d'un coup d'œil en pleine partie,
 * « un fumet envoûtant qui emplit la salle » ne sert à rien.
 */

/* -------------------------------------------- */
/*  Standing de l'établissement                  */
/* -------------------------------------------- */

/**
 * L'axe qui pilote tout le générateur : la qualité du vocabulaire tiré, le
 * nombre de lignes à la carte, les prix et la fréquence des avaries.
 * `price` multiplie le prix de base, `good` est la probabilité qu'un tirage
 * pioche dans le vocabulaire flatteur plutôt que dans le vocabulaire honteux,
 * `defect` la probabilité qu'une ligne de la carte cache un problème.
 * Les libellés vivent dans `lang/*.json`, sous la clé `Standing.<key>`.
 */
export const STANDINGS = [
  { key: "miteux",         price: 0.4, good: 0.10, defect: 0.55 },
  { key: "pauvre",         price: 0.7, good: 0.30, defect: 0.35 },
  { key: "modeste",        price: 1.2, good: 0.55, defect: 0.18 },
  { key: "confortable",    price: 2.2, good: 0.75, defect: 0.08 },
  { key: "cossu",          price: 4.5, good: 0.90, defect: 0.04 },
  { key: "aristocratique", price: 9.0, good: 0.97, defect: 0.02 }
];

/* -------------------------------------------- */
/*  Vins                                         */
/* -------------------------------------------- */

export const WINE = {
  /** Le nom de tête est toujours masculin : la carte annonce une couleur. */
  colors: ["rouge|m", "blanc|m", "rosé|m", "clairet|m"],

  origins: [
    "du coteau", "des collines", "de la vallée", "du monastère", "de la côte",
    "du fleuve", "des terrasses", "d'un clos voisin", "du domaine", "de la treille",
    "de contrebande", "des marches du sud", "de derrière les fagots", "de l'année",
    "de garde", "du cellier", "de provenance incertaine", "que le patron dit importé"
  ],

  adjGood: [
    ["charpenté", "charpentée"], ["souple", "souple"], ["rond", "ronde"],
    ["ample", "ample"], ["fin", "fine"], ["capiteux", "capiteuse"],
    ["velouté", "veloutée"], ["tannique", "tannique"], ["frais", "fraîche"],
    ["vif", "vive"], ["nerveux", "nerveuse"], ["gouleyant", "gouleyante"],
    ["sec", "sèche"], ["fruité", "fruitée"], ["profond", "profonde"]
  ],

  adjBad: [
    ["âpre", "âpre"], ["vinaigré", "vinaigrée"], ["bouchonné", "bouchonnée"],
    ["éventé", "éventée"], ["râpeux", "râpeuse"], ["plat", "plate"],
    ["aigre", "aigre"], ["trouble", "trouble"], ["coupé d'eau", "coupée d'eau"],
    ["dur", "dure"], ["poussiéreux", "poussiéreuse"]
  ],

  notesRed: [
    "cerise noire|f", "prune|f", "cassis|m", "poivre|m", "réglisse|f", "cuir|m",
    "fumée|f", "sous-bois|m", "violette|f", "clou de girofle|m", "mûre|f",
    "noyau|m", "tabac|m", "terre mouillée|f"
  ],

  notesWhite: [
    "pomme verte|f", "poire|f", "miel|m", "agrumes|mp", "silex|m", "amande|f",
    "fleurs blanches|fp", "coing|m", "beurre|m", "foin coupé|m", "citron|m", "aubépine|f"
  ],

  units: ["au verre", "au pichet", "à la chopine", "la bouteille", "le pot"]
};

/* -------------------------------------------- */
/*  Bières et cidres                             */
/* -------------------------------------------- */

export const BEER = {
  types: [
    "blonde|f", "brune|f", "ambrée|f", "blanche|f", "rousse|f", "noire|f",
    "cervoise|f", "bière de garde|f", "cidre|m", "poiré|m", "hydromel|m",
    "petite bière|f", "bière d'orge|f", "bière de seigle|f", "bière au miel|f",
    "triple|f", "bière de mars|f"
  ],

  origins: [
    "de la maison", "du village", "de l'abbaye", "des faubourgs", "du port",
    "de contrebande", "du brasseur d'à côté", "de la cave", "de la dernière fournée",
    "que personne ne réclame", "de la barrique du fond", "d'importation"
  ],

  // Trois types sont masculins (cidre, poiré, hydromel) : les adjectifs sont
  // donc bien écrits [masculin, féminin], et pas seulement au féminin.
  adjGood: [
    ["mousseux", "mousseuse"], ["malté", "maltée"], ["houblonné", "houblonnée"],
    ["rond", "ronde"], ["désaltérant", "désaltérante"], ["corsé", "corsée"],
    ["frais", "fraîche"], ["dense", "dense"], ["net", "nette"],
    ["généreux", "généreuse"], ["ambré", "ambrée"], ["franc", "franche"]
  ],

  adjBad: [
    ["plat", "plate"], ["éventé", "éventée"], ["tiède", "tiède"],
    ["trouble", "trouble"], ["aigre", "aigre"], ["fadasse", "fadasse"],
    ["coupé d'eau", "coupée d'eau"], ["laiteux", "laiteuse"], ["âcre", "âcre"]
  ],

  notes: [
    "caramel|m", "pain grillé|m", "miel|m", "noisette|f", "café|m", "réglisse|f",
    "agrumes|mp", "pomme|f", "fumée|f", "malt|m", "!houblon|m", "poivre|m",
    "clou de girofle|m", "froment|m", "écorce|f", "paille|f"
  ],

  finishes: [
    "finale amère", "finale sèche", "finale douce", "finale crémeuse",
    "finale râpeuse", "finale qui s'éternise", "finale courte", "finale poivrée",
    "arrière-goût de tonneau", "arrière-goût de fer"
  ]
};

/* -------------------------------------------- */
/*  Eaux-de-vie                                  */
/* -------------------------------------------- */

export const SPIRIT = {
  types: [
    "eau-de-vie de prune|f", "eau-de-vie de poire|f", "eau-de-vie de cerise|f",
    "gnôle|f", "genièvre|m", "liqueur de plantes|f", "alcool de grain|m",
    "tord-boyaux|m", "whisky d'orge|m", "liqueur d'épices|f", "hydromel fort|m",
    "marc|m", "rhum des îles|m", "liqueur de noix|f", "vin cuit|m", "ratafia|m"
  ],

  adjGood: [
    ["rond", "ronde"], ["ambré", "ambrée"], ["parfumé", "parfumée"],
    ["long en bouche", "longue en bouche"], ["net", "nette"],
    ["chaleureux", "chaleureuse"], ["fin", "fine"], ["vieilli en fût", "vieillie en fût"]
  ],

  adjBad: [
    ["râpeux", "râpeuse"], ["brutal", "brutale"], ["huileux", "huileuse"],
    ["troublé", "troublée"], ["qui pique les yeux", "qui pique les yeux"],
    ["au goût de métal", "au goût de métal"], ["coupé", "coupée"]
  ],

  serving: [
    ["servi au dé", "servie au dé"],
    ["servi dans un verre qu'on préfère ne pas examiner", "servie dans un verre qu'on préfère ne pas examiner"],
    ["servi avec un verre d'eau", "servie avec un verre d'eau"],
    ["versé à la mesure", "versée à la mesure"],
    ["tiré du tonnelet du patron", "tirée du tonnelet du patron"],
    ["allumé d'une flamme bleue", "allumée d'une flamme bleue"],
    ["servi sans un mot", "servie sans un mot"],
    ["à boire d'un trait", "à boire d'un trait"]
  ]
};

/* -------------------------------------------- */
/*  Entrées                                      */
/* -------------------------------------------- */

export const STARTER = {
  /** Entrées froides : le nom est le plat lui-même. */
  cold: [
    "fromage de chèvre|m", "!hareng fumé|m", "œufs durs au vinaigre|mp",
    "terrine de campagne|f", "rillons|mp", "boudin grillé|m",
    "escargots à l'ail|mp", "beignets d'oignon|mp", "jambon sec|m",
    "pâté de lapin|m", "planche de fromages|f", "!harengs à l'huile|mp",
    "sardines salées|fp", "tourteau de sarrasin|m", "gésiers confits|mp",
    "pieds en gelée|mp", "olives et pain|fp"
  ],

  coldNotes: [
    ["coupé épais", "coupée épais"],
    ["taillé au couteau", "taillée au couteau"],
    ["servi avec du pain noir", "servie avec du pain noir"],
    ["arrosé d'huile", "arrosée d'huile"],
    ["relevé au poivre", "relevée au poivre"],
    ["accompagné de beurre salé", "accompagnée de beurre salé"],
    ["posé sur une planche", "posée sur une planche"],
    ["à partager", "à partager"],
    ["en portion honnête", "en portion honnête"],
    ["en portion chiche", "en portion chiche"]
  ],

  /** Soupes : « type » + complément. */
  soupTypes: ["soupe|f", "potage|m", "velouté|m", "bouillon|m", "brouet|m", "garbure|f", "consommé|m"],

  soupBases: [
    "poireaux|mp", "oignons|mp", "pois cassés|mp", "orge|f", "chou|m",
    "potiron|m", "navets|mp", "fèves|fp", "poisson|m", "volaille|f",
    "panais|mp", "ail|m", "châtaignes|fp", "lentilles|fp", "cresson|m",
    "queue de bœuf|f", "champignons|mp", "épeautre|m"
  ],

  brothGood: [
    ["clair", "claire"], ["parfumé", "parfumée"], ["épais", "épaisse"],
    ["velouté", "veloutée"], ["long en bouche", "longue en bouche"],
    ["relevé", "relevée"], ["nourrissant", "nourrissante"], ["brûlant", "brûlante"]
  ],

  brothBad: [
    ["clairet", "clairette"], ["fade", "fade"], ["gras", "grasse"],
    ["tiède", "tiède"], ["salé à l'excès", "salée à l'excès"],
    ["grumeleux", "grumeleuse"], ["froid au fond du bol", "froide au fond du bol"],
    ["qui a bouilli trop longtemps", "qui a bouilli trop longtemps"]
  ],

  soupGarnish: [
    "croûtons frottés à l'ail", "un filet de crème", "des herbes hachées",
    "un morceau de lard", "du pain rassis au fond du bol", "une cuillerée de saindoux",
    "des dés de navet", "un œuf cassé dedans", "de l'orge", "du persil",
    "un os à ronger", "rien de plus"
  ],

  /** Crudités : base + assaisonnement. */
  saladBases: [
    "cresson|m", "chou cru|m", "betteraves|fp", "verdure de saison|f",
    "concombres|mp", "raves|fp", "mesclun|m", "poireaux tièdes|mp",
    "lentilles froides|fp", "chou rouge|m"
  ],

  saladDressings: [
    "vinaigre|m", "huile de noix|f", "lard fondu|m", "miel et moutarde|m",
    "crème aigre|f", "saumure|f", "huile et fines herbes|f"
  ]
};

/* -------------------------------------------- */
/*  Plats                                        */
/* -------------------------------------------- */

export const MAIN = {
  /** Le mode de cuisson s'accorde avec la viande : « Caille rôtie », « Tripes en ragoût ». */
  methods: [
    ["rôti", "rôtie"], ["grillé", "grillée"], ["braisé", "braisée"],
    ["mijoté", "mijotée"], ["fumé", "fumée"], ["bouilli", "bouillie"],
    ["poêlé", "poêlée"], ["confit", "confite"], ["farci", "farcie"],
    ["laqué au miel", "laquée au miel"], ["cuit sous la cendre", "cuite sous la cendre"],
    ["en croûte", "en croûte"], ["à la broche", "à la broche"],
    ["en ragoût", "en ragoût"], ["en tourte", "en tourte"], ["au pot", "au pot"],
    ["en daube", "en daube"], ["en civet", "en civet"]
  ],

  /**
   * Trois viviers de viandes classés par prestige. Le standing décide dans
   * lequel on pioche, et le prestige renchérit le plat.
   */
  meatsPoor: [
    "viande grise|f", "tripes|fp", "abats|mp", "!hareng|m", "poule|f",
    "lard|m", "boudin|m", "carpe|f", "anguille|f", "mouton|m", "chèvre|f",
    "museau|m", "pied de porc|m", "rogatons|mp", "corneille|f"
  ],

  meatsCommon: [
    "lapin|m", "poulet|m", "canard|m", "oie|f", "agneau|m", "bœuf|m",
    "truite|f", "pigeon|m", "jarret de porc|m", "travers de porc|mp",
    "poitrine de porc|f", "saucisses|fp", "porc|m", "morue|f", "maquereau|m"
  ],

  meatsFine: [
    "chapon|m", "sanglier|m", "cerf|m", "chevreuil|m", "caille|f", "faisan|m",
    "perdrix|f", "gigot d'agneau|m", "selle de chevreuil|f", "brochet|m",
    "saumon|m", "lièvre|m", "cochon de lait|m", "langue de bœuf|f",
    "ris de veau|mp", "bécasse|f", "esturgeon|m"
  ],

  sauces: [
    "sauce au poivre", "sauce au vin", "sauce à l'ail", "sauce aux herbes",
    "jus de cuisson", "sauce à la crème", "sauce aigre-douce", "sauce à la moutarde",
    "sauce aux airelles", "beurre fondu", "sauce aux champignons", "réduction au miel",
    "sauce brune", "bouillon réduit", "graisse de cuisson", "sauce verte",
    "sauce au raifort", "coulis d'oignons"
  ],

  sides: [
    "pain noir", "purée de pois", "navets confits", "chou braisé", "orge perlé",
    "haricots blancs", "galette d'avoine", "panais rôtis", "fèves", "gruau",
    "pommes au four", "oignons grillés", "racines au four", "choucroute",
    "bouillie de millet", "pain trempé dans la sauce", "carottes fondantes",
    "champignons poêlés", "poireaux à l'étouffée"
  ],

  /** Une ligne par plat, servie telle quelle sous le nom. */
  portions: [
    "portion généreuse", "portion honnête", "portion chiche", "à partager",
    "servi dans le plat de cuisson", "servi sur une planche", "os compris",
    "sans façon", "présentation soignée"
  ]
};

/* -------------------------------------------- */
/*  Desserts                                     */
/* -------------------------------------------- */

export const DESSERT = {
  /** Formes qui appellent un complément en « à » : tarte aux prunes. */
  formsAt: [
    "tarte|f", "tourte|f", "flan|m", "gâteau|m", "beignets|mp", "gaufres|fp",
    "chausson|m", "clafoutis|m", "croustade|f", "crème|f", "gelée|f", "pudding|m"
  ],

  /** Formes qui appellent un complément en « de » : compote de pommes. */
  formsOf: ["compote|f", "confiture|f", "marmelade|f", "purée sucrée|f"],

  /** Desserts complets, qui ne se combinent avec rien. */
  standalone: [
    "pain d'épices|m", "massepain|m", "poires au vin|fp", "fromage blanc et miel|m",
    "fruits secs|mp", "dragées|fp", "lait caillé|m", "gaufrettes|fp",
    "pommes cuites sous la cendre|fp", "nougat|m", "rissoles sucrées|fp"
  ],

  fruits: [
    "pommes|fp", "prunes|fp", "cerises|fp", "poires|fp", "coings|mp", "figues|fp",
    "noix|fp", "noisettes|fp", "miel|m", "cannelle|f", "amandes|fp",
    "raisins secs|mp", "mûres|fp", "châtaignes|fp", "rhubarbe|f",
    "fleur d'oranger|f", "abricots|mp", "myrtilles|fp"
  ],

  notesGood: [
    ["servi encore tiède", "servie encore tiède"],
    ["nappé de crème", "nappée de crème"],
    ["saupoudré de sucre", "saupoudrée de sucre"],
    ["arrosé d'eau-de-vie", "arrosée d'eau-de-vie"],
    ["fondant", "fondante"],
    ["à la pâte fine et dorée", "à la pâte fine et dorée"],
    ["parfumé à la cannelle", "parfumée à la cannelle"],
    ["servi avec une cuillerée de miel", "servie avec une cuillerée de miel"],
    ["croustillant sur le dessus", "croustillante sur le dessus"]
  ],

  notesBad: [
    ["sec", "sèche"],
    ["brûlé sur les bords", "brûlée sur les bords"],
    ["à la pâte épaisse et lourde", "à la pâte épaisse et lourde"],
    ["froid", "froide"],
    ["sucré à l'excès", "sucrée à l'excès"],
    ["qui date de la veille", "qui date de la veille"],
    ["collant aux dents", "collante aux dents"]
  ]
};

/* -------------------------------------------- */
/*  Avaries et coups fourrés                     */
/* -------------------------------------------- */

/**
 * Les défauts sont l'intérêt principal du générateur en jeu : ils donnent au MJ
 * une raison de faire parler le plat. Ils s'accrochent à une ligne de la carte
 * plutôt qu'au menu entier, pour que le joueur qui a commandé s'en morde les
 * doigts.
 *
 * Ils sont classés par cible, sans quoi le tirage colle une viande avariée sur
 * une tarte aux prunes. `any` vaut partout, `food` pour ce qui se mange,
 * `drink` pour ce qui se boit.
 */
export const DEFECTS = {
  any: [
    "Un cheveu dedans. Le patron jurera que non.",
    "La portion a manifestement déjà été touchée.",
    "Le prix affiché n'est pas celui qu'on réclamera.",
    "Il en reste une seule part, et deux clients la veulent.",
    "Servi tiède, quoi qu'on en dise.",
    "Ce n'est pas du tout ce qui est annoncé sur la carte."
  ],

  food: [
    "La viande a tourné. Ça se sent au premier morceau.",
    "Le pain est de la veille, ou de l'avant-veille.",
    "Le fond du plat gratte contre les dents.",
    "Il y a du sable dans la sauce.",
    "Personne en cuisine ne sait dire ce qu'il y a dedans.",
    "Réchauffé au moins deux fois.",
    "Un os inattendu, et pas d'une bête connue.",
    "Ça sent le rance, mais ça se mange.",
    "La cuisinière a doublé le sel pour cacher le reste."
  ],

  drink: [
    "Coupé à l'eau, et sans la moindre discrétion.",
    "Le tonneau est ouvert depuis bien trop longtemps.",
    "Le verre n'a pas été lavé depuis le client précédent.",
    "Le pichet arrive moins plein qu'il ne devrait.",
    "Quelque chose flotte au fond, et ça n'est pas du dépôt.",
    "Ce n'est pas le cru annoncé, et le patron le sait."
  ]
};

/** Nettement plus rares, et tirées à part : là il y a un vrai problème. */
export const HAZARDS = {
  any: [
    "Empoisonné. La dose met à terre en quelques minutes.",
    "Empoisonné faiblement : nausées et sueurs jusqu'au matin.",
    "Quelqu'un a payé la cuisine pour y glisser un somnifère."
  ],

  food: [
    "Un champignon s'est glissé dans la préparation. Ce n'est pas le bon.",
    "La viande vient d'une bête qui n'aurait pas dû être mangée."
  ],

  drink: [
    "L'alcool est frelaté : aveugle qui en boit trop.",
    "Le tonneau a été rempli avec l'eau du puits condamné."
  ]
};
