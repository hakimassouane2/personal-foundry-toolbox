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

## Notes par utilisateur

Un seul tampon par monde, partagé entre MJ. Un `{ userId: texte }` réglerait le
cas du co-MJ, au prix d'une indirection permanente pour un usage solo. Le hook
`updateSetting` couvre déjà le cas gênant : deux onglets ouverts ne se volent
pas mutuellement la saisie.

## Autres pistes non retenues

- **Éditeur ProseMirror** : écarté au profit d'une simple zone
  `contenteditable`. Il apporte une barre d'outils, un cycle de sauvegarde et
  une liaison à un document, trois choses dont ce panneau n'a que faire.
- **Vidage automatique après export** : c'est exactement le piège à éviter.
  L'export ne touche pas au tampon, le vidage reste un geste explicite.
- **Notes visibles par les joueurs** : sciemment hors périmètre, tout est MJ.
