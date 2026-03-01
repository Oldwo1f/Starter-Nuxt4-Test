# ⚠️ ATTENTION: Scripts de Seed

## 🚨 Le script `npm run seed` SUPPRIME des données !

Le script `npm run seed` (ou `./run-seeds.sh`) **supprime** les données suivantes avant de recréer :

- ❌ **blog_posts** - Tous les articles de blog
- ❌ **listings** - Toutes les annonces du marketplace
- ❌ **categories** - Toutes les catégories
- ❌ **locations** - Toutes les localisations
- ❌ **cultures** - Toutes les vidéos culturelles
- ❌ **partners** - Tous les partenaires
- ❌ **goodies** - Tous les goodies
- ❌ **todos** - Tous les todos

### ⚠️ Ce qui est CONSERVÉ

- ✅ **users** - Les utilisateurs sont conservés (pour préserver les soldes de portefeuille)
- ✅ **transactions** - Les transactions sont conservées
- ✅ **courses, videos, modules** - Les données de l'académie sont conservées
- ✅ **bank_transfer_payments, stripe_payments** - Les paiements sont conservés

## 🔒 Solution: Seed Sécurisé pour les Todos

Pour ajouter les todos **SANS supprimer** les données existantes, utilisez:

```bash
# Depuis le conteneur backend
docker exec -it nunaheritage-backend npm run seed:todos-safe

# Ou directement
cd backend
npm run seed:todos-safe
```

Ce script:
- ✅ **Ne supprime AUCUNE donnée**
- ✅ Ajoute uniquement les todos qui n'existent pas déjà
- ✅ Vérifie l'existence avant d'ajouter (basé sur le titre)
- ✅ Affiche un résumé des todos créés vs. conservés

## 📋 Résumé des Scripts

| Script | Supprime des données? | Usage |
|--------|----------------------|-------|
| `npm run seed` | ❌ **OUI** - Supprime beaucoup de tables | Développement local uniquement |
| `npm run seed:todos-safe` | ✅ **NON** - Ajoute seulement | Production/Serveur |

## 🎯 Recommandation pour le Serveur

**NE JAMAIS exécuter `npm run seed` sur le serveur de production !**

Utilisez uniquement:
- ✅ `npm run seed:todos-safe` - Pour ajouter les todos manquants
- ✅ Les migrations SQL - Pour les changements de structure
- ✅ Les scripts de seed spécifiques (academy, etc.) - Si nécessaire

## 🔍 Vérifier avant d'exécuter

Avant d'exécuter un seed, vérifiez toujours:
1. Quel script vous allez exécuter
2. Quelles tables seront affectées
3. Si des données seront supprimées

En cas de doute, **ne pas exécuter** et demander confirmation.
