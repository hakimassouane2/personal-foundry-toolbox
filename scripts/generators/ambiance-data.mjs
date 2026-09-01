/**
 * Vocabulaire d'ambiance, par type de lieu
 * ----------------------------------------
 * De la matière brute pour décrire un endroit, pas des phrases toutes faites.
 * Le générateur ne rédige pas à la place du MJ : il lui pose sous les yeux
 * quelques perceptions concrètes, à lâcher telles quelles ou à assembler.
 *
 * D'où le registre : des groupes nominaux courts, précis et vérifiables.
 * « Sciure fraîche au sol » se dit à voix haute et se voit ; « une atmosphère
 * pesante » ne décrit rien et ne donne rien à faire aux joueurs.
 *
 * Trois sens plus une quatrième colonne, `detail`, qui est la plus utile en
 * jeu : un point d'accroche concret, quelque chose d'anormal ou d'examinable,
 * de quoi lancer une question plutôt que de meubler.
 */

export const PLACES = [
  /* -------------------------------------------- */
  {
    key: "tavern",
    sight: [
      "poutres noircies par la fumée", "sciure fraîche au sol",
      "chandelles qui coulent", "un feu bas dans l'âtre",
      "tables marquées au couteau", "des manteaux trempés sur les crochets",
      "un chien couché sous une table", "des tonneaux empilés au fond",
      "la lumière orange des lampes à huile", "un escalier étroit vers l'étage",
      "des chopes alignées à sécher", "les vitres embuées",
      "un banc réparé avec une planche brute", "des bougies de suif, pas de cire"
    ],
    sound: [
      "le crépitement du feu", "des chopes qui cognent le bois",
      "un rire trop fort au fond", "quelqu'un qui siffle faux",
      "le raclement des bancs", "une dispute qui monte puis retombe",
      "des dés qui roulent", "la porte qui bat au vent",
      "un plancher qui craque à l'étage", "un tonneau qu'on roule",
      "une chanson reprise à contretemps", "le grattement d'un tabouret"
    ],
    smell: [
      "bière renversée", "graisse chaude", "fumée de bois", "laine mouillée",
      "sueur et cuir", "pain qui sort du four", "suif des chandelles",
      "oignons qui cuisent", "vinaigre", "chien mouillé", "fond de tonneau",
      "terre battue humide"
    ],
    detail: [
      "une chaise cassée que personne n'a remplacée",
      "des entailles comptées à la craie derrière le comptoir",
      "une lame plantée dans une poutre, oubliée là",
      "le patron essuie la même chope depuis dix minutes",
      "une table que tout le monde évite",
      "des bottes sèchent près du feu, sans propriétaire visible",
      "un avis cloué à la porte, à demi arraché",
      "une trappe à cave mal refermée",
      "un client n'a pas touché à son assiette",
      "un chapeau oublié sur un crochet depuis des semaines",
      "deux clients se taisent quand vous passez",
      "le tarif affiché a été corrigé au charbon"
    ]
  },

  /* -------------------------------------------- */
  {
    key: "temple",
    sight: [
      "des colonnes trop hautes pour la nef", "des cierges par dizaines",
      "des dalles usées en creux au centre", "une statue au visage effacé",
      "des vitraux qui coupent la lumière en morceaux",
      "des bancs alignés, presque vides", "des ex-voto accrochés aux murs",
      "un bassin d'eau immobile", "de la poussière dans un rai de lumière",
      "des tentures lourdes", "un autel de pierre nue",
      "des noms gravés à même le mur"
    ],
    sound: [
      "un écho qui double chaque pas", "une psalmodie basse",
      "le grésillement des mèches", "le silence, épais",
      "une porte lourde quelque part", "des sanglots étouffés",
      "une cloche, deux étages plus haut", "un balai qu'on traîne",
      "le vent dans les combles", "un genou qui touche la pierre"
    ],
    smell: [
      "encens froid", "cire fondue", "pierre humide", "vieux tissu",
      "huile parfumée", "poussière chaude", "fleurs qui fanent",
      "moisissure derrière les tentures"
    ],
    detail: [
      "un cierge éteint alors que les autres brûlent",
      "une offrande encore fraîche",
      "un nom gratté sur la liste des donateurs",
      "une porte latérale fermée à clé",
      "un banc réservé, jamais occupé",
      "des traces de pas dans la poussière, vers l'arrière",
      "un officiant vous regarde une seconde de trop",
      "une dalle sonne creux",
      "de la cire toute fraîche devant une statue oubliée",
      "le tronc des aumônes a été forcé, puis refermé"
    ]
  },

  /* -------------------------------------------- */
  {
    key: "market",
    sight: [
      "des bâches tendues de guingois", "des cageots empilés",
      "de la boue piétinée entre les étals", "des poules en cages d'osier",
      "des tissus de couleur au vent", "une balance à fléau",
      "des mouches sur la viande", "un enfant qui court entre les jambes",
      "des paniers de racines terreuses", "un chariot à moitié déchargé",
      "des étals repliés en bout de rangée"
    ],
    sound: [
      "des cris qui se répondent d'un étal à l'autre", "le marchandage",
      "des roues de charrette sur les pavés", "des bêtes qui protestent",
      "un marteau sur une caisse", "des pièces qu'on compte",
      "quelqu'un qu'on accuse de vol", "une pelle qui racle le grain",
      "un boniment répété pour la centième fois"
    ],
    smell: [
      "poisson qui tourne", "épices", "crottin", "pain chaud", "cuir neuf",
      "fruits trop mûrs", "fumée de braseros", "laine grasse", "savon noir"
    ],
    detail: [
      "un étal replié plus tôt que les autres",
      "une balance qui penche toujours du même côté",
      "un marchand refuse de vous regarder",
      "une pièce fausse dans la monnaie rendue",
      "un panier abandonné au milieu de l'allée",
      "deux gardes traversent sans s'arrêter",
      "sur un étal de babioles, une pièce n'a rien à faire là",
      "des empreintes de bottes sur une bâche au sol",
      "le même acheteur passe pour la troisième fois"
    ]
  },

  /* -------------------------------------------- */
  {
    key: "alley",
    sight: [
      "du linge tendu d'un mur à l'autre",
      "des murs si proches qu'on touche les deux",
      "une flaque qui ne sèche jamais", "un escalier qui monte dans le noir",
      "des volets clos", "un tas d'ordures contre un mur",
      "de la mousse entre les pavés",
      "une lanterne sur trois qui fonctionne",
      "des marques tracées à hauteur d'homme", "un chat qui détale"
    ],
    sound: [
      "des pas qui s'arrêtent quand les vôtres s'arrêtent",
      "de l'eau qui goutte", "une dispute derrière un volet", "des rats",
      "un enfant qui pleure, deux étages plus haut",
      "le vent qui s'engouffre", "une porte qu'on verrouille à votre passage",
      "plus rien du tout, brusquement"
    ],
    smell: [
      "eaux usées", "urine", "pluie sur la pierre chaude",
      "fumée de cheminée", "chou bouilli", "pourriture douceâtre", "goudron",
      "moisi"
    ],
    detail: [
      "une marque à la craie sur une porte",
      "une porte sans poignée à l'extérieur",
      "du sang lavé à moitié",
      "une lanterne allumée devant une seule porte",
      "quelqu'un vous suit depuis deux rues",
      "une planche mal clouée sur une fenêtre du rez-de-chaussée",
      "un tas d'ordures fouillé récemment",
      "de la fumée là où il ne devrait pas y avoir de feu",
      "une échelle laissée contre un mur"
    ]
  },

  /* -------------------------------------------- */
  {
    key: "forest",
    sight: [
      "des fûts trop droits, trop serrés", "de la lumière verte",
      "des racines qui débordent sur le chemin",
      "des fougères à hauteur de taille", "un arbre foudroyé",
      "de la mousse d'un seul côté des troncs",
      "des champignons en escalier sur un tronc mort",
      "une clairière trop ronde",
      "des toiles d'araignée en travers du sentier",
      "des feuilles mortes jusqu'aux chevilles"
    ],
    sound: [
      "un craquement sur la gauche", "les oiseaux se taisent d'un coup",
      "le vent haut dans les cimes, rien en bas", "un pic qui frappe",
      "un ruisseau qu'on entend sans le voir", "des mouches",
      "un cerf qui brame au loin", "des branches qui plient",
      "le même chant d'oiseau, deux fois de suite"
    ],
    smell: [
      "humus", "résine", "champignons", "eau stagnante",
      "feuilles en décomposition", "un animal mort, quelque part",
      "fumée lointaine", "fleurs écrasées"
    ],
    detail: [
      "un sentier qui n'apparaît qu'une fois dépassé",
      "des marques d'ongles sur une écorce, à trois mètres du sol",
      "un tas de pierres qui n'est pas naturel",
      "un piège rouillé, encore armé",
      "des os de petit gibier, proprement nettoyés",
      "un ruban noué à une branche",
      "un feu éteint depuis peu",
      "une entaille fraîche sur un tronc",
      "aucun oiseau dans un rayon de cent pas"
    ]
  },

  /* -------------------------------------------- */
  {
    key: "underground",
    sight: [
      "des murs suintants", "la lumière qui s'arrête net à trois pas",
      "des marques d'outils sur la pierre",
      "un couloir qui descend en pente douce",
      "des racines qui percent la voûte",
      "de la poussière soulevée à chaque pas",
      "des ossements poussés contre un mur",
      "un plafond trop bas pour se tenir droit",
      "des piliers grossièrement taillés", "une flaque immobile et noire"
    ],
    sound: [
      "de l'eau qui goutte, régulière",
      "l'écho de vos pas, avec un temps de retard",
      "un courant d'air qui siffle", "un grattement dans le mur",
      "quelque chose qui bouge, plus loin", "le silence entre deux gouttes",
      "une pierre qui roule toute seule",
      "une respiration qui n'est pas la vôtre"
    ],
    smell: [
      "pierre mouillée", "moisissure", "air stagnant", "fer rouillé",
      "charogne", "salpêtre", "fumée ancienne", "terre remuée"
    ],
    detail: [
      "une torche consumée dans son anneau, encore tiède",
      "des empreintes qui ne vont que dans un sens",
      "une porte entrouverte de deux doigts",
      "des marques de griffes à hauteur de genou",
      "un courant d'air venu d'un mur plein",
      "la poussière est intacte partout sauf sur une dalle",
      "une chaîne scellée au mur, sans rien au bout",
      "des chiffres gravés près d'une porte",
      "un tas de gravats trop bien rangé"
    ]
  },

  /* -------------------------------------------- */
  {
    key: "manor",
    sight: [
      "des portraits qui suivent le couloir",
      "des housses blanches sur les meubles", "un escalier de bois ciré",
      "des tapis qui étouffent les pas", "un lustre à demi allumé",
      "des portes-fenêtres jusqu'au sol",
      "de la poussière sur les cadres, pas sur le sol",
      "un couloir plus long qu'il ne devrait",
      "des tentures tirées en plein jour",
      "de l'argenterie sortie sans raison"
    ],
    sound: [
      "une horloge, quelque part", "un plancher qui craque tout seul",
      "des voix étouffées derrière une porte",
      "des couverts posés sur une table", "le froissement d'une robe",
      "une porte de service qui bat", "le vent dans une cheminée",
      "un chien qui gratte à une porte"
    ],
    smell: [
      "cire d'abeille", "renfermé", "parfum lourd", "fleurs coupées",
      "vieux papier", "feu de cheminée", "camphre", "vin renversé"
    ],
    detail: [
      "un portrait décroché, le crochet encore au mur",
      "une porte du couloir qui n'ouvre sur rien",
      "une chaise tournée face au mur",
      "de la boue sur un tapis, à l'intérieur",
      "un couvert de trop à la table",
      "une clé laissée sur une serrure",
      "un domestique qui n'était pas là il y a un instant",
      "des cendres de papier dans l'âtre",
      "une pendule arrêtée, les autres à l'heure"
    ]
  },

  /* -------------------------------------------- */
  {
    key: "harbour",
    sight: [
      "des mâts en forêt", "des filets étendus à sécher",
      "des caisses empilées sous bâche",
      "de l'eau grasse entre le quai et la coque", "une coque en carénage, quille à l'air",
      "des cordages lovés", "une grue à bras",
      "des marins assis sur des bittes d'amarrage",
      "une passerelle qui ploie", "des barils marqués à la craie"
    ],
    sound: [
      "des cordages qui grincent", "l'eau qui claque contre la pierre",
      "des mouettes", "un contremaître qui hurle", "une cloche de brume",
      "des pas lourds sur des planches", "une chaîne qui se déroule",
      "des langues qu'on ne comprend pas"
    ],
    smell: [
      "sel", "poisson", "goudron", "algues à marée basse", "chanvre", "vase",
      "épices d'une cale ouverte", "bois mouillé"
    ],
    detail: [
      "une caisse déchargée à l'écart des autres",
      "un navire sans pavillon",
      "un homme compte ceux qui débarquent",
      "une planche de coque réparée à la hâte",
      "des traces de sang sur un quai lavé",
      "un tonneau qui ne figure sur aucun registre",
      "une barque amarrée mais vide, rames dedans",
      "quelqu'un embarque de nuit",
      "un chargement qu'on couvre dès que vous approchez"
    ]
  }
];
