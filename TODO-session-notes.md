# Notes de session : idées mises de côté

La v1 (`scripts/session-notes.mjs`) est volontairement minimale : une touche,
un champ texte, sauvegarde automatique, un export vers un journal daté. Voici
ce qui a été discuté et écarté. À reprendre si le besoin se confirme en jeu.

## Insertion de l'heure

Un bouton ou un raccourci qui écrit `[21h34] ` en début de ligne, pour dater
les entrées au fil de la séance. Cinq lignes de code, mais on ne sait pas
encore si l'horodatage sert vraiment une fois les notes recopiées ailleurs.
L'export, lui, horodate déjà chaque bloc versé dans le journal.

## Cases a cocher

L'edition riche a fait disparaitre le sucre `[ ]` / `[x]` : ce qui est tape
reste du texte, une vraie case demanderait une commande maison et un rendu
propre a l'export. En attendant, `[ ]` ecrit a la main se relit tres bien.

## Grammaire de texte brut

`token-notes.mjs` garde sa grammaire markdown maison, indispensable parce que
son panneau lit et ecrit du texte nu. Les notes de session, elles, stockent
directement le HTML de la zone editable : les deux fichiers n'ont plus rien a
factoriser, et c'est tres bien ainsi.

## Historique versionné

Écarté au profit d'un filet à un coup : le tampon n'est jamais vidé
automatiquement, et « Vider » garde la valeur précédente dans un second
réglage, récupérable par le même bouton. Un vrai historique demanderait une
structure de données, une interface de consultation et une politique de purge,
pour un besoin qui n'existe que si l'on vide par accident.

## Confidentialité réelle entre utilisateurs

Chacun écrit désormais sur son propre document `User`, et le cœur empêche
d'écrire chez autrui. Mais Foundry envoie les documents `User` à tous les
clients : une note reste lisible en console par un curieux, celle du MJ comme
celle d'un joueur.

Rendre ça étanche demanderait un journal par utilisateur, en propriétaire pour
lui et « aucun droit » par défaut, puisque Foundry ne transmet pas au client
les documents qu'on n'a pas le droit de voir. Le prix serait un document de
plus dans la barre latérale de chacun, et le MJ verrait tout de toute façon.
Écarté tant que personne n'écrit de secret dans ses notes de partie.

## Autres pistes non retenues

- **Éditeur ProseMirror** : écarté au profit d'une simple zone
  `contenteditable`. Il apporte une barre d'outils, un cycle de sauvegarde et
  une liaison à un document, trois choses dont ce panneau n'a que faire.
- **Vidage automatique après export** : c'est exactement le piège à éviter.
  L'export ne touche pas au tampon, le vidage reste un geste explicite.
- **Une note commune à la table** : un tampon partagé où tout le monde écrit,
  en plus de la note personnelle. Demanderait un réglage de monde, donc un
  second chemin de stockage et un choix à faire à chaque ouverture.
