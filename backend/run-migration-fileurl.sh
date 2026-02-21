#!/bin/bash

# Script pour exécuter la migration fileUrl pour la table goodies
# Ce script ajoute la colonne fileUrl à la table goodies si elle n'existe pas

set -e

echo "🔄 Exécution de la migration: Ajout de la colonne fileUrl à la table goodies..."
echo ""

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le répertoire backend/"
    exit 1
fi

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé. Utilisation des valeurs par défaut."
fi

# Exécuter la migration
npm run migrate:fileurl-goodies

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration terminée avec succès!"
    echo "   La colonne fileUrl a été ajoutée à la table goodies."
else
    echo ""
    echo "❌ Erreur lors de l'exécution de la migration"
    exit 1
fi
