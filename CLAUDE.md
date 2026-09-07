# Personal Foundry Toolbox

Module fourre-tout perso pour Foundry VTT v13. Chaque fois qu'un module tiers
rend un service utile, on en réimplémente le strict nécessaire ici plutôt que
de l'installer. Volontairement plus maigre que l'original.

**Pas de build, pas de dépendances.** Le dossier Foundry EST le dépôt : on
édite les `.mjs` directement, ils sont chargés tels quels. Aucun test, aucun
linter : on vérifie en rechargeant le monde (F5) et en lisant la console.

## Inventaire

À lire AVANT d'ouvrir un fichier : chaque script est autonome, aucun n'importe
un autre (seul `generators.mjs` importe son propre dossier `generators/`).
Une seule fonctionnalité par fichier, donc un seul fichier à ouvrir.

| Script | Ce qu'il fait | Accès | Stockage |
| --- | --- | --- | --- |
| `session-notes.mjs` | Bloc-notes de séance, zone éditable riche, sauvegarde au fil de la frappe, export vers un journal daté | Touche `N`, outil de scène | flag `User.sessionNotes` (+ `Backup`) |
| `token-notes.mjs` | Notes de MJ sur un token, panneau au survol, édition sur place. Deux notes : « Fiche » (acteur) et « Ce token » (TokenDocument) | Survol d'un token, MJ seul | flags de monde sur l'acteur / le token |
| `map-browser.mjs` | Recherche de battlemaps sur Map Atlas, création de scène déléguée à Scene Express | Touche `M`, outil de scène | rien |
| `generators.mjs` | Fenêtre unique de générateurs d'impro (ambiance, noms, menu de taverne) | `Maj+G`, outil de scène | rien |
| `shared-timer.mjs` | Minuteur partagé synchronisé sur `game.time.serverTime`, actions joueur relayées au MJ par socket | Outil de scène, widget flottant | réglages monde (état) + client (position) |
| `nimble-calc.mjs` | Calculateur de budget de rencontre PF2e vers Nimble | Outil de scène (MJ), `game.pf2eNimbleCalc.open()` | rien |
| `reroll.mjs` | « Relancer le jet » dans le menu contextuel du chat : clone le message, ré-évalue les dés, grise l'ancien | Clic droit sur une carte de chat | rien |
| `torch-button.mjs` | Bouton flamme du HUD de token : torche ou lumière blanche, clic droit pour éteindre | HUD de token | flag `torch` sur le token |
| `elevation-stepper.mjs` | Deux boutons +/- d'élévation dans le HUD, `Maj` pour cinq cases | HUD de token | rien |
| `drop-actor-folder.mjs` | Dépose un dossier d'acteurs sur la scène en bloc de tokens | Glisser-déposer | réglages (sous-dossiers, seuil) |
| `escape-active-window.mjs` | `Échap` ne ferme que la fenêtre du dessus au lieu de tout le bureau | Touche `Échap` | réglage client |
| `tool-shortcut.mjs` | Touches `1`-`9` : active le N-ième groupe de contrôles VISIBLE | Touches `1`-`9` | rien |
| `hide-npc-names-nimble.mjs` | Applique Hide NPC Names au DOM des cartes de chat Nimble, qu'il ne touche pas | automatique | rien |
| `no-token-animation.mjs` | Coupe l'animation de déplacement, à l'affichage (`Token#_onUpdate`) donc par navigateur | automatique | réglage client |
| `note-icon-background.mjs` | Masque le carré sombre derrière les marqueurs de carte (PIXI, pas du DOM) | automatique | réglage client |
| `auto-unpause.mjs` | Lève la pause au chargement du monde (MJ seul) | automatique | rien |
| `default-deletion-dialog-to-yes.mjs` | Met le focus sur « Oui » dans les dialogues de suppression | automatique | rien |
| `hide-player-navigation.mjs` | Pose `.toolbox-player` sur le `<body>` pour les tweaks CSS joueur | automatique | rien |

