#!/bin/bash

# Script pour libérer de l'espace disque

set -e

echo "🧹 Libération d'espace disque"
echo "=============================="
echo ""

# 1. Nettoyer les images Docker inutilisées
echo "1️⃣  Nettoyage des images Docker inutilisées..."
docker image prune -f
echo "✅ Images Docker nettoyées"

# 2. Nettoyer les containers arrêtés
echo ""
echo "2️⃣  Nettoyage des containers arrêtés..."
docker container prune -f
echo "✅ Containers nettoyés"

# 3. Nettoyer les volumes inutilisés
echo ""
echo "3️⃣  Nettoyage des volumes inutilisés..."
docker volume prune -f
echo "✅ Volumes nettoyés"

# 4. Nettoyer le système Docker complet (optionnel, plus agressif)
echo ""
read -p "Voulez-vous faire un nettoyage complet du système Docker ? (o/N) : " -n 1 -r
echo ""
if [[ $REPLY =~ ^[OoYy]$ ]]; then
    echo "🧹 Nettoyage complet du système Docker..."
    docker system prune -a -f --volumes
    echo "✅ Nettoyage complet terminé"
else
    echo "⏭️  Nettoyage complet ignoré"
fi

# 5. Afficher l'espace libéré
echo ""
echo "📊 Espace disque après nettoyage :"
df -h / | grep -E "Filesystem|/dev/" | awk '{print "  " $1 " : " $4 " disponible sur " $2 " (" $5 " utilisé)"}'

echo ""
echo "✅ Nettoyage terminé"
