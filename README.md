# Nuna Heritage - Full Stack Application

Application full stack avec frontend Nuxt 3 PWA et backend NestJS avec PostgreSQL.

## Structure du projet

```
nunaheritage/
├── frontend/          # Application Nuxt 3 PWA
├── backend/           # Application NestJS
└── README.md          # Documentation du projet
```

## Prérequis

-   Node.js (v18 ou supérieur)
-   PostgreSQL (v12 ou supérieur)
-   npm ou yarn

## Installation

### 1. Base de données PostgreSQL

Créez la base de données PostgreSQL :

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE nunaheritage;

# Quitter
\q
```

### 2. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp env.example .env

# Éditer .env avec vos paramètres de base de données
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=postgres
# DB_NAME=nunaheritage
# JWT_SECRET=your-secret-key-change-in-production
# PORT=3001

# Lancer les seeds (créer les données initiales)
npm run seed

# Démarrer le serveur de développement
npm run start:dev
```

Le backend sera accessible sur `http://localhost:3001`

### 3. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur `http://localhost:3000`

## Données de seed

Les seeds créent automatiquement :

### Utilisateurs

-   **Admin** : `admin@example.com` / `admin123`
-   **Users** :
    -   `user1@example.com` / `user123`
    -   `user2@example.com` / `user123`
    -   `user3@example.com` / `user123`
    -   `user4@example.com` / `user123`

### Articles de blog

7 articles de blog sont créés avec différents auteurs.

## API Endpoints

### Authentification

-   `POST /auth/register` - Inscription
-   `POST /auth/login` - Connexion

### Utilisateurs

-   `GET /users` - Liste des utilisateurs (Admin uniquement)

### Blog

-   `GET /blog` - Liste des articles
-   `GET /blog/:id` - Détails d'un article
-   `POST /blog` - Créer un article (Authentifié)
-   `PATCH /blog/:id` - Modifier un article (Authentifié)
-   `DELETE /blog/:id` - Supprimer un article (Authentifié)

## Technologies utilisées

### Frontend

-   **Nuxt 3** - Framework Vue.js
-   **Nuxt UI** - Bibliothèque de composants
-   **Pinia** - State management
-   **PWA** - Progressive Web App

### Backend

-   **NestJS** - Framework Node.js
-   **TypeORM** - ORM pour PostgreSQL
-   **PostgreSQL** - Base de données relationnelle
-   **JWT** - Authentification
-   **bcrypt** - Hashage des mots de passe

## Scripts disponibles

### Backend

-   `npm run start:dev` - Démarrer en mode développement
-   `npm run build` - Construire pour la production
-   `npm run start:prod` - Démarrer en mode production
-   `npm run seed` - Lancer les seeds de la base de données

### Frontend

-   `npm run dev` - Démarrer en mode développement
-   `npm run build` - Construire pour la production
-   `npm run preview` - Prévisualiser la build de production

## Configuration

### Variables d'environnement Backend

Créez un fichier `.env` dans le dossier `backend/` :

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nunaheritage
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Variables d'environnement Frontend

Le frontend utilise la configuration dans `nuxt.config.ts`. L'URL de l'API peut être configurée via la variable d'environnement `API_BASE_URL` (par défaut: `http://localhost:3001`).

## Développement

### Structure Backend

```
backend/
├── src/
│   ├── auth/           # Module d'authentification
│   ├── users/          # Module utilisateurs
│   ├── blog/           # Module blog
│   ├── entities/       # Entités TypeORM
│   ├── database/       # Configuration DB et seeds
│   └── main.ts         # Point d'entrée
```

### Structure Frontend

```
frontend/
├── app/                # Application Nuxt
├── pages/              # Pages de l'application
├── stores/             # Stores Pinia
├── composables/        # Composables Nuxt
└── public/             # Assets statiques
```

## Notes

-   En développement, TypeORM synchronise automatiquement le schéma de la base de données
-   En production, utilisez les migrations TypeORM
-   Changez le `JWT_SECRET` en production
-   Les mots de passe sont hashés avec bcrypt (10 rounds)
