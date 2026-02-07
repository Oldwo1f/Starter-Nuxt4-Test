# 🌱 Guide des Seeds - Nuna Heritage

## Lancer les Seeds

Pour lancer les seeds de la base de données, utilisez le script fourni :

```bash
./run-seeds.sh
```

Ou manuellement dans le conteneur :

```bash
docker exec -it nunaheritage-backend npm run seed
```

## Ce que les Seeds créent

Les seeds créent automatiquement :

### Utilisateurs
- **Superadmin**: `alexismomcilovic@gmail.com` / `Alexis09`
- **Admin**: `admin@example.com` / `admin123`
- **Users**: Plusieurs utilisateurs de test avec le mot de passe `user123`
- Tous les utilisateurs commencent avec **50 Pūpū** (🐚) dans leur portefeuille

### Données
- **Articles de blog** : 7 articles de blog avec différents auteurs
- **Locations** : Hiérarchie complète des communes de Nouvelle-Calédonie
- **Catégories** : Catégories pour le marketplace
- **Listings marketplace** : Annonces de test
- **Culture videos** : Vidéos culturelles de test
- **Partners** : 3 partenaires (Aito-flow, Akeo, Coach de la route)
- **Goodies** : 6 goodies (mix de public et privé)

## Créer un Superadmin personnalisé

Pour créer un superadmin avec un email et mot de passe personnalisés :

```bash
docker exec -it nunaheritage-backend \
  SEED_SUPERADMIN_EMAIL=votre-email@example.com \
  SEED_SUPERADMIN_PASSWORD=votre-mot-de-passe \
  npm run seed:superadmin
```

## Réexécuter les Seeds

⚠️ **Attention** : Réexécuter les seeds va :
- Supprimer et recréer les articles de blog
- Recréer les locations, catégories, listings, culture videos, partners et goodies
- **Conserver les utilisateurs existants** (pour préserver les soldes de portefeuille)

Pour réexécuter :

```bash
./run-seeds.sh
```

## Dépannage

### Erreur "ts-node not found"

Si vous obtenez une erreur indiquant que `ts-node` n'est pas trouvé, reconstruisez l'image :

```bash
docker compose build backend
docker compose up -d backend
./run-seeds.sh
```

### Erreur de connexion à la base de données

Vérifiez que le conteneur PostgreSQL est en cours d'exécution :

```bash
docker compose ps postgres
```

### Vérifier les données créées

Connectez-vous à la base de données :

```bash
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage
```

Puis exécutez des requêtes SQL pour vérifier les données.
