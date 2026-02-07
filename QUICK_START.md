# 🚀 Guide de Déploiement Rapide - Nuna Heritage

## Vue d'ensemble

Ce guide vous permet de déployer rapidement l'application Nuna Heritage sur votre serveur avec Docker et Traefik.

## Prérequis

- ✅ Docker et Docker Compose installés
- ✅ Traefik configuré et en cours d'exécution
- ✅ Domaine configuré: `nunaaheritage.aito-flow.com`
- ✅ Accès SSH au serveur

## Déploiement en 5 Étapes

### 1. Récupérer les informations Traefik

Sur votre serveur, exécutez:

```bash
cd /var/www/nunaheritage
chmod +x check-traefik.sh
./check-traefik.sh
```

Notez:
- Le nom du réseau Traefik (ex: `traefik-network`)
- L'entrypoint HTTPS (ex: `websecure`)
- Le certificat resolver (ex: `letsencrypt`)

### 2. Configurer les variables d'environnement

Créez le fichier `.env` à la racine du projet:

```bash
cat > .env << 'EOF'
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE
DB_NAME=nunaheritage

# JWT Configuration
JWT_SECRET=VOTRE_SECRET_JWT_TRES_SECURISE

# Frontend URL
FRONTEND_URL=https://nunaaheritage.aito-flow.com

# Facebook OAuth
FACEBOOK_APP_ID=votre-facebook-app-id
FACEBOOK_APP_SECRET=votre-facebook-app-secret

# Traefik Network (optionnel, par défaut: traefik-network)
TRAEFIK_NETWORK=traefik-network
EOF
```

**⚠️ IMPORTANT**: Remplacez les valeurs par vos vraies données!

### 3. Ajuster la configuration Traefik (si nécessaire)

Si votre configuration Traefik utilise des noms différents, modifiez `docker-compose.yml`:

- `websecure` → votre entrypoint HTTPS
- `letsencrypt` → votre certificat resolver
- `traefik-network` → votre réseau Traefik (ou utilisez la variable `TRAEFIK_NETWORK`)

### 4. Créer les réseaux Docker

```bash
# Créer le réseau de l'application
docker network create nunaheritage-network

# Vérifier que le réseau Traefik existe
docker network ls | grep traefik
```

### 5. Déployer

```bash
# Option A: Utiliser le script automatique
chmod +x deploy.sh
./deploy.sh

# Option B: Déploiement manuel
docker-compose build
docker-compose up -d
```

## Vérification

```bash
# Voir l'état des conteneurs
docker-compose ps

# Voir les logs
docker-compose logs -f

# Tester l'application
curl https://nunaaheritage.aito-flow.com
curl https://api.nunaaheritage.aito-flow.com/api
```

## URLs de l'Application

- **Frontend**: https://nunaaheritage.aito-flow.com
- **Backend API**: https://api.nunaaheritage.aito-flow.com
- **Swagger**: https://api.nunaaheritage.aito-flow.com/api

## Commandes Utiles

```bash
# Logs en temps réel
docker-compose logs -f

# Redémarrer un service
docker-compose restart frontend
docker-compose restart backend

# Reconstruire après modification
docker-compose up -d --build

# Arrêter tout
docker-compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données)
docker-compose down -v
```

## Dépannage

### Les conteneurs ne démarrent pas

```bash
docker-compose logs
docker-compose ps
```

### Erreur de réseau Traefik

Vérifiez que le réseau Traefik existe et que les conteneurs y sont connectés:

```bash
docker network inspect traefik-network
docker network inspect nunaheritage-network
```

### Erreur 502 Bad Gateway

- Vérifiez que Traefik est en cours d'exécution
- Vérifiez les labels dans `docker-compose.yml`
- Vérifiez les logs Traefik: `docker logs <traefik-container>`

### Le frontend ne peut pas se connecter au backend

- Vérifiez que `NUXT_PUBLIC_API_BASE_URL` est correct dans `.env`
- Vérifiez les logs du backend: `docker-compose logs backend`
- Vérifiez CORS dans le backend (variable `FRONTEND_URL`)

## Documentation Complète

Pour plus de détails, consultez [DEPLOYMENT.md](./DEPLOYMENT.md)

## Support

En cas de problème, vérifiez:
1. Les logs: `docker-compose logs -f`
2. L'état des conteneurs: `docker-compose ps`
3. La configuration Traefik: `./check-traefik.sh`
