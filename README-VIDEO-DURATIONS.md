# Scripts de gestion des durées des vidéos

Ce guide explique comment récupérer et mettre à jour les durées des vidéos pour les 3 formations :
- **Gestion des émotions**
- **Charisme**
- **Tressage de coquillage**

## 📋 Prérequis

1. **Docker/Podman** : Le conteneur `nunaheritage-backend` doit être en cours d'exécution
2. **ffprobe ou ffmpeg** : Pour extraire les durées depuis les fichiers vidéo (requis uniquement pour la mise à jour)
3. **Variables d'environnement** : Le fichier `.env` doit contenir les paramètres de connexion à la base de données

## 🔍 Script 1 : Récupérer les durées depuis la DB

Ce script permet de consulter les durées actuellement stockées dans la base de données.

### Utilisation

```bash
cd /var/www/nunaheritage
./get-video-durations.sh
```

### Ce que fait le script

1. Se connecte à la base de données
2. Récupère toutes les vidéos des 3 formations
3. Affiche un résumé avec :
   - Le nombre total de vidéos par formation
   - Le nombre de vidéos avec/sans durée
   - La durée totale de chaque formation
   - La liste des vidéos sans durée
4. Génère deux rapports :
   - `video-durations-report.json` : Rapport détaillé en JSON
   - `video-durations-report.csv` : Rapport en CSV pour Excel

### Exemple de sortie

```
📚 Formation: Gestion des émotions
────────────────────────────────────────────────────────────
   Total vidéos: 25
   Avec durée: 20
   Sans durée: 5
   Durée totale: 2h15m30s

   ⚠ Vidéos sans durée:
      - Introduction (ID: 1)
      - Définition (ID: 2)
      ...
```

## 🔄 Script 2 : Mettre à jour les durées depuis les fichiers

Ce script extrait les durées depuis les fichiers vidéo et met à jour la base de données.

### Utilisation

```bash
cd /var/www/nunaheritage
./update-video-durations.sh
```

### Ce que fait le script

1. Vérifie que ffprobe/ffmpeg est disponible
2. Pour chaque vidéo des 3 formations :
   - Localise le fichier vidéo sur le système de fichiers
   - Extrait la durée avec ffprobe/ffmpeg
   - Met à jour la durée dans la base de données
3. Affiche un résumé des mises à jour

### Notes importantes

- ⚠️ **Les vidéos YouTube** : Les vidéos avec uniquement une URL YouTube (sans fichier local) ne peuvent pas être mises à jour automatiquement. Leur durée existante est conservée.
- ⚠️ **Fichiers introuvables** : Si un fichier vidéo n'est pas trouvé, un avertissement est affiché mais le script continue.
- ⚠️ **Confirmation requise** : Le script demande une confirmation avant de modifier la base de données.

### Installation de ffmpeg dans le conteneur

Si ffmpeg n'est pas installé dans le conteneur backend :

```bash
# Pour Alpine Linux (image par défaut)
docker exec -it nunaheritage-backend apk add ffmpeg

# Pour Debian/Ubuntu
docker exec -it nunaheritage-backend apt-get update && apt-get install -y ffmpeg
```

## 📊 Structure des données

### Table `videos`

La colonne `duration` stocke la durée en **secondes** (type `INTEGER`, nullable).

### Format des chemins

Les vidéos sont stockées avec des chemins relatifs comme :
- `/uploads/academy/gestion des emotions/introduction/M0 A_ INTRO.mp4`
- `/uploads/academy/charisme/module 1/#1-1 Définition VF.mp4`
- `/uploads/academy/tressage coquillage/tressage_bague.mp4`

Dans le conteneur Docker, ces chemins correspondent à :
- `/app/uploads/academy/...`

## 🔧 Dépannage

### Le conteneur n'est pas en cours d'exécution

```bash
docker-compose up -d backend
```

### Erreur de connexion à la base de données

Vérifiez que le fichier `.env` contient les bonnes variables :
```bash
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nunaheritage
```

### Les fichiers vidéo ne sont pas trouvés

Vérifiez que les vidéos sont bien copiées dans le conteneur :
```bash
docker exec nunaheritage-backend ls -la /app/uploads/academy/
```

### ffprobe/ffmpeg non disponible

Installez ffmpeg dans le conteneur (voir section ci-dessus).

## 📝 Exécution manuelle (sans Docker)

Si vous préférez exécuter les scripts directement (sans Docker) :

```bash
cd /var/www/nunaheritage/backend
npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register ../get-video-durations-from-db.ts
npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register ../update-video-durations.ts
```

**Note** : Dans ce cas, assurez-vous que :
- Les variables d'environnement sont correctement configurées
- Les chemins des fichiers vidéo sont accessibles depuis votre machine
- ffprobe/ffmpeg est installé sur votre machine

## 📈 Statistiques

Après exécution, vous pouvez consulter :
- Le rapport JSON pour une analyse détaillée
- Le rapport CSV pour une analyse dans Excel/Google Sheets
- Les logs de la console pour un résumé rapide
