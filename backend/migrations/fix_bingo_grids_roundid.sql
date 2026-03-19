-- Migration: Supprime les grilles Bingo orphelines (roundId NULL)
-- À exécuter avant de redémarrer le backend pour permettre le SET NOT NULL sur roundId
-- Ces grilles sont invalides et ne peuvent pas être utilisées pour la détection du gagnant

DELETE FROM bingo_grids WHERE "roundId" IS NULL;
