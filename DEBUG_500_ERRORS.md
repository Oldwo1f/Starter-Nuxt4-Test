# 🔍 Guide de Diagnostic - Erreurs 500 sur /partners et /goodies

## 1. Vérifier les logs du backend

La première étape est de voir les erreurs exactes dans les logs :

```bash
# Voir les logs en temps réel
docker logs -f nunaheritage-backend

# Ou voir les 100 dernières lignes
docker logs --tail 100 nunaheritage-backend
```

## 2. Vérifier si les tables existent dans la base de données

```bash
# Se connecter à la base de données
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage

# Vérifier si les tables existent
\dt

# Vérifier la structure de la table partners
\d partners

# Vérifier la structure de la table goodies
\d goodies

# Vérifier s'il y a des données
SELECT COUNT(*) FROM partners;
SELECT COUNT(*) FROM goodies;

# Quitter
\q
```

## 3. Vérifier si les seeds ont été exécutés

```bash
# Vérifier les données dans les tables
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage -c "SELECT * FROM partners;"
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage -c "SELECT * FROM goodies;"
```

Si les tables sont vides, exécutez les seeds :

```bash
./run-seeds.sh
```

## 4. Tester les endpoints directement

```bash
# Tester depuis le conteneur backend
docker exec -it nunaheritage-backend curl http://localhost:8081/partners
docker exec -it nunaheritage-backend curl http://localhost:8081/goodies
```

## 5. Vérifier la configuration de la base de données

```bash
# Vérifier les variables d'environnement du backend
docker exec -it nunaheritage-backend env | grep DB_
```

## 6. Vérifier la connexion à la base de données

```bash
# Tester la connexion depuis le backend
docker exec -it nunaheritage-backend node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
client.connect()
  .then(() => {
    console.log('✅ Connexion réussie');
    return client.query('SELECT COUNT(*) FROM partners');
  })
  .then(res => {
    console.log('Partners count:', res.rows[0].count);
    return client.query('SELECT COUNT(*) FROM goodies');
  })
  .then(res => {
    console.log('Goodies count:', res.rows[0].count);
    client.end();
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message);
    client.end();
  });
"
```

## 7. Redémarrer le backend après les modifications

```bash
# Reconstruire et redémarrer
docker-compose build backend
docker-compose up -d backend

# Vérifier que le conteneur est bien démarré
docker ps | grep backend
```

## 8. Vérifier les erreurs TypeORM

Les erreurs peuvent venir de :
- Tables manquantes (synchronize: false en production)
- Relations mal configurées
- Colonnes manquantes

Pour forcer la synchronisation (ATTENTION : en production, utilisez des migrations) :

Vérifiez dans `backend/src/database/database.module.ts` :
```typescript
synchronize: process.env.NODE_ENV !== 'production',
```

Si `NODE_ENV=production`, synchronize est false et les tables doivent être créées manuellement ou via des migrations.

## Solutions possibles

### Solution 1 : Créer les tables manuellement

Si synchronize est false, créez les tables :

```sql
-- Se connecter à la base
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage

-- Créer la table partners (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  link VARCHAR,
  "bannerHorizontalUrl" VARCHAR,
  "bannerVerticalUrl" VARCHAR,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Créer la table goodies (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS goodies (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  link VARCHAR,
  description TEXT,
  "imageUrl" VARCHAR,
  "offeredByName" VARCHAR,
  "offeredByLink" VARCHAR,
  "isPublic" BOOLEAN DEFAULT true,
  "createdById" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "FK_goodies_createdBy" FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL
);
```

### Solution 2 : Activer temporairement synchronize

⚠️ **ATTENTION** : Ne faites cela qu'en développement, jamais en production !

Modifiez temporairement `docker-compose.yml` pour forcer synchronize :

```yaml
environment:
  NODE_ENV: development  # Au lieu de production
```

Puis redémarrez :
```bash
docker-compose up -d --build backend
```

## Après diagnostic

Une fois que vous avez identifié l'erreur exacte dans les logs, partagez-la pour qu'on puisse la corriger précisément.