Feuilles de style sans script, purement cosmétiques :
`toolbox-compact-sidebar.css` (barre latérale compacte, portable tous
systèmes), `chat-solid-background.css` (fond uni de l'onglet Chat en v13),
`hide-token-hud-icons.css` (boutons du HUD dont on ne se sert pas),
`hide-player-navigation.css`, `nimble-sheet-size.css` et
`nimble-speed-height-fix.css` (rustines de la fiche Nimble).

## Où va quoi

- Une fonctionnalité = `scripts/<sujet>.mjs` + optionnellement `styles/<sujet>.css`,
  tous deux déclarés dans `module.json` (`esmodules` / `styles`).
- Les idées discutées puis écartées vont dans `TODO-<sujet>.md` à la racine
  (`TODO-session-notes.md`, `TODO-token-notes.md`, `TODO-generators.md`).
  À lire avant de proposer une évolution : la réponse y est souvent déjà, avec
  la raison du refus.
- Clé d'aiguillage : ici on remplace un module TIERS. Une amélioration du
  système Nimble qui ne remplace aucun module va dans `nimble-qol`.

## Conventions (recopier `scripts/torch-button.mjs` ou `token-notes.mjs`)

- En-tête de commentaire en bloc qui explique le POURQUOI, pas le quoi, et se
  termine par le rappel de la ligne à ajouter dans `module.json`.
- JSDoc sur chaque fonction.
- `const MODULE_ID = "personal-foundry-toolbox";`
- Helper `const t = (key, data) => game.i18n.format(\`PERSONAL_TOOLBOX.<Sujet>.\${key}\`, data ?? {});`
  Clés miroir dans `lang/fr.json` ET `lang/en.json`.
- CSS préfixé `pt-` (les fichiers les plus anciens utilisent `pft-` ou `ptg-`).
  Le wrapping `@layer modules { @layer toolbox-<sujet> { ... } }` ne sert qu'à
  passer devant le CSS du cœur : inutile pour le contenu d'une fenêtre à soi.
- Traductions : clés PLATES dans `lang/*.json`, pas d'objets imbriqués.
  `"PERSONAL_TOOLBOX.<Sujet>.<Cle>": "..."`.
- Rédaction : jamais d'em dash, jamais de flèche unicode (`->` en ASCII).

## Rappels Foundry v13 vérifiés

- Touches déjà prises par le module : `M` (map-browser), `Maj+G` (generators),
  `Échap` (escape-active-window), `1`-`9` (tool-shortcut), `N` (session-notes).
  Le cœur v13 occupe A, C, D, E, F, Q, R, S, T, U, V, W, X, Z + chiffres.
  Libres et utilisables : B, H, I, J, K, L, O, P, Y.
- `KeyboardManager#hasFocus` coupe TOUS les keybindings quand un
  `INPUT`/`TEXTAREA`/contenteditable a le focus. Conséquence : aucun faux
  positif quand on tape dans le chat, mais `Échap` ne passe pas non plus,
  donc une fenêtre à champ texte doit gérer `Échap` par un `keydown` maison.
- `escape-active-window.mjs` ne ferme que les Application V1/V2 enregistrées,
  pas un panneau DOM brut.
- Réglage `scope: "world"` = stocké dans la base du monde, donc cloisonné par
  monde et suit d'une machine à l'autre, mais écrivable par le seul MJ.
  `scope: "client"` = localStorage, perdu au vidage du cache. Toute écriture de
  réglage monde est diffusée à tous les clients : anti-rebond obligatoire sur
  une sauvegarde au fil de la frappe.
- Pour du PAR UTILISATEUR, écrire un flag sur `game.user` : le cœur autorise
  chacun à modifier son propre document (`user.isGM || user.id === doc.id`, et
  les flags ne sont pas dans les champs restreints). C'est ce que fait
  `session-notes.mjs`.
- Ni un réglage de monde ni un flag d'utilisateur ne sont confidentiels : les
  deux sont envoyés à tous les clients et se lisent en console. Seul un
  document à droits (journal, acteur) n'est pas transmis à qui ne peut le voir.
- `JOURNAL_CREATE` a pour rôle par défaut TRUSTED : un joueur ordinaire ne peut
  pas créer de journal. Tester `game.user.can("JOURNAL_CREATE")` avant d'offrir
  un bouton d'export, et prévoir le cas où la création d'un dossier échoue.
- Deux façons d'éditer du texte dans le module, à ne pas confondre :
  `token-notes.mjs` reste en texte brut avec sa grammaire maison (puces,
  `[ ]`/`[x]` cliquables, gras, italique, @UUID) ; `session-notes.mjs` est une
  zone `contenteditable` qui stocke directement du HTML.
- Zone `contenteditable` : appeler une fois
  `document.execCommand("styleWithCSS", false, false)` pour obtenir des balises
  (`<b>`, `<strike>`) au lieu de styles en ligne, puis les normaliser vers
  `<strong>`/`<s>` avant de verser dans un journal, sinon l'éditeur de la page
  les jette à la première ouverture. Ctrl+B et Ctrl+I sont déjà natifs.
- `document.execCommand("formatBlock")` n'échange pas la balise d'un bloc déjà
  formaté : il imbrique le nouveau dans l'ancien, et deux tailles en `em` se
  multiplient au lieu de se remplacer. Toujours repasser par `<p>` avant de
  poser un autre titre. Pour défaire une citation, c'est `outdent`, la seule
  commande qui retire le `<blockquote>` dont Chrome se sert pour l'indentation.
- Rien ne défait la mise en forme du tout premier bloc d'un `contenteditable` :
  Retour arrière n'y fond rien, faute de quoi que ce soit en amont. Un champ qui
  laisse poser un titre doit donc gérer cette touche lui-même, et s'amorcer sur
  un vrai bloc (`<p><br></p>`) plutôt que sur du texte nu.
- Toujours écrire dans une zone de saisie par `document.execCommand`, jamais en
  réaffectant `value`/`innerHTML` : la réécriture directe vide la pile
  d'annulation du navigateur et Ctrl+Z ne rend plus rien.
- Le CSS du cœur aplatit les listes : une `<ul>` dans une fenêtre de module
  doit se redonner `list-style` et `padding-left` pour afficher ses puces.
- Fenêtre ApplicationV2 : recopier `nimble-calc.mjs` (DEFAULT_OPTIONS,
  `_renderHTML` / `_replaceHTML` / `_onRender`) et l'export vers un journal de
  `generators.mjs`.

## Anatomie de `session-notes.mjs`

1198 lignes, un seul fichier, dans cet ordre :

1. **Constantes** (l. 71-206) : flags, anciens réglages de monde gardés pour la
   seule reprise au démarrage, `SAVE_DELAY` (anti-rebond de 800 ms),
   `DAY_START_HOUR` (une séance finie à 00h30 est datée de la veille),
   `SHORTCUTS` (Ctrl+Maj+X barré, Ctrl+Maj+7/8 listes, Ctrl+Maj+9 citation),
   `BLOCK_PREFIXES` (auto-format markdown à la frappe), `TAG_REPLACEMENTS`
   (normalisation HTML), les deux classes du repli, les motifs `MD_*` du
   lecteur de markdown.
2. **Lecture / écriture** (`readBuffer`, `readBackup`, `flushSave`,
   `scheduleSave`) : le tampon vit en flag sur le `User` courant.
3. **Conversion** (`inlineMarkdown`, `markdownToHTML`, `normalizeHTML`) et
   **datation** (`sessionDate`, `timeLabel`, `journalName`) pour l'export.
   `markdownToHTML` sert au collage depuis Obsidian comme à la reprise des
   notes d'avant l'édition riche, qui étaient du texte nu.
4. **Manipulation du curseur** (`caretToEnd`, `currentBlock`, `currentLine`,
   `caretAtEndOf`, `caretAtStartOf`, `headingLevel`, `selectContents`,
   `setBlockFormat`, `autoFormatBlock`) : tout passe par `Selection`/`Range` et
   `document.execCommand`, jamais par `innerHTML`.
5. **Repli des titres** (l. 708-789) : `foldedSection` (jusqu'au prochain titre
   de niveau égal ou supérieur, la règle d'Obsidian), `toggleFold`, `applyFolds`,
   `flattenHeadings`. Deux classes posées dans le HTML sauvegardé, donc un titre
   replié le reste ; `applyFolds` recalcule tout à l'ouverture, ce qui garantit
   qu'aucun bloc ne reste caché sans plus rien pour le rouvrir.
6. **`SessionNotesApp`** (l. 794-1099), ApplicationV2 : rendu, écouteurs clavier
   et souris, collage, export vers journal, vidage avec rattrapage.
7. **Câblage** (l. 1101-1198) : `toggleNotes`, réglages et raccourci `N` en
   `init`, migration des anciennes notes de monde en `ready`, `updateUser` pour
   recharger si la note change ailleurs, outil dans les contrôles de scène.

Rien n'est jamais vidé automatiquement : l'export recopie sans toucher au
tampon, le vidage est un geste séparé, confirmé, et rattrapable une fois
(`BACKUP_FLAG`).
