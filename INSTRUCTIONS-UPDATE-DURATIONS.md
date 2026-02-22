# 📋 Instructions pour mettre à jour les durées sur le serveur

## ✅ Ce qui a été fait

1. **Récupération des durées depuis la DB locale** : ✅ Terminé
   - 62 vidéos récupérées
   - Toutes les vidéos ont une durée définie
   - Formations couvertes :
     - Gestion des émotions
     - Charisme
     - Tressage de coquillage

2. **Script de mise à jour généré** : ✅ Prêt
   - Fichier : `backend/src/database/scripts/update-durations-from-local.ts`
   - Contient toutes les durées récupérées depuis la DB locale
   - Prêt à être exécuté sur le serveur

## 🚀 Exécution sur le serveur

### Option 1 : Script shell (recommandé)

```bash
cd /var/www/nunaheritage
./update-durations-on-server.sh
```

### Option 2 : Exécution manuelle

```bash
cd /var/www/nunaheritage/backend
npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register src/database/scripts/update-durations-from-local.ts
```

### Option 3 : Via Docker (si le conteneur backend est en cours d'exécution)

```bash
cd /var/www/nunaheritage
docker exec -it nunaheritage-backend sh -c "cd /app && npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register src/database/scripts/update-durations-from-local.ts"
```

## 📊 Ce que fait le script

Le script `update-durations-from-local.ts` :

1. Se connecte à la base de données du serveur
2. Pour chaque vidéo (62 au total) :
   - Récupère la vidéo par son ID
   - Met à jour la durée avec la valeur récupérée depuis la DB locale
   - Affiche un message de confirmation
3. Affiche un résumé final :
   - Nombre de vidéos mises à jour
   - Nombre de vidéos ignorées (si pas de durée)
   - Nombre d'erreurs éventuelles

## ⚠️ Notes importantes

- **Sécurité** : Le script met à jour uniquement les durées, il ne modifie pas d'autres données
- **IDs des vidéos** : Le script utilise les IDs des vidéos de la DB locale. Assurez-vous que les IDs correspondent entre la DB locale et la DB serveur
- **Variables d'environnement** : Le script utilise les variables d'environnement du serveur (DB_HOST, DB_PORT, etc.)

## 🔍 Vérification après exécution

Après avoir exécuté le script, vous pouvez vérifier que les durées ont été mises à jour :

```bash
# Se connecter à la DB
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage

# Vérifier quelques durées
SELECT v.id, v.title, v.duration, c.title as course 
FROM videos v 
INNER JOIN academy_modules m ON v."moduleId" = m.id 
INNER JOIN courses c ON m."courseId" = c.id 
WHERE c.title IN ('Gestion des émotions', 'Charisme', 'Tressage de coquillage')
ORDER BY c.title, v.id
LIMIT 10;
```

## 📝 Fichiers générés

- `backend/src/database/scripts/update-durations-from-local.ts` - Script TypeScript avec toutes les durées
- `update-durations-on-server.sh` - Script shell pour faciliter l'exécution

## 🎯 Résultat attendu

Après exécution, vous devriez voir :
```
✅ Vidéos mises à jour: 62
⏭ Vidéos ignorées (pas de durée): 0
⚠ Erreurs: 0
```

Toutes les 62 vidéos des 3 formations auront leurs durées mises à jour sur le serveur.
