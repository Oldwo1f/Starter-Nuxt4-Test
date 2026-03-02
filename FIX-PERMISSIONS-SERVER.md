# 🔧 Correction des Permissions sur le Serveur

## Problème

Les scripts shell ne sont pas exécutables après le pull sur le serveur.

## Solution rapide

Exécutez cette commande sur le serveur pour rendre tous les scripts exécutables :

```bash
cd /var/www/nunaaheritage
chmod +x *.sh
chmod +x backend/src/database/seeds/*.sh 2>/dev/null || true
```

## Scripts à rendre exécutables

```bash
# Scripts principaux
chmod +x run-consolidated-migration.sh
chmod +x check-migrations-status.sh
chmod +x deploy.sh
chmod +x run-seeds.sh
chmod +x rebuild-safe.sh

# Tous les scripts shell du répertoire racine
chmod +x *.sh
```

## Vérification

Après avoir corrigé les permissions, vérifiez :

```bash
ls -lh *.sh
```

Vous devriez voir `-rwxr-xr-x` (x = exécutable) au lieu de `-rw-r--r--`.

## Alternative : Exécuter avec bash

Si vous ne pouvez pas modifier les permissions, vous pouvez exécuter directement :

```bash
bash run-consolidated-migration.sh
```

## Note Git

Git ne conserve pas toujours les permissions d'exécution. C'est normal et il faut les remettre après chaque pull sur le serveur.
