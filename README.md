# Rapport de stage · IFMBP

Générateur de rapports de stage pour les stagiaires de l'IFMBP (Instituts de Formation aux Métiers de la Boulangerie et la Pâtisserie, Casablanca). Questionnaire guidé conforme au canevas officiel (FOR-PSR04), recherche automatique ou locale des informations de l'entreprise d'accueil, aperçu A4 et export PDF par impression.

## Lancer l'application

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:####.

## Android APK

L'application est aussi préparée pour Android avec Capacitor. Elle reste locale : pas de compte, pas de backend, pas de serveur à vous.

```bash
npm install
npm run cap:sync
npm run android:apk
```

L'APK de debug est généré ici :

```txt
android/app/build/outputs/apk/debug/app-debug.apk
```

Pour une build release signée ou un `.aab`, voir [docs/ANDROID_RELEASE.md](./docs/ANDROID_RELEASE.md).

Prérequis Android :

- JDK 21 recommandé. Si plusieurs Java sont installés, lancer par exemple `JAVA_HOME=/chemin/vers/jdk-21 npm run android:apk`.
- Android SDK installé. Android Studio crée normalement `android/local.properties`; sinon créer ce fichier local avec `sdk.dir=/chemin/vers/Android/Sdk`.
- Ne pas utiliser `sudo npm` pour initialiser ou installer les dépendances.

Avant une release publique, changer `appId` dans `capacitor.config.ts` pour un identifiant qui vous appartient, par exemple `io.github.votrecompte.rapportstage`.

## État du projet

**Phase 1 : frontend complet avec IA optionnelle.**

- Wizard en 12 étapes (couverture → conclusion) avec sauvegarde locale automatique, sans compte.
- Recherche d'entreprise via Gemini si une clé API est configurée, avec fallback local (`src/lib/ai-stub.ts`) sans clé.
- Génération des paragraphes via Gemini si une clé API est configurée, avec rédaction locale simple sans clé.
- Aperçu A4 fidèle au canevas : couverture bilingue FR/arabe, logos, sommaire, sections numérotées.
- Export/import de sauvegarde JSON depuis les paramètres.
- Un rapport de démonstration pré-rempli est créé au premier lancement.

## Confidentialité

- Aucun compte utilisateur.
- Aucun backend.
- Aucun analytics configuré.
- Les rapports et la clé API sont enregistrés localement sur l'appareil.
- Sans clé API, l'application utilise les fonctions locales.
- Avec une clé API Gemini, seuls les textes envoyés à la génération/recherche partent vers Google Gemini.

Voir aussi [PRIVACY.md](./PRIVACY.md).

## Architecture

Voir [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/ANDROID_RELEASE.md](./docs/ANDROID_RELEASE.md) et l'ADR [0001-local-first-byok-capacitor](./docs/adr/0001-local-first-byok-capacitor.md).

## Licence

MIT. Voir [LICENSE](./LICENSE).

## Prochaines phases

1. Amélioration du moteur local de rédaction sans IA.
2. Export PDF natif plus contrôlé que l'impression navigateur.
3. Publication d'une release Android signée avec icônes définitives.
