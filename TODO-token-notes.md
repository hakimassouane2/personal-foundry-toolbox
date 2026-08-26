# Notes de token : idées mises de côté

La v1 (`scripts/token-notes.mjs`) est volontairement minimale : survol pour
lire, clic pour écrire, deux niveaux de note, cases à cocher. Voici ce qui a
été proposé, discuté, et écarté pour l'instant. À reprendre si le besoin se
confirme en jeu.

## Pastille sur le token

Petite icône MJ dans un coin du token quand une note existe, pour savoir
qu'elle est là sans avoir à survoler. Deux aspects : note simple, ou note dont
il reste des cases non cochées.

Piste technique : un `PIXI.Sprite` ajouté aux enfants du token, redessiné sur
`drawToken` et `refreshToken`, masqué si `!game.user.isGM`. Attention à
l'échelle du token et aux tokens de plusieurs cases.

C'est l'idée la plus utile des trois : sans elle, une note écrite en prep
n'est retrouvée que par hasard.

## Ouverture automatique au tour de combat

Quand le tour d'un token qui a une note commence, ouvrir son panneau épinglé
le temps du tour, puis le refermer.

Piste technique : hook `updateCombat` sur le changement de `turn`, réutiliser
`openPanel()` en forçant l'épinglage, fermer au tour suivant. Prévoir un
réglage pour couper, et ne rien faire si le panneau est déjà en saisie.

## Liste des notes de la scène

Un bouton dans la barre d'outils Tokens qui liste toutes les notes de la scène
courante, avec un clic pour recadrer la vue sur le token concerné. Sert à
relire ses notes avant la partie plutôt qu'en jeu.

Piste technique : une `ApplicationV2` qui parcourt `canvas.scene.tokens`, garde
ceux qui portent le flag, et affiche nom + première ligne. Recadrage par
`canvas.animatePan({ x, y, scale })`.

## Rappel daté

Le cas « rappeler qu'il a une maladie qui se déclenche dans 2 jours » est
couvert en v1 par une case à cocher. Un vrai rappel daté supposerait de se
brancher sur un calendrier (Simple Calendar ou équivalent) et de faire remonter
la note quand la date tombe. Hors périmètre tant qu'aucun calendrier n'est
installé dans le monde.

## Autres pistes non retenues

- **Points d'entrée supplémentaires** : bouton dans le HUD du token, raccourci
  clavier sur la sélection, onglet « Notes MJ » sur la fiche d'acteur. Écartés
  pour garder un seul geste à retenir. Le HUD est le plus facile à rajouter :
  copier la structure de `scripts/torch-button.mjs`.
- **Notes côté joueur** : sciemment hors périmètre, tout est MJ uniquement.
- **Éditeur ProseMirror** : écarté au profit du texte brut, plus rapide à
  ouvrir et compatible avec l'édition sur place.
