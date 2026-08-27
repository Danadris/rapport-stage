# 0001: Local-First BYOK App With Capacitor Android Packaging

**Date**: 2026-08-27  
**Status**: Accepted  
**Deciders**: Project maintainer

---

## Context and Problem Statement

The app helps IFMBP trainees write internship reports. The target users may work from personal laptops, shared PCs or Android phones. The project should be open source, inexpensive to operate and trustworthy: users should be able to inspect the code, keep their own reports local and use their own AI API key if they want AI assistance.

The project does not need accounts, collaboration, payments, server-side AI billing or centralized report storage.

---

## Decision Drivers

- Keep user reports private and local by default.
- Avoid server costs for the maintainer.
- Allow the app to work without AI.
- Let users bring their own Gemini API key.
- Reuse the existing React/Vite codebase for Android.
- Keep the architecture understandable for open-source contributors.

---

## Considered Options

1. Frontend-only web app with browser-local storage.
2. Hosted app with backend, accounts and database.
3. Local-first web app packaged as Android APK with Capacitor.
4. Native Android rewrite.

---

## Decision Outcome

**Chosen Option**: Local-first web app packaged as Android APK with Capacitor, because it preserves the no-backend privacy model while allowing Android distribution without rewriting the application.

The current implementation stores reports and settings in IndexedDB with localStorage fallback/migration, and uses JSON export/import for user-controlled backups.

### Consequences

- **Positive**: No project backend, no maintainer API costs, no central user data, simple open-source distribution.
- **Positive**: Users can run the web app locally or install an APK.
- **Positive**: The app can work without AI and can call Gemini directly with the user's key when configured.
- **Negative**: No sync between devices unless the user exports/imports a backup.
- **Negative**: Browser/WebView storage can be cleared by the user or OS.
- **Risk**: Browser-side API keys are visible to the local runtime, so this is BYOK convenience, not enterprise-grade secret storage.

---

## Pros and Cons of Options

### Frontend-Only Web App With Browser-Local Storage

- **Pros**: Simple, cheap, easy to host or run locally.
- **Cons**: No APK distribution and local browser storage is fragile.

### Hosted App With Backend

- **Pros**: Better sync, backup and centralized release control.
- **Cons**: Requires server operations, privacy policy burden, account/security work and possible AI billing exposure.

### Local-First App With Capacitor APK

- **Pros**: Reuses React/Vite, supports Android, keeps data local and avoids backend costs.
- **Cons**: Android build tooling adds complexity, and WebView storage still needs backup/export.

### Native Android Rewrite

- **Pros**: Stronger native integration and storage control.
- **Cons**: Much slower to build, duplicates the web UI work and raises maintenance cost.
