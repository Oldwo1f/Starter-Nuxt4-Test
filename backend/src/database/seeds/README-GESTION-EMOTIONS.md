# Seed pour la formation "Gestion des émotions"

Ce dossier contient les scripts pour créer la formation "Gestion des émotions" dans la base de données.

## 📋 Prérequis

1. **Vidéos uploadées** : Les vidéos doivent être présentes dans le dossier :
   ```
   backend/uploads/academy/gestion des emotions/
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
npm run seed:gestion-emotions
```

Ce script va :
- ✅ Créer la formation "Gestion des émotions"
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

- **Introduction** (2 vidéos)
- **Module 1 : Comprendre les émotions** (8 vidéos)
- **Module 2 : Réguler les émotions** (9 vidéos)
- **Module 3 : Conséquences des émotions** (2 vidéos)
- **Module 4 : Mindset et optimisme** (4 vidéos)
- **Module 5 : La roue de l'équilibre** (3 vidéos)
- **Module 6 : Conclusion** (1 vidéo)

**Total : 29 vidéos**

## 🔧 Dépannage

### La formation existe déjà

Si vous voyez le message "La formation existe déjà", vous avez deux options :

1. **Supprimer depuis l'interface admin** : Allez dans l'interface d'administration et supprimez la formation
2. **Supprimer depuis la base de données** :
   ```sql
   DELETE FROM videos WHERE "moduleId" IN (SELECT id FROM academy_modules WHERE "courseId" = (SELECT id FROM courses WHERE title = 'Gestion des émotions'));
   DELETE FROM academy_modules WHERE "courseId" = (SELECT id FROM courses WHERE title = 'Gestion des émotions');
   DELETE FROM courses WHERE title = 'Gestion des émotions';
   ```

### Les durées ne sont pas extraites

Si les durées ne sont pas extraites automatiquement :

1. Vérifiez que ffmpeg est installé : `which ffmpeg` ou `which ffprobe`
2. Si ce n'est pas le cas, installez-le : `sudo apt-get install ffmpeg`
3. Relancez le script de mise à jour : `npm run seed:update-durations`

### Les fichiers vidéos ne sont pas trouvés

Vérifiez que les vidéos sont bien dans le bon dossier :
```bash
ls -la backend/uploads/academy/gestion\ des\ emotions/
```

Les chemins dans la base de données sont relatifs : `academy/gestion des emotions/module X/fichier.mp4`

## 📝 Notes

- Le script est **standalone** : il ne touche pas aux autres données (utilisateurs, autres formations, etc.)
- Les vidéos doivent être au format `.mp4`
- Les noms de fichiers doivent correspondre exactement à ceux définis dans le script
- Les durées sont stockées en secondes dans la base de données
