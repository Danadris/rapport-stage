# Confidentialite

Rapport de stage est une application locale-first.

## Donnees stockees localement

Les rapports, brouillons, images importees, preferences d'affichage et cle API optionnelle sont stockes sur l'appareil de l'utilisateur.

Dans la version web, le stockage utilise le navigateur. Dans la version Android, l'application tourne dans une WebView Capacitor et utilise le stockage local de l'application.

## Backend

L'application n'a pas de backend, pas de compte utilisateur et pas de base de donnees distante.

## Intelligence artificielle

L'application fonctionne sans cle API. Dans ce mode, elle utilise des fonctions locales simples.

Si l'utilisateur configure une cle API Gemini, les textes utilises pour la recherche d'entreprise ou la generation de paragraphes sont envoyes a Google Gemini avec la cle de l'utilisateur. Ces appels ne passent pas par un serveur appartenant au projet.

## Android

L'APK demande la permission Internet pour permettre les appels optionnels a Gemini. L'application ne configure pas d'analytics. La sauvegarde Android automatique est desactivee par defaut dans le manifeste.

## Limites

Comme les donnees restent locales, elles peuvent etre perdues si l'utilisateur efface les donnees du navigateur ou de l'application. Utilisez l'export/import de sauvegarde JSON pour conserver une copie hors de l'application.
