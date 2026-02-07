# Configuration Facebook Connect

Ce guide vous explique comment configurer Facebook Connect pour l'application Nuna Heritage.

## 1. Créer une application Facebook

1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Connectez-vous avec votre compte Facebook
3. Cliquez sur **"Mes applications"** > **"Créer une application"**
4. Sélectionnez le type d'application : **"Consommateur"** ou **"Aucun"**
5. Remplissez les informations de base :
   - **Nom de l'application** : Nuna Heritage (ou votre nom)
   - **Email de contact** : votre email
   - **Objectif de l'application** : Connexion

## 2. Configurer l'application Facebook

### 2.1. Ajouter le produit "Facebook Login"

1. Dans le tableau de bord de votre application, allez dans **"Ajouter un produit"**
2. Recherchez **"Facebook Login"** et cliquez sur **"Configurer"**

### 2.2. Configurer les paramètres Facebook Login

1. Allez dans **"Paramètres"** > **"Paramètres de base"**
2. Notez votre **ID d'application** (App ID) et votre **Clé secrète d'application** (App Secret)
3. Ajoutez les **Domaines de l'application** :
   - Pour le développement : `localhost`
   - Pour la production : votre domaine (ex: `nunaheritage.com`)

### 2.3. Configurer les URI de redirection OAuth

1. Allez dans **"Facebook Login"** > **"Paramètres"**
2. Dans **"URI de redirection OAuth valides"**, ajoutez :
   - Pour le développement : `http://localhost:3000`
   - Pour la production : `https://votre-domaine.com`
3. Dans **"Domaines autorisés"**, ajoutez :
   - Pour le développement : `localhost`
   - Pour la production : votre domaine

### 2.4. Configurer les permissions

1. Allez dans **"Facebook Login"** > **"Paramètres"**
2. Dans **"Permissions et fonctionnalités"**, assurez-vous que les permissions suivantes sont demandées :
   - `email` (obligatoire) - **IMPORTANT** : Cette permission doit être activée
   - `public_profile` (obligatoire)

**⚠️ IMPORTANT - Activer la permission Email :**

Pour que la permission `email` fonctionne, vous devez :

1. Aller dans **"Paramètres"** > **"Paramètres de base"** de votre application
2. Vérifier que votre application est en mode **"Développement"** ou **"Production"**
3. Aller dans **"Facebook Login"** > **"Paramètres"**
4. Dans la section **"Permissions et fonctionnalités"**, cliquez sur **"Ajouter"** ou **"Modifier"**
5. Assurez-vous que `email` est dans la liste des permissions demandées
6. Si `email` n'apparaît pas, vous devrez peut-être :
   - Ajouter `email` manuellement dans les permissions
   - Ou passer votre application en mode Production (certaines permissions nécessitent le mode Production)

**Note** : En mode Développement, la permission `email` devrait fonctionner pour les administrateurs, développeurs et testeurs de l'application.

### 2.5. Mode de développement vs Production

- **Mode développement** : L'application fonctionne uniquement pour les administrateurs, développeurs et testeurs ajoutés dans les paramètres
- **Mode production** : L'application est accessible à tous après révision par Facebook (si nécessaire)

Pour passer en mode production :
1. Allez dans **"Paramètres"** > **"Paramètres de base"**
2. Changez le **Mode** de "Développement" à "Production"
3. Note : Certaines fonctionnalités peuvent nécessiter une révision par Facebook

## 3. Configuration Backend

### 3.1. Créer le fichier `.env` dans `/backend`

Copiez le fichier `env.example` vers `.env` :

```bash
cd backend
cp env.example .env
```

### 3.2. Modifier le fichier `.env`

Ouvrez `backend/.env` et ajoutez/modifiez les lignes suivantes :

```env
FACEBOOK_APP_ID=votre-app-id-facebook
FACEBOOK_APP_SECRET=votre-app-secret-facebook
```

**Important** : Remplacez `votre-app-id-facebook` et `votre-app-secret-facebook` par les valeurs réelles de votre application Facebook.

## 4. Configuration Frontend

### 4.1. Créer le fichier `.env` dans `/frontend`

Créez un fichier `.env` dans le dossier `frontend` :

```bash
cd frontend
touch .env
```

### 4.2. Modifier le fichier `.env`

Ajoutez la ligne suivante dans `frontend/.env` :

```env
FACEBOOK_APP_ID=votre-app-id-facebook
```

**Important** : Utilisez le même **App ID** que celui configuré dans le backend.

## 5. Redémarrer les serveurs

Après avoir configuré les fichiers `.env`, redémarrez les serveurs :

### Backend
```bash
cd backend
npm run start:dev
```

### Frontend
```bash
cd frontend
npm run dev
```

## 6. Tester la connexion Facebook

1. Allez sur `http://localhost:3000/login` ou `http://localhost:3000/register`
2. Cliquez sur **"Continuer avec Facebook"**
3. Une popup Facebook devrait s'ouvrir
4. Autorisez l'application à accéder à votre email et profil
5. Vous devriez être automatiquement connecté/inscrit

## 7. Dépannage

### Erreur : "Facebook App ID is not configured"
- Vérifiez que le fichier `.env` existe dans `frontend/`
- Vérifiez que `FACEBOOK_APP_ID` est bien défini dans `frontend/.env`
- Redémarrez le serveur frontend

### Erreur : "Facebook OAuth not configured"
- Vérifiez que le fichier `.env` existe dans `backend/`
- Vérifiez que `FACEBOOK_APP_ID` et `FACEBOOK_APP_SECRET` sont bien définis dans `backend/.env`
- Redémarrez le serveur backend

### Erreur : "Invalid or expired Facebook token"
- Vérifiez que l'App ID et l'App Secret sont corrects
- Vérifiez que les URI de redirection sont correctement configurées dans Facebook Developers
- Vérifiez que l'application Facebook est en mode "Développement" et que vous êtes ajouté comme testeur

### La popup Facebook ne s'ouvre pas
- Vérifiez que le blocage de popup n'est pas activé dans votre navigateur
- Vérifiez la console du navigateur pour les erreurs JavaScript
- Vérifiez que le SDK Facebook se charge correctement (onglet Network dans les DevTools)

## 8. Production

Pour la production, assurez-vous de :

1. **Changer le mode de l'application Facebook en "Production"**
2. **Mettre à jour les domaines** dans les paramètres Facebook :
   - URI de redirection OAuth : `https://votre-domaine.com`
   - Domaines autorisés : `votre-domaine.com`
3. **Mettre à jour les fichiers `.env`** avec les mêmes valeurs (App ID et App Secret)
4. **Vérifier que les variables d'environnement** sont bien chargées en production

## 9. Sécurité

⚠️ **Important** :
- Ne commitez **JAMAIS** les fichiers `.env` dans Git
- Les fichiers `.env` sont déjà dans `.gitignore`
- Ne partagez **JAMAIS** votre App Secret publiquement
- Utilisez des variables d'environnement différentes pour le développement et la production

## Support

Pour plus d'informations sur Facebook Login, consultez la [documentation officielle](https://developers.facebook.com/docs/facebook-login/web).
