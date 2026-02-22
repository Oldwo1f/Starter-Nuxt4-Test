# 📋 Script de mise à jour des durées réelles des vidéos

Ce script récupère les durées réelles des vidéos depuis leurs sources (YouTube ou fichiers locaux) et met à jour la base de données.

## 🎯 Fonctionnalités

1. **Vidéos YouTube** : Récupère la durée via l'API YouTube Data v3
2. **Fichiers locaux** : Extrait la durée avec ffprobe/ffmpeg
3. **Mise à jour intelligente** : Ne met à jour que si la durée a changé

## 📋 Prérequis

### 1. Clé API YouTube (pour les vidéos YouTube)

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un projet ou sélectionnez-en un
3. Activez l'API "YouTube Data API v3"
4. Créez une clé API
5. Ajoutez la clé dans votre fichier `.env` :

```bash
YOUTUBE_API_KEY=votre_cle_api_ici
```

**Note** : L'API YouTube est gratuite avec un quota de 10,000 unités/jour. Chaque requête de durée = 1 unité.

### 2. ffprobe/ffmpeg (pour les fichiers locaux)

Pour extraire la durée des fichiers vidéo locaux, installez ffmpeg dans le conteneur :

```bash
docker exec -it nunaheritage-backend apk add ffmpeg
```

Ou pour Debian/Ubuntu :
```bash
docker exec -it nunaheritage-backend apt-get update && apt-get install -y ffmpeg
```

## 🚀 Utilisation

```bash
cd /var/www/nunaheritage
./update-video-durations-real.sh
```

## 📊 Ce que fait le script

1. **Se connecte à la base de données**
2. **Récupère toutes les vidéos** de la table `videos`
3. **Pour chaque vidéo** :
   - Si `videoUrl` (YouTube) :
     - Extrait l'ID de la vidéo
     - Appelle l'API YouTube pour récupérer la durée
   - Si `videoFile` (fichier local) :
     - Trouve le fichier sur le système
     - Extrait la durée avec ffprobe/ffmpeg
   - Si aucune source : ignore la vidéo
4. **Met à jour la base de données** uniquement si :
   - Une durée a été récupérée
   - La durée a changé par rapport à celle en DB

## ⚠️ Notes importantes

- **YouTube** : Nécessite une clé API. Sans clé, les vidéos YouTube seront ignorées.
- **Fichiers locaux** : Nécessite ffprobe/ffmpeg. Sans ces outils, les fichiers locaux seront ignorés.
- **Mise à jour sélective** : Le script ne modifie que les durées qui ont changé.
- **Pas de perte de données** : Si une durée ne peut pas être récupérée, la valeur actuelle est conservée.

## 🔍 Exemple de sortie

```
🔄 Mise à jour des durées des vidéos depuis les sources réelles...

✓ Connexion à la base de données établie

📹 62 vidéo(s) trouvée(s)

🎬 Vidéo ID 9: Introduction
  📺 URL YouTube détectée (ID: abc123)
  ✅ Durée récupérée: 4m35s
  ✅ Durée mise à jour: non définie → 4m35s

🎬 Vidéo ID 10: Définition
  📁 Fichier local trouvé: /app/uploads/academy/gestion des emotions/introduction/M0 B_ Definition VF.mp4
  ✅ Durée extraite: 5m20s
  ✅ Durée mise à jour: 5m20s → 5m20s

...

📊 RÉSUMÉ DE LA MISE À JOUR
   ✅ Vidéos mises à jour: 45
   ⏭ Vidéos ignorées (déjà à jour ou durée non récupérée): 12
   ⚠ Vidéos sans source: 3
   ❌ Erreurs: 2
```

## 🛠️ Dépannage

### Erreur "ffprobe/ffmpeg non disponible"

Installez ffmpeg dans le conteneur (voir section Prérequis).

### Erreur "YOUTUBE_API_KEY non configurée"

Ajoutez la clé API dans le fichier `.env` (voir section Prérequis).

### Les durées YouTube ne sont pas récupérées

- Vérifiez que la clé API est correcte
- Vérifiez que l'API YouTube Data v3 est activée
- Vérifiez le quota de l'API (10,000 unités/jour)

### Les durées des fichiers locaux ne sont pas récupérées

- Vérifiez que ffprobe/ffmpeg est installé
- Vérifiez que les fichiers existent aux chemins indiqués
- Vérifiez les permissions d'accès aux fichiers
