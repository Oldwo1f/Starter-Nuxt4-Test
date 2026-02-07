# 🚀 Guide de Déploiement - Nuna Heritage

## Vue d'ensemble

Ce projet utilise Docker Compose pour déployer l'application complète :
- **Frontend** (Nuxt.js) - Port 8080
- **Backend** (NestJS) - Port 8081  
- **PostgreSQL** - Port 5432

Tous les services sont configurés pour fonctionner avec Traefik comme reverse proxy.

## Prérequis

- Docker et Docker Compose installés
- Traefik en cours d'exécution (déjà présent sur votre serveur)
- Domaine configuré: `nunaaheritage.aito-flow.com`

## Configuration Rapide

### 1. Créer le fichier `.env`

Créez un fichier `.env` à la racine du projet avec le contenu suivant :

```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=votre-mot-de-passe-securise
DB_NAME=nunaheritage

# JWT Configuration
JWT_SECRET=votre-secret-jwt-tres-securise

# Frontend URL
FRONTEND_URL=https://nunaaheritage.aito-flow.com

# Facebook OAuth
FACEBOOK_APP_ID=votre-facebook-app-id
FACEBOOK_APP_SECRET=votre-facebook-app-secret

# Traefik Network (par défaut: n8n-traefik-network)
TRAEFIK_NETWORK=n8n-traefik-network
```

**⚠️ IMPORTANT**: 
- Remplacez tous les `votre-*` par vos vraies valeurs
- Le mot de passe de la base de données doit être sécurisé
- Le JWT_SECRET doit être une chaîne aléatoire longue et sécurisée
- Vérifiez que `TRAEFIK_NETWORK` correspond au nom de votre réseau Traefik (voir ci-dessous)

### 2. Vérifier le réseau Traefik

Sur votre serveur, vérifiez le nom du réseau Traefik :

```bash
docker network ls | grep traefik
```

Le nom devrait être `n8n-traefik-network` (d'après votre configuration existante). Si c'est différent, ajustez la variable `TRAEFIK_NETWORK` dans votre fichier `.env`.

### 3. Déployer

#### Option A: Utiliser le script automatique

```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Déploiement manuel

```bash
# Créer le réseau de l'application
docker network create nunaheritage-network

# Construire les images
docker-compose build

# Démarrer les services
docker-compose up -d

# Vérifier l'état
docker-compose ps
```

## URLs de l'Application

Une fois déployé, l'application sera accessible sur :

- **Frontend**: https://nunaaheritage.aito-flow.com
- **Backend API**: https://api.nunaaheritage.aito-flow.com
- **Swagger Documentation**: https://api.nunaaheritage.aito-flow.com/api

## Commandes Utiles

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Redémarrer un service

```bash
docker-compose restart frontend
docker-compose restart backend
docker-compose restart postgres
```

### Reconstruire après modification

```bash
docker-compose up -d --build
```

### Arrêter les services

```bash
docker-compose down
```

### Arrêter et supprimer les volumes (⚠️ supprime les données)

```bash
docker-compose down -v
```

### Accéder à la base de données

```bash
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage
```

## Structure des Conteneurs

D'après votre configuration existante, les conteneurs seront nommés :

- `nunaheritage-frontend` - Application Nuxt.js
- `nunaheritage-backend` - API NestJS
- `nunaheritage-postgres` - Base de données PostgreSQL

## Dépannage

### Les conteneurs ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier l'état
docker-compose ps -a
```

### Erreur de connexion au réseau Traefik

Vérifiez que le réseau Traefik existe :

```bash
docker network inspect n8n-traefik-network
```

Si le réseau n'existe pas ou a un nom différent, ajustez `TRAEFIK_NETWORK` dans `.env`.

### Erreur 502 Bad Gateway

- Vérifiez que Traefik est en cours d'exécution : `docker ps | grep traefik`
- Vérifiez les labels dans `docker-compose.yml`
- Vérifiez les logs Traefik : `docker logs n8n-traefik-1`

### Le frontend ne peut pas se connecter au backend

- Vérifiez que `NUXT_PUBLIC_API_BASE_URL` est correct (défini dans `docker-compose.yml`)
- Vérifiez les logs du backend : `docker-compose logs backend`
- Vérifiez CORS dans le backend (variable `FRONTEND_URL`)

### Erreur de base de données

- Vérifiez que le conteneur PostgreSQL est démarré : `docker-compose ps`
- Vérifiez les variables d'environnement dans `.env`
- Vérifiez les logs : `docker-compose logs postgres`

## Mise à jour de l'Application

```bash
# Récupérer les dernières modifications
git pull

# Reconstruire et redémarrer
docker-compose up -d --build
```

## Sauvegarde de la Base de Données

```bash
# Créer une sauvegarde
docker exec nunaheritage-postgres pg_dump -U postgres nunaheritage > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer une sauvegarde
docker exec -i nunaheritage-postgres psql -U postgres nunaheritage < backup.sql
```

## Configuration Traefik

Les labels Traefik sont configurés dans `docker-compose.yml`. Par défaut :
- Entrypoint HTTPS: `websecure`
- Certificat resolver: `letsencrypt`
- Réseau: `n8n_default` (configurable via `TRAEFIK_NETWORK`)

Si votre configuration Traefik est différente, modifiez les labels dans `docker-compose.yml`.

## Sécurité

- ⚠️ Changez tous les mots de passe par défaut
- ⚠️ Utilisez des secrets JWT forts
- ⚠️ Configurez correctement CORS
- ⚠️ Activez le firewall sur le serveur
- ⚠️ Configurez des sauvegardes régulières
