# Personal Foundry Toolbox

Module fourre-tout perso pour Foundry VTT v13. Chaque fois qu'un module tiers
rend un service utile, on en reimplemente le strict necessaire ici plutot que
de l'installer. Volontairement plus maigre que l'original.

**Pas de build, pas de dependances.** Le dossier Foundry EST le depot : on
edite les `.mjs` directement, ils sont charges tels quels.

## Ou va quoi

- Une fonctionnalite = `scripts/<sujet>.mjs` + optionnellement `styles/<sujet>.css`,
  tous deux declares dans `module.json` (`esmodules` / `styles`).
- Les idees discutees puis ecartees vont dans `TODO-<sujet>.md` a la racine.
- Cle d'aiguillage : ici on remplace un module TIERS. Une amelioration du
  systeme Nimble qui ne remplace aucun module va dans `nimble-qol`.

## Conventions (recopier `scripts/torch-button.mjs` ou `token-notes.mjs`)

- En-tete de commentaire en bloc qui explique le POURQUOI, pas le quoi, et se
  termine par le rappel de la ligne a ajouter dans `module.json`.
- JSDoc sur chaque fonction.
- `const MODULE_ID = "personal-foundry-toolbox";`
- Helper `const t = (key, data) => game.i18n.format(\`PERSONAL_TOOLBOX.<Sujet>.\${key}\`, data ?? {});`
  Cles miroir dans `lang/fr.json` ET `lang/en.json`.
- CSS prefixe `pt-` (les fichiers les plus anciens utilisent `pft-` ou `ptg-`).
  Le wrapping `@layer modules { @layer toolbox-<sujet> { ... } }` ne sert qu'a
  passer devant le CSS du coeur : inutile pour le contenu d'une fenetre a soi.
- Traductions : cles PLATES dans `lang/*.json`, pas d'objets imbriques.
  `"PERSONAL_TOOLBOX.<Sujet>.<Cle>": "..."`.
- Redaction : jamais d'em dash, jamais de fleche unicode (`->` en ASCII).

## Rappels Foundry v13 verifies

- Touches deja prises par le module : `M` (map-browser), `Maj+G` (generators),
  `Echap` (escape-active-window), `1`-`9` (tool-shortcut).
  Le coeur v13 occupe A, C, D, E, F, Q, R, S, T, U, V, W, X, Z + chiffres.
  `N` (session-notes) est pris depuis le 2026-09-02.
  Libres et utilisables : B, H, I, J, K, L, O, P, Y.
- `KeyboardManager#hasFocus` coupe TOUS les keybindings quand un
  `INPUT`/`TEXTAREA`/contenteditable a le focus. Consequence : aucun faux
  positif quand on tape dans le chat, mais `Echap` ne passe pas non plus,
  donc une fenetre a champ texte doit gerer `Echap` par un `keydown` maison.
- `escape-active-window.mjs` ne ferme que les Application V1/V2 enregistrees,
  pas un panneau DOM brut.
- Reglage `scope: "world"` = stocke dans la base du monde, donc cloisonne par
  monde et suit d'une machine a l'autre, mais ecrivable par le seul MJ.
  `scope: "client"` = localStorage, perdu au vidage du cache. Toute ecriture de
  reglage monde est diffusee a tous les clients : anti-rebond obligatoire sur
  une sauvegarde au fil de la frappe.
- Pour du PAR UTILISATEUR, ecrire un flag sur `game.user` : le coeur autorise
  chacun a modifier son propre document (`user.isGM || user.id === doc.id`, et
  les flags ne sont pas dans les champs restreints). C'est ce que fait
  `session-notes.mjs`.
- Ni un reglage de monde ni un flag d'utilisateur ne sont confidentiels : les
  deux sont envoyes a tous les clients et se lisent en console. Seul un
  document a droits (journal, acteur) n'est pas transmis a qui ne peut le voir.
- `JOURNAL_CREATE` a pour role par defaut TRUSTED : un joueur ordinaire ne peut
  pas creer de journal. Tester `game.user.can("JOURNAL_CREATE")` avant d'offrir
  un bouton d'export, et prevoir le cas ou la creation d'un dossier echoue.
- Deux facons d'editer du texte dans le module, a ne pas confondre :
  `token-notes.mjs` reste en texte brut avec sa grammaire maison (puces,
  `[ ]`/`[x]` cliquables, gras, italique, @UUID) ; `session-notes.mjs` est une
  zone `contenteditable` qui stocke directement du HTML.
- Zone `contenteditable` : appeler une fois
  `document.execCommand("styleWithCSS", false, false)` pour obtenir des balises
  (`<b>`, `<strike>`) au lieu de styles en ligne, puis les normaliser vers
  `<strong>`/`<s>` avant de verser dans un journal, sinon l'editeur de la page
  les jette a la premiere ouverture. Ctrl+B et Ctrl+I sont deja natifs.
- Toujours ecrire dans une zone de saisie par `document.execCommand`, jamais en
  reaffectant `value`/`innerHTML` : la reecriture directe vide la pile
  d'annulation du navigateur et Ctrl+Z ne rend plus rien.
- Le CSS du coeur aplatit les listes : une `<ul>` dans une fenetre de module
  doit se redonner `list-style` et `padding-left` pour afficher ses puces.
- Fenetre ApplicationV2 : recopier `nimble-calc.mjs` (DEFAULT_OPTIONS,
  `_renderHTML` / `_replaceHTML` / `_onRender`) et l'export vers un journal de
  `generators.mjs`.
