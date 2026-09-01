/**
 * Noms de personnes, par ascendance
 * ---------------------------------
 * Six peuples de fantasy classique. Chacun se distingue moins par son stock de
 * prénoms que par sa *façon* de nommer : les nains portent un patronyme, les
 * orcs un surnom gagné au combat, les elfes un nom composé pris à la nature,
 * les halfelins un sobriquet de cuisine. C'est ce que décrit `forms`, et c'est
 * ce qui rend un nom reconnaissable sans avoir à empiler les listes.
 *
 * Chaque ascendance expose :
 *   - `firstMale` / `firstFemale` : les prénoms ;
 *   - `surnames`   : noms de famille figés, invariables ;
 *   - `particles`  : compléments introduits par une préposition (facultatif) ;
 *   - `epithets`   : sobriquets accordés en genre, couple [m, f] (facultatif) ;
 *   - `forms`      : les tournures employées et leur poids relatif.
 *
 * Les formes disponibles sont « surname », « particle », « epithet » et
 * « patronymic » (« fils de Thrain », qui puise dans `firstMale`).
 */

export const ANCESTRIES = [
  /* -------------------------------------------- */
  {
    key: "human",
    firstMale: [
      "Aldric", "Anselme", "Aubry", "Barnabé", "Baudouin", "Bertran", "Clovis",
      "Colin", "Corbin", "Denis", "Doran", "Edgard", "Enguerrand", "Erwan",
      "Firmin", "Foulques", "Garin", "Gaubert", "Gautier", "Hervé", "Huon",
      "Isambert", "Jehan", "Josselin", "Lambert", "Landri", "Maugis", "Milon",
      "Nivard", "Norbert", "Odilon", "Ogier", "Payen", "Perrin", "Quentin",
      "Raoul", "Renaud", "Sévrin", "Tancrède", "Thibaud", "Ursin", "Vauquelin",
      "Vivien", "Guilhem", "Aymeric", "Bohémond", "Eudes", "Gonthier", "Rolant",
      "Sicard", "Amaury", "Berthold", "Galeran", "Hugues", "Mainard"
    ],
    firstFemale: [
      "Adeline", "Agnès", "Alix", "Berthe", "Bertrade", "Blanche", "Clémence",
      "Constance", "Denise", "Douce", "Eloise", "Emeline", "Eudeline", "Fauve",
      "Flore", "Gisèle", "Hélisende", "Hersende", "Isabeau", "Isaure",
      "Jacinthe", "Jehanne", "Katel", "Léonie", "Liesse", "Mahaut", "Marguerite",
      "Nicolette", "Odette", "Oriane", "Perrine", "Pétronille", "Radegonde",
      "Rosemonde", "Sancie", "Sibylle", "Thomasse", "Tiphaine", "Ursule",
      "Viviane", "Yolande", "Aveline", "Basilie", "Ermengarde", "Guiburc",
      "Maheut", "Sédile", "Aalis"
    ],
    surnames: [
      "Charbonnier", "Tisserand", "Ferrand", "Meunier", "Lecoq", "Boisseau",
      "Chevrier", "Poirier", "Vaillant", "Legrand", "Petitjean", "Roux",
      "Cordier", "Fauconnier", "Pelletier", "Boulanger", "Tanneur", "Sellier",
      "Charron", "Bouvier", "Berger", "Fournier", "Mercier", "Chaudron",
      "Bonnefoy", "Malebranche", "Courtois", "Lévêque", "Larchevêque",
      "Bouchard", "Grandpré", "Beaufort", "Clerbois", "Marchand", "Vannier",
      "Sanglier", "Gantier", "Escoffier", "Talvas", "Brisefer", "Tirelance",
      "Beaumanoir"
    ],
    particles: [
      "de Valmont", "de Roche-Noire", "du Pré", "de l'Aulne", "des Marais",
      "de Fontclaire", "de Bourgneuf", "d'Aubepierre", "de Hautbois",
      "des Trois-Gués", "de Belleferme", "du Vieux-Pont", "de Sauveterre",
      "de Combelongue", "des Essarts", "de Montorgueil", "de la Serre",
      "du Chastel", "de Fresnoy", "des Ormeaux", "de Vaubrun", "de Clairmarais"
    ],
    epithets: [
      ["le Borgne", "la Borgne"], ["le Roux", "la Rousse"],
      ["le Boiteux", "la Boiteuse"], ["le Taciturne", "la Taciturne"],
      ["le Bègue", "la Bègue"], ["le Sourd", "la Sourde"],
      ["le Jeune", "la Jeune"], ["l'Ancien", "l'Ancienne"],
      ["le Sage", "la Sage"], ["le Noir", "la Noire"],
      ["le Rouge", "la Rouge"], ["le Balafré", "la Balafrée"],
      ["le Muet", "la Muette"], ["le Chauve", "la Chauve"],
      ["le Gros", "la Grosse"], ["le Maigre", "la Maigre"],
      ["le Hardi", "la Hardie"], ["le Cruel", "la Cruelle"],
      ["le Pieux", "la Pieuse"], ["le Grêlé", "la Grêlée"],
      ["le Manchot", "la Manchote"], ["le Fourbe", "la Fourbe"],
      ["le Vieux", "la Vieille"], ["le Bref", "la Brève"],
      ["le Franc", "la Franche"], ["le Fauve", "la Fauve"],
      ["le Patient", "la Patiente"], ["le Lent", "la Lente"],
      ["le Sanglant", "la Sanglante"], ["le Cendré", "la Cendrée"]
    ],
    forms: [["surname", 45], ["particle", 30], ["epithet", 25]]
  },

  /* -------------------------------------------- */
  {
    key: "elf",
    firstMale: [
      "Aelrin", "Aluinn", "Caelith", "Cirandel", "Elandor", "Erevan", "Faelar",
      "Faerion", "Ilythar", "Ithariel", "Lathiel", "Maenor", "Nyleth", "Ondemar",
      "Rielis", "Serenil", "Sylvarin", "Thaelis", "Valandir", "Yvandriel",
      "Aerith", "Belanor", "Cyrandil", "Eluthar", "Naevys"
    ],
    firstFemale: [
      "Aelis", "Aluine", "Caelwen", "Ciriane", "Elarine", "Erelin", "Faelyn",
      "Faerwen", "Ilyane", "Ithiliane", "Lathiane", "Maeleth", "Nyssara",
      "Ondine", "Riellyn", "Sereleth", "Sylvaine", "Thaeliane", "Valanthe",
      "Yvraine", "Aeriel", "Belanwe", "Cyriane", "Eluthiel", "Naevyre"
    ],
    surnames: [
      "Feuillargent", "Chantefeuille", "Aubelune", "Clairsource", "Frêne-Blanc",
      "Rive-d'Étoile", "Fil-de-Soie", "Songe-de-Lune", "Baie-Claire",
      "Murmure-des-Cimes", "Aube-Sereine", "Rameau-d'Or", "Vent-Léger",
      "Ombre-Douce", "Perce-Brume", "Colline-Verte", "Larme-de-Rosée"
    ],
    particles: [
      "des Cimes claires", "du Bois d'Argent", "des Sources froides",
      "de la Clairière haute", "du Val d'Automne", "des Longues Feuilles",
      "de la Rive pâle", "des Vents doux", "du Premier Printemps",
      "des Étoiles basses"
    ],
    forms: [["surname", 60], ["particle", 40]]
  },

  /* -------------------------------------------- */
  {
    key: "dwarf",
    firstMale: [
      "Baldrun", "Borin", "Brokkar", "Dagrun", "Drommi", "Durnak", "Farin",
      "Gimrik", "Grunni", "Harbek", "Hjalmar", "Korgan", "Morrik", "Nalgrim",
      "Orvik", "Rurik", "Thrain", "Torgar", "Ulfar", "Vondar", "Snorri",
      "Bramgar", "Kadrin", "Vigmar"
    ],
    firstFemale: [
      "Balda", "Brynja", "Bruna", "Dagny", "Dorra", "Fjora", "Gerta", "Halla",
      "Hilda", "Katla", "Morgun", "Nalda", "Orva", "Runa", "Sigrun", "Thora",
      "Ulfhild", "Vonna", "Astrid", "Gudrun", "Ingra", "Solveig"
    ],
    surnames: [
      "Brisecrâne", "Marteau-de-Fer", "Barbe-de-Rouille", "Taillepierre",
      "Forgefonte", "Poing-de-Granit", "Enclume-Noire", "Fond-de-Mine",
      "Casse-Roc", "Or-Profond", "Veine-d'Argent", "Coule-Braise",
      "Voûte-Basse", "Cent-Marches", "Ferre-Tout"
    ],
    forms: [["patronymic", 45], ["surname", 55]]
  },

  /* -------------------------------------------- */
  {
    key: "gnome",
    firstMale: [
      "Bourdon", "Dorlin", "Fizzik", "Frilou", "Grelin", "Marlouin", "Nabbik",
      "Pimpin", "Pistelin", "Quibb", "Tibbert", "Tirlin", "Vifgret", "Zabrin",
      "Cliquet", "Fripon", "Mirlot", "Tourbil"
    ],
    firstFemale: [
      "Bourdine", "Dorline", "Fizza", "Frilette", "Greline", "Marloue",
      "Nabine", "Pimpine", "Pistelle", "Quibbine", "Tibbine", "Tirline",
      "Vivrette", "Zabrine", "Cliquette", "Friponne", "Mirlotte", "Tourbille"
    ],
    surnames: [
      "Ressort-Malin", "Tournevire", "Bricolin", "Cliquetis", "Rouage-d'Or",
      "Fume-Cornue", "Tire-Bouchon", "Pique-Étincelle", "Vif-Argent",
      "Cent-Rouages", "Trotte-Menu", "Farfouille", "Casse-Lunettes",
      "Sonne-Creux", "Poudre-Fine"
    ],
    epithets: [
      ["le Curieux", "la Curieuse"], ["le Bricoleur", "la Bricoleuse"],
      ["le Distrait", "la Distraite"], ["le Bavard", "la Bavarde"],
      ["le Fêlé", "la Fêlée"], ["le Prudent", "la Prudente"],
      ["le Roussi", "la Roussie"], ["le Chanceux", "la Chanceuse"]
    ],
    forms: [["surname", 65], ["epithet", 35]]
  },

  /* -------------------------------------------- */
  {
    key: "orc",
    firstMale: [
      "Brakk", "Durgash", "Gorlak", "Grosh", "Hruk", "Karg", "Krug", "Mogh",
      "Muzgar", "Nargul", "Rakash", "Thruk", "Ugrash", "Urzog", "Vorg",
      "Zhakar", "Bolgor", "Gnash", "Ruk", "Vharg"
    ],
    firstFemale: [
      "Brakka", "Durga", "Gorla", "Grisha", "Hruka", "Karga", "Kruga", "Mogha",
      "Muzga", "Nargha", "Rakasha", "Thruka", "Ugra", "Urza", "Vorga", "Zhaka",
      "Bolga", "Nashka", "Ruka", "Vharga"
    ],
    surnames: [
      "Brise-Échine", "Fend-Crâne", "Mange-Fer", "Sang-Noir", "Croc-Tordu",
      "Trois-Cicatrices", "Œil-Crevé", "Poing-de-Pierre", "Hurle-la-Nuit",
      "Dent-Cassée", "Peau-de-Suif", "Traîne-Charogne", "Casse-Bouclier"
    ],
    particles: [
      "du clan Croc-Rouge", "du clan Cendre-Noire", "du clan Os-Blanc",
      "du clan Hache-Fendue", "du clan Fosse-Profonde", "du clan Ventre-Creux",
      "des Marches brûlées", "de la Horde basse"
    ],
    forms: [["surname", 60], ["particle", 40]]
  },

  /* -------------------------------------------- */
  {
    key: "halfling",
    firstMale: [
      "Anselot", "Bardin", "Colinet", "Doriot", "Fabiot", "Gaspardin", "Hobin",
      "Jacquot", "Lubin", "Merlot", "Nicolot", "Perrichon", "Robinet", "Tanchou",
      "Vivot", "Bertelot", "Guillot", "Maclou", "Pinson"
    ],
    firstFemale: [
      "Annette", "Barbotine", "Colinette", "Doriette", "Fabiette", "Gaspardine",
      "Hobine", "Jacquette", "Lubine", "Merline", "Perrichonne", "Robinette",
      "Tanchoue", "Vivette", "Bertelote", "Guillotte", "Maclotte", "Pinsonne"
    ],
    surnames: [
      "Sac-de-Grain", "Pied-Chaud", "Bonnepoire", "Croquenoix", "Tourtebonne",
      "Miel-Doux", "Grattepanse", "Chaudron-Plein", "Bellecave",
      "Fond-de-Terrier", "Pomme-Cuite", "Trois-Repas", "Bourrelin", "Coussinet",
      "Beurre-Frais"
    ],
    particles: [
      "du Terrier vert", "des Prés bas", "de la Butte ronde", "du Clos aux Oies",
      "des Trois Pommiers", "du Bout du Chemin", "de la Mare tiède",
      "des Champs dorés"
    ],
    forms: [["surname", 55], ["particle", 45]]
  }
];

/** L'ascendance humaine, qui sert aussi aux toponymes en Saint-. */
export const HUMAN = ANCESTRIES[0];
