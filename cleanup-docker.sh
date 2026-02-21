#!/bin/bash

# Script pour nettoyer Docker et libérer de l'espace disque

set -e

echo "🧹 Nettoyage Docker pour libérer de l'espace disque"
echo "===================================================="
echo ""

# Afficher l'espace avant
echo "📊 Espace disque AVANT nettoyage :"
df -h / | grep -E "Filesystem|/dev/" | awk '{print "  " $4 " disponible (" $5 " utilisé)"}'

echo ""
echo "📦 État Docker AVANT nettoyage :"
docker system df

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Nettoyer les images Docker inutilisées (non taguées)
echo "1️⃣  Nettoyage des images Docker inutilisées (dangling images)..."
docker image prune -f
echo "✅ Images inutilisées nettoyées"

# 2. Nettoyer les containers arrêtés
echo ""
echo "2️⃣  Nettoyage des containers arrêtés..."
docker container prune -f
echo "✅ Containers arrêtés nettoyés"

# 3. Nettoyer les volumes inutilisés
echo ""
echo "3️⃣  Nettoyage des volumes inutilisés..."
docker volume prune -f
echo "✅ Volumes inutilisés nettoyés"

# 4. Nettoyer les réseaux inutilisés
echo ""
echo "4️⃣  Nettoyage des réseaux inutilisés..."
docker network prune -f
echo "✅ Réseaux inutilisés nettoyés"

# 5. Nettoyage du build cache (peut libérer beaucoup d'espace)
echo ""
echo "5️⃣  Nettoyage du cache de build Docker..."
docker builder prune -f
echo "✅ Cache de build nettoyé"

# 6. Nettoyage complet (optionnel mais plus agressif)
echo ""
read -p "Voulez-vous faire un nettoyage COMPLET (toutes les images non utilisées) ? (o/N) : " -n 1 -r
echo ""
if [[ $REPLY =~ ^[OoYy]$ ]]; then
    echo "🧹 Nettoyage complet du système Docker..."
    docker system prune -a -f
    echo "✅ Nettoyage complet terminé"
else
    echo "⏭️  Nettoyage complet ignoré (images en cours d'utilisation conservées)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Afficher l'espace après
echo "📊 Espace disque APRÈS nettoyage :"
df -h / | grep -E "Filesystem|/dev/" | awk '{print "  " $4 " disponible (" $5 " utilisé)"}'

echo ""
echo "📦 État Docker APRÈS nettoyage :"
docker system df

echo ""
echo "✅ Nettoyage terminé !"
