# Script de copie des vidéos de formation

Ce script permet de copier les vidéos de formation depuis le dossier `tmp/academy` vers le container Docker backend et d'exécuter automatiquement les seeds correspondants.

## 📋 Prérequis

1. **Docker/Podman** : Le script détecte automatiquement `docker` ou `podman`
2. **Container backend en cours d'exécution** : Le container `nunaheritage-backend` doit être démarré
3. **Dossier tmp/academy** : Les dossiers de formation doivent être dans `/var/www/nunaheritage/tmp/academy/`

## 📁 Structure attendue

```
tmp/academy/
├── charisme/
├── gestion des emotion/  (ou "gestion des emotions")
└── tressage coquillage/
```

## 🚀 Utilisation

### Exécution du script

```bash
cd /var/www/nunaheritage
./copy-academy-videos.sh
```

### Ce que fait le script

Pour chaque dossier trouvé dans `tmp/academy/`, le script :

1. **Copie le dossier** dans le container Docker vers `/app/uploads/academy/`
2. **Supprime le dossier** de `tmp/academy/` pour libérer de l'espace disque
3. **Exécute le seed** correspondant dans le container

### Mapping des formations vers les seeds

| Dossier | Seed command |
|---------|-------------|
| `charisme` | `seed:charisme` |
| `gestion des emotion` ou `gestion des emotions` | `seed:gestion-emotions` |
| `tressage coquillage` | `seed:tressage-coquillage` |

## ⚠️ Notes importantes

- **Espace disque** : Le script supprime chaque dossier de `tmp/` après copie pour libérer de l'espace
- **Traitement séquentiel** : Les dossiers sont traités un par un pour économiser l'espace disque
- **Gestion des erreurs** : Si une étape échoue, le script continue avec le dossier suivant
- **Seeds optionnels** : Si aucun seed n'est trouvé pour un dossier, seule la copie est effectuée

## 🔧 Dépannage

### Le container n'est pas en cours d'exécution

```bash
cd /var/www/nunaheritage
docker-compose up -d backend
```

### Vérifier que les vidéos ont été copiées

```bash
docker exec nunaheritage-backend ls -la /app/uploads/academy/
```

### Exécuter un seed manuellement

```bash
docker exec -w /app nunaheritage-backend npm run seed:charisme
docker exec -w /app nunaheritage-backend npm run seed:gestion-emotions
docker exec -w /app nunaheritage-backend npm run seed:tressage-coquillage
```

### Vérifier les logs du script

Le script affiche des messages colorés :
- 🔵 Bleu : Informations générales
- 🟢 Vert : Succès
- 🟡 Jaune : Avertissements
- 🔴 Rouge : Erreurs

## 📝 Exemple de sortie

```
========================================
  Copie des vidéos de formation
========================================

🔍 Recherche des dossiers de formation...

✓ 3 dossier(s) trouvé(s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Traitement de: charisme
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Copie de charisme...
  → Copie en cours...
  ✓ Copie réussie
  🗑️  Suppression de charisme depuis tmp...
  ✓ Suppression réussie

🌱 Exécution du seed pour charisme...
  ✓ Seed exécuté avec succès
✅ Traitement de charisme terminé
```
