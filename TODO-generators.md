# Générateurs : suite et idées écartées

## À faire ensuite

**Générateur d'ambiance.** Des mots-clés de description par type de lieu, à
lancer d'un coup d'œil : pour une taverne, « bois, feu qui crépite, chopes,
sifflement, sciure ». Prévoir un choix de lieu (taverne, temple, échoppe,
ruelle, forêt, donjon, marché) et une sortie en liste courte, pas en phrases :
c'est le MJ qui fait la phrase, le générateur ne fournit que la matière.

## Pistes pour le générateur de noms

Il couvre quatre familles (personnes, enseignes, lieux, organisations). Les
personnes se déclinent en six ascendances de fantasy classique, chacune
caractérisée moins par son stock de prénoms que par sa manière de nommer, ce que
décrit sa table `forms` : patronyme chez les nains, surnom de combat chez les
orcs, nom composé pris à la nature chez les elfes.

Les extensions naturelles, si le besoin se présente :

- **D'autres ascendances.** Ajouter un peuple, c'est ajouter une entrée à
  `ANCESTRIES` : la logique et l'interface se mettent à jour toutes seules, la
  rangée de pastilles étant construite depuis la table. Un demi-elfe qui
  piocherait dans deux tables demanderait en revanche une forme de plus.
- **Des variantes régionales humaines** (nordique, latine, arabisante, slave).
  Même mécanique, sous l'étiquette d'ascendance ou dans une rangée à part.
- **Étendre l'ascendance aux lieux et aux enseignes.** Une cité naine ne se
  nomme pas comme un hameau halfelin. C'est le plus gros chantier des trois,
  parce qu'il faut un jeu de tables de toponymes par peuple.
- **D'autres découpages en colonnes.** Les personnes sont déjà séparées en
  hommes et femmes, chaque colonne ayant son propre tirage. Le mécanisme est
  générique (`columns` dans `SECTIONS`) : découper les lieux en habités et
  sauvages ne demanderait qu'une entrée de plus dans la table des sections.

## Écarté volontairement

**La taverne complète.** Le générateur d'origine (The Copper Sanctum) produit
aussi le patron, le barman, la clientèle et les chambres. On ne le reprend pas :
le nom de l'établissement revient au générateur de noms, la salle et
l'atmosphère au générateur d'ambiance. Trois générateurs qui font une chose
chacun valent mieux qu'un seul qui déborde sur les deux autres.

**Les « gimmicks » de l'original.** Une trentaine de particularités (fontaine
d'alcool, défi du gros mangeur, vins importés…) qui modifient les prix, la
qualité et le nombre de plats. C'est ce qui rend le générateur d'origine
imprévisible, et c'est le premier candidat à ajouter si les cartes finissent par
se ressembler. Le point d'accroche existe déjà : il suffirait d'un modificateur
appliqué entre `countFor()` et `priceOf()`.

**La traduction du vocabulaire.** Les tables de `tavern-menu-data.mjs` sont
françaises et le resteront : le genre des noms et l'accord des adjectifs y sont
inscrits en dur (voir `generators/grammar.mjs`). Une version anglaise ne serait
pas une traduction mais un second jeu de tables avec sa propre grammaire. Seule
l'interface passe par `lang/*.json`.

**La sortie vers le chat et le presse-papier.** Seule la page de journal est
implémentée. Les deux autres sorties sont triviales à ajouter le jour où le
besoin se présente : le panneau expose déjà `journal()`, qui rend le HTML.

## Détails à surveiller

- Les prix sont en pièces de cuivre en interne (1 po = 10 pa = 100 pc). Si le
  système de jeu change d'échelle, seuls `BASE_PRICE` et `formatPrice()` bougent.
- Un adjectif ajouté aux tables doit respecter la règle du **seul mot variable,
  placé en tête** : `["relevé au poivre", "relevée au poivre"]` fonctionne,
  `["servi froid", "servie froide"]` non, parce qu'il demande deux accords et
  que seul le premier mot en reçoit un. La règle se vérifie mécaniquement : dans
  un couple, tous les mots après le premier doivent être identiques aux deux
  genres, et un couple dont la tête est une préposition doit être identique en
  entier.
- Les noms à h aspiré (hareng, houblon, haricot) se marquent d'un `!` en tête,
  sans quoi on obtient « d'hareng ».
