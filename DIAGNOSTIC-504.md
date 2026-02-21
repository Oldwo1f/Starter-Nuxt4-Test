# Diagnostic 504 Gateway Timeout

## Problème
Toutes les requêtes backend depuis le frontend retournent un **504 Gateway Timeout**.

## Causes possibles

1. **Backend n'écoute pas sur 0.0.0.0** (corrigé dans main.ts)
2. **Problème de réseau Docker** entre Traefik et le backend
3. **Backend n'a pas redémarré** après le rebuild

## Solutions

### 1. Vérifier que le backend écoute sur 0.0.0.0

J'ai modifié `backend/src/main.ts` pour forcer l'écoute sur `0.0.0.0` au lieu de `localhost`.

**Action requise** : Reconstruire et redémarrer le backend :

```bash
cd /var/www/nunaheritage
docker compose build --no-cache backend
docker compose up -d backend
```

### 2. Vérifier la connectivité

Exécutez le script de diagnostic :

```bash
./check-backend-connectivity.sh
```

### 3. Vérifier les logs

```bash
docker logs -f nunaheritage-backend
```

Vous devriez voir :
```
Application is running on: http://0.0.0.0:8081
```

### 4. Tester depuis le container

```bash
# Test depuis le container backend
docker exec nunaheritage-backend wget -q -O- http://localhost:8081

# Test depuis un container sur le réseau Traefik
docker run --rm --network traefik-network curlimages/curl:latest curl -v http://nunaheritage-backend:8081
```

### 5. Vérifier la configuration Traefik

Assurez-vous que :
- Le backend est sur le réseau `traefik-network`
- Le label `traefik.http.services.nunaheritage-backend.loadbalancer.server.port=8081` est correct
- Le backend écoute bien sur le port 8081

## Commandes de diagnostic

```bash
# Vérifier les containers
docker ps | grep nunaheritage

# Vérifier les réseaux
docker network inspect traefik-network | grep -A 10 nunaheritage-backend

# Vérifier que le backend écoute
docker exec nunaheritage-backend netstat -tlnp | grep 8081

# Logs en temps réel
docker logs -f nunaheritage-backend
```
