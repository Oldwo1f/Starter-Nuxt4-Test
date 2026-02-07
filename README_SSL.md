# 🔒 Guide de Dépannage SSL/TLS - Nuna Heritage

## Problème de Certificat SSL

Si vous rencontrez une erreur de certificat SSL, voici comment la résoudre.

## Vérification Rapide

Exécutez le script de vérification :

```bash
./check-ssl.sh
```

## Causes Courantes

### 1. Certificat Let's Encrypt en cours de génération

**Symptôme** : Erreur "certificate not found" ou "SSL handshake failed"

**Solution** : Attendez quelques minutes. Les certificats Let's Encrypt peuvent prendre 2-5 minutes à être générés lors de la première demande.

Vérifiez les logs Traefik :

```bash
docker logs n8n-traefik-1 | grep -i certificate
```

### 2. Domaines non configurés correctement

**Vérification** : Assurez-vous que les domaines pointent vers votre serveur :

```bash
# Vérifier le DNS
dig nunaaheritage.aito-flow.com
dig api.nunaaheritage.aito-flow.com
```

Les deux doivent pointer vers l'IP de votre serveur.

### 3. Ports 80 et 443 non ouverts

**Vérification** : Les ports HTTP (80) et HTTPS (443) doivent être ouverts :

```bash
# Vérifier que Traefik écoute sur ces ports
docker ps | grep traefik
# Doit afficher : 0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 4. Configuration Traefik incorrecte

**Vérification** : Vérifiez que les labels Traefik sont corrects :

```bash
docker inspect nunaheritage-frontend | grep -A 20 "Labels"
docker inspect nunaheritage-backend | grep -A 20 "Labels"
```

Les labels doivent inclure :
- `traefik.enable=true`
- `traefik.http.routers.*.entrypoints=websecure`
- `traefik.http.routers.*.tls.certresolver=letsencrypt`

### 5. Réseau Docker incorrect

**Vérification** : Vérifiez que les conteneurs sont sur le bon réseau :

```bash
docker network inspect n8n_default | grep -E "nunaheritage|traefik"
```

Les conteneurs `nunaheritage-frontend`, `nunaheritage-backend` et `n8n-traefik-1` doivent être sur le même réseau.

## Solutions

### Solution 1 : Redémarrer les conteneurs

Parfois, un simple redémarrage résout le problème :

```bash
docker compose restart frontend backend
```

### Solution 2 : Vérifier les logs Traefik

```bash
docker logs n8n-traefik-1 --tail 50 | grep -i -E "error|certificate|acme|letsencrypt"
```

### Solution 3 : Forcer la régénération du certificat

Si le certificat ne se génère pas, vous pouvez forcer Traefik à le régénérer :

1. Supprimez les certificats existants (dans le volume Traefik)
2. Redémarrez Traefik

⚠️ **Attention** : Cette opération nécessite l'accès au volume Traefik.

### Solution 4 : Vérifier la configuration Traefik

Si votre Traefik utilise des noms d'entrypoints ou de certificat resolver différents, modifiez `docker-compose.yml` :

```yaml
labels:
  - "traefik.http.routers.nunaheritage-frontend.entrypoints=websecure"  # Changez si différent
  - "traefik.http.routers.nunaheritage-frontend.tls.certresolver=letsencrypt"  # Changez si différent
```

Pour connaître la configuration Traefik :

```bash
docker exec n8n-traefik-1 cat /etc/traefik/traefik.yml
# ou
docker logs n8n-traefik-1 | grep -i entrypoint
```

## Test Manuel

Testez les certificats manuellement :

```bash
# Test frontend
curl -vI https://nunaaheritage.aito-flow.com

# Test backend
curl -vI https://api.nunaaheritage.aito-flow.com/api
```

## Vérification du Certificat

Pour vérifier les détails du certificat :

```bash
echo | openssl s_client -servername nunaaheritage.aito-flow.com -connect nunaaheritage.aito-flow.com:443 2>/dev/null | openssl x509 -noout -dates
```

## En Cas d'Urgence : Désactiver temporairement HTTPS

⚠️ **Ne faites cela qu'en développement !**

Si vous devez tester sans SSL, vous pouvez temporairement utiliser HTTP en modifiant les labels dans `docker-compose.yml` :

```yaml
# Remplacer websecure par web (HTTP)
- "traefik.http.routers.nunaheritage-frontend.entrypoints=web"
# Retirer la ligne TLS
# - "traefik.http.routers.nunaheritage-frontend.tls.certresolver=letsencrypt"
```

Puis redémarrez :

```bash
docker compose up -d
```

## Support

Si le problème persiste après avoir essayé ces solutions :

1. Vérifiez les logs complets : `docker logs n8n-traefik-1`
2. Vérifiez la configuration DNS de vos domaines
3. Vérifiez que les ports 80 et 443 sont accessibles depuis l'extérieur
