# Seed pour la formation "Charisme"

Ce dossier contient les scripts pour créer la formation "Charisme" dans la base de données.

## 📋 Prérequis

1. **Vidéos uploadées** : Les vidéos doivent être présentes dans le dossier :
   ```
   backend/uploads/academy/charisme/
   ├── introduction/
   ├── module 1/
   ├── module 2/
   ├── module 3/
   ├── module 4/
   ├── module 5/
   └── module 6/
   ```

2. **ffmpeg (optionnel)** : Pour extraire automatiquement les durées des vidéos :
   ```bash
   sudo apt-get install ffmpeg
   ```
   Si ffmpeg n'est pas installé, les durées seront laissées à `null` et pourront être mises à jour plus tard.

## 🚀 Utilisation

### 1. Créer la formation dans la base de données

Exécutez le script de seed :

```bash
cd backend
npm run seed:charisme
```

Ce script va :
- ✅ Créer la formation "Charisme"
- ✅ Créer tous les modules (Introduction + Modules 1 à 6)
- ✅ Créer toutes les vidéos avec leurs chemins
- ✅ Extraire les durées des vidéos si ffmpeg est disponible

**Note** : Si la formation existe déjà, le script ne fera rien. Pour la recréer, supprimez-la d'abord depuis l'interface admin ou la base de données.

### 2. Mettre à jour les durées des vidéos (optionnel)

Si vous avez installé ffmpeg après avoir créé la formation, ou si vous voulez mettre à jour les durées :

```bash
cd backend
npm run seed:update-durations
```

Ce script va mettre à jour les durées de toutes les vidéos dans la base de données.

## 📁 Structure de la formation

La formation est organisée comme suit :

- **Introduction** (1 vidéo)
- **Module 1 : Comprendre le charisme** (3 vidéos)
- **Module 2 : L'animal totem** (1 vidéo)
- **Module 3 : La roue du charisme** (1 vidéo)
- **Module 4 : Profils de personnalité DISC** (6 vidéos)
- **Module 5 : Compétences relationnelles** (9 vidéos)
- **Module 6 : Développement personnel et leadership** (9 vidéos)

**Total : 30 vidéos**

## 🔧 Dépannage

### La formation existe déjà

Si vous voyez le message "La formation existe déjà", vous avez deux options :

1. **Supprimer depuis l'interface admin** : Allez dans l'interface d'administration et supprimez la formation
2. **Supprimer depuis la base de données** :
   ```sql
   DELETE FROM videos WHERE "moduleId" IN (SELECT id FROM academy_modules WHERE "courseId" = (SELECT id FROM courses WHERE title = 'Charisme'));
   DELETE FROM academy_modules WHERE "courseId" = (SELECT id FROM courses WHERE title = 'Charisme');
   DELETE FROM courses WHERE title = 'Charisme';
   ```

### Les durées ne sont pas extraites

Si les durées ne sont pas extraites automatiquement :

1. Vérifiez que ffmpeg est installé : `which ffmpeg` ou `which ffprobe`
2. Si ce n'est pas le cas, installez-le : `sudo apt-get install ffmpeg`
3. Relancez le script de mise à jour : `npm run seed:update-durations`

### Les fichiers vidéos ne sont pas trouvés

Vérifiez que les vidéos sont bien dans le bon dossier :
```bash
ls -la backend/uploads/academy/charisme/
```

Les chemins dans la base de données sont relatifs : `academy/charisme/module X/fichier.mp4`

## 📝 Notes

- Le script est **standalone** : il ne touche pas aux autres données (utilisateurs, autres formations, etc.)
- Les vidéos doivent être au format `.mp4`
- Les noms de fichiers doivent correspondre exactement à ceux définis dans le script
- Les durées sont stockées en secondes dans la base de données
