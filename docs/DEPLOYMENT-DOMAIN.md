# Migration vers nunaaheritage.com

Guide pour faire fonctionner l'application avec les domaines **nunaaheritage.com** et **api.nunaaheritage.com**.

---

## Prérequis

- DNS configurés : `nunaaheritage.com` et `api.nunaaheritage.com` pointent vers l'IP du serveur
- Traefik installé et configuré (réseau `n8n_default` ou équivalent)
- Ports 80 et 443 ouverts sur le pare-feu

---

## Étape 1 : Vérifier la propagation DNS

```bash
# Vérifier que les domaines pointent bien vers votre serveur
dig +short nunaaheritage.com
dig +short api.nunaaheritage.com
```

Les deux doivent retourner l'IP de votre serveur.

---

## Étape 2 : Modifier le fichier `.env`

Éditer `/var/www/nunaheritage/.env` et mettre à jour :

```env
# Remplacer les anciennes URLs
FRONTEND_URL=https://nunaaheritage.com
NUXT_PUBLIC_API_BASE_URL=https://api.nunaaheritage.com

# MCP Admin (optionnel, pour Cursor)
NUNA_API_URL=https://api.nunaaheritage.com
```

---

## Étape 3 : Modifier le `docker-compose.yml`

Mettre à jour les labels Traefik pour utiliser les nouveaux domaines :

**Backend** (ligne ~64) :
```yaml
- "traefik.http.routers.nunaheritage-backend.rule=Host(`api.nunaaheritage.com`)"
```

**Frontend** (ligne ~81 et ~90) :
```yaml
# Dans environment du frontend :
NUXT_PUBLIC_API_BASE_URL: https://api.nunaaheritage.com

# Dans labels :
- "traefik.http.routers.nunaheritage-frontend.rule=Host(`nunaaheritage.com`)"
```

---

## Étape 4 : Facebook Developers (OAuth)

1. Aller sur [developers.facebook.com](https://developers.facebook.com/)
2. Sélectionner l'app Nuna Heritage (ID: 942539758444836)
3. **Facebook Login** → **Paramètres** → **Valid OAuth Redirect URIs**
4. Ajouter :
   - `https://nunaaheritage.com/`
   - `https://nunaaheritage.com/login`
   - `https://nunaaheritage.com/register`
   - (Optionnel) `https://www.nunaaheritage.com/` si vous utilisez www
5. **Paramètres** → **Paramètres de base** → **Domaines de l'application** : ajouter `nunaaheritage.com`
6. **Paramètres** → **Paramètres avancés** → **URL de demande de suppression des données** : `https://api.nunaaheritage.com/auth/facebook-deletion-callback`
7. Sauvegarder les modifications

---

## Étape 5 : Stripe Dashboard

1. Aller sur [dashboard.stripe.com](https://dashboard.stripe.com/)
2. **Developers** → **Webhooks** → modifier ou créer le webhook existant
3. **URL de point de terminaison** : `https://api.nunaaheritage.com/stripe/webhook`
4. Si vous créez un nouveau webhook, récupérer le **Signing secret** (commence par `whsec_`)
5. Mettre à jour `STRIPE_WEBHOOK_SECRET` dans le `.env` si le secret a changé
6. **Settings** → **Branding** → vérifier que les URLs de redirection sont cohérentes (elles utilisent `FRONTEND_URL` côté backend, donc pas de changement Stripe si `.env` est correct)

---

## Étape 6 : Brevo (emails)

Le `BREVO_FROM_EMAIL=no-reply@nunaaheritage.com` est déjà correct. Vérifier dans Brevo que le domaine `nunaaheritage.com` est vérifié pour l'envoi d'emails.

---

## Étape 7 : Redéployer l'application

```bash
cd /var/www/nunaheritage
./deploy.sh
```

Ou manuellement :

```bash
cd /var/www/nunaheritage
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Étape 8 : SSL (Let's Encrypt via Traefik)

Traefik avec `certresolver=mytlschallenge` doit obtenir automatiquement les certificats pour les nouveaux domaines. Vérifier que :

1. Les ports 80 et 443 sont accessibles depuis l'extérieur
2. Traefik est bien démarré et connecté au réseau `n8n_default`
3. Les conteneurs Nuna Heritage sont sur ce même réseau

Si les certificats ne se génèrent pas, vérifier les logs Traefik :

```bash
docker logs <conteneur_traefik> 2>&1 | grep -i acme
```

---

## Étape 9 : Redirection www (optionnel)

Si vous voulez que `www.nunaaheritage.com` redirige vers `nunaaheritage.com`, ajouter une règle Traefik dans votre configuration Traefik (fichier ou labels) :

```yaml
# Exemple de règle de redirection www -> non-www
- "traefik.http.routers.nunaheritage-frontend-www.rule=Host(`www.nunaaheritage.com`)"
- "traefik.http.routers.nunaheritage-frontend-www.middlewares=redirect-to-non-www"
```

(Cela dépend de la config Traefik existante.)

---

## Checklist finale

- [ ] DNS propagés
- [ ] `.env` mis à jour (FRONTEND_URL, NUXT_PUBLIC_API_BASE_URL)
- [ ] `docker-compose.yml` mis à jour (labels Traefik)
- [ ] Facebook : OAuth Redirect URIs, domaines, et URL de suppression des données
- [ ] Stripe : webhook URL
- [ ] Brevo : domaine vérifié
- [ ] Redéploiement effectué
- [ ] Test : https://nunaaheritage.com
- [ ] Test : https://api.nunaaheritage.com/api (Swagger)
- [ ] Test : login Facebook
- [ ] Test : paiement Stripe (mode test)

---

## Dépannage

**Erreur CORS** : Vérifier que `FRONTEND_URL` dans le backend correspond exactement à l'URL du frontend (https, pas de slash final).

**Certificat SSL invalide** : Attendre quelques minutes pour Let's Encrypt, ou vérifier que le port 80 est accessible (challenge HTTP-01).

**Facebook "URL non autorisée"** : Vérifier que les URIs ajoutées dans Facebook sont exactement celles utilisées (avec ou sans trailing slash selon la config).
