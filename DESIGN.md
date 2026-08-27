# DESIGN.md

## Concept
« Vercel × Boulangerie » : rigueur Vercel (Geist, bordures 1px, panneaux sobres, patterns standards) réchauffée par les tokens artisanaux de medinacopatisserie.com (crème, or antique, charbon chaud). L'interface sert la tâche ; la chaleur se voit dans les détails, pas dans la décoration.

## Theme
Clair par défaut. Un mode sombre reste disponible dans les paramètres pour le confort, mais le premier lancement doit ouvrir sur une interface claire. Scène : stagiaire remplissant son rapport en salle claire ou le soir chez lui ; l'aperçu A4 doit évoquer une feuille blanche posée sur le plan de travail.

## Color (OKLCH, stratégie Restrained)
| Token | Valeur | Usage |
|---|---|---|
| `cream` | oklch(0.977 0.004 85) | fond de page |
| `paper` | oklch(0.995 0.002 85) | panneaux, champs |
| `line` | oklch(0.906 0.008 80) | bordures 1px |
| `line-strong` | oklch(0.83 0.012 80) | bordures survolées / séparateurs forts |
| `ink` | oklch(0.35 0.02 70) | texte principal (charbon chaud #3d3832) |
| `muted` | oklch(0.52 0.018 70) | texte secondaire |
| `faint` | oklch(0.66 0.014 75) | placeholders, métadonnées |
| `gold` | oklch(0.8 0.06 85) | or antique (#cab99c), accents ≤ 10% |
| `gold-deep` | oklch(0.48 0.07 78) | or lisible sur clair (#6f5c42), eyebrows, liens |
| `gold-soft` | oklch(0.945 0.022 88) | fonds de badge « à vérifier », sélection douce |
| `danger` | oklch(0.55 0.19 27) | erreurs, suppression |

Jamais #000 ni #fff purs. Le primaire des boutons est `ink` (bouton charbon façon Vercel) ; l'or marque la sélection, les états actifs, les badges, les eyebrows.

## Typography
- UI : **Geist Sans** (`@fontsource/geist-sans`). Une seule famille porte tout l'interface.
- Méta/données : **Geist Mono** pour références, dates, numéros de steps (01→12).
- Display : **Georgia** stack, réservé au hero de l'accueil et à la couverture A4. Interdit dans les labels, boutons, données.
- Échelle fixe en rem, ratio ~1.2 : 12 / 13 / 14 (base UI) / 16 / 20 / 24 / 30.
- Signature : eyebrow en micro-majuscules or espacées (`text-[11px] uppercase tracking-[0.22em] text-gold-deep`) au-dessus des titres de section.
- Prose limitée à 70ch max.

## Layout
- AppShell : top bar fixe (logo + nom app + nav), contenu centré.
- Accueil : colonne max-w-3xl ; liste de brouillons en lignes pleine largeur, jamais de grille de cards identiques.
- Workspace : sidebar gauche 260px (stepper vertical numéroté), zone principale avec segmented control Édition/Aperçu ; formulaires max-w-xl.
- Rythme : padding varié selon densité (formulaires aérés, listes compactes).

## Components
Chaque contrôle interactif a : default, hover, focus-visible (ring or), active, disabled, loading, error. Champs : fond paper, bordure line, radius 8px. Boutons : primaire ink/cream texte ; secondaire bordure line ; ghost transparent. Badges pilule gold-soft/gold-deep. Skeletons (pulse) pour tout chargement, jamais de spinners centraux. Empty states qui enseignent (prochaine action explicite).

## Motion
150–250 ms, ease-out. Uniquement pour les états : survol, focus, apparition de résultats, changement de step. Aucune orchestration au chargement de page.

## Bans appliqués
Pas de side-stripe borders, pas de gradient text, pas de glassmorphisme, pas de grilles de cards identiques, pas de modal là où un état inline suffit, pas de display font dans l'UI courante, pas d'em dashes dans la copie.
