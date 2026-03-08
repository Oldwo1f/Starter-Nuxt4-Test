import '../../load-env';
import { Client } from 'pg';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';

/**
 * Extrait la durée d'un fichier vidéo local avec ffprobe
 */
function getLocalVideoDuration(videoPath: string): number | null {
  try {
    // Essayer ffprobe d'abord
    try {
      const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 }
      );
      const duration = parseFloat(output.trim());
      if (!isNaN(duration) && duration > 0) {
        return Math.round(duration);
      }
    } catch (e) {
      // ffprobe non disponible, essayer ffmpeg
    }

    // Essayer ffmpeg comme alternative
    try {
      const output = execSync(
        `ffmpeg -i "${videoPath}" 2>&1 | grep Duration | cut -d ' ' -f 4 | sed s/,//`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 }
      );
      const timeStr = output.trim();
      if (timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 3) {
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          const seconds = parseFloat(parts[2]) || 0;
          return Math.round(hours * 3600 + minutes * 60 + seconds);
        }
      }
    } catch (e) {
      // ffmpeg non disponible non plus
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Détermine le chemin complet du fichier vidéo à partir du chemin relatif
 */
function getFullVideoPath(relativePath: string | null): string | null {
  if (!relativePath) return null;

  // Les chemins en DB peuvent être:
  // - /uploads/academy/... (avec / initial)
  // - uploads/academy/... (sans / initial)
  
  // Normaliser le chemin : enlever le / initial si présent
  let cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  
  // Si le chemin commence déjà par "uploads/", on l'utilise tel quel
  // Sinon, on ajoute "uploads/" devant
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }

  // Chemins possibles (dans l'ordre de priorité)
  const possibleBasePaths = [
    '/app', // Dans le container Docker (chemin de base)
    process.cwd(), // Répertoire de travail actuel
    path.join(process.cwd(), '..'), // Un niveau au-dessus
    '/var/www/nunaheritage/backend',
    '/var/www/nunaheritage',
  ];

  for (const basePath of possibleBasePaths) {
    const fullPath = path.join(basePath, cleanPath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Essayer aussi avec le chemin tel quel (au cas où c'est déjà un chemin absolu)
  if (relativePath.startsWith('/') && existsSync(relativePath)) {
    return relativePath;
  }

  return null;
}

async function updateVideoDurations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nunaheritage',
  });

  try {
    console.log('🔄 Mise à jour des durées des vidéos depuis les sources réelles...\n');
    
    await client.connect();
    console.log('✓ Connexion à la base de données établie\n');

    // Récupérer toutes les vidéos
    const result = await client.query(`
      SELECT id, title, "videoUrl", "videoFile", duration
      FROM videos
      ORDER BY id
    `);

    const videos = result.rows;
    console.log(`📹 ${videos.length} vidéo(s) trouvée(s)\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let noSource = 0;

    for (const video of videos) {
      try {
        console.log(`\n🎬 Vidéo ID ${video.id}: ${video.title}`);
        
        // Ignorer les vidéos YouTube (mise à jour manuelle)
        if (video.videoUrl) {
          console.log(`  📺 Vidéo YouTube - ignorée (mise à jour manuelle)`);
          skipped++;
          continue;
        }

        let newDuration: number | null = null;

        // Si c'est un fichier local
        if (video.videoFile) {
          console.log(`  📁 Recherche du fichier: ${video.videoFile}`);
          const fullPath = getFullVideoPath(video.videoFile);
          if (fullPath && existsSync(fullPath)) {
            console.log(`  ✓ Fichier trouvé: ${fullPath}`);
            newDuration = getLocalVideoDuration(fullPath);
            if (newDuration) {
              const minutes = Math.floor(newDuration / 60);
              const seconds = newDuration % 60;
              console.log(`  ✅ Durée extraite: ${minutes}m${seconds}s`);
            } else {
              console.log(`  ⚠ Impossible d'extraire la durée (ffprobe/ffmpeg non disponible?)`);
            }
          } else {
            console.log(`  ⚠ Fichier introuvable: ${video.videoFile}`);
            console.log(`     Chemin recherché: ${fullPath || 'non déterminé'}`);
          }
        }

        // Si aucun fichier disponible
        if (!video.videoFile) {
          console.log(`  ⚠ Aucun fichier vidéo disponible`);
          noSource++;
          continue;
        }

        // Si on n'a pas réussi à récupérer une durée
        if (!newDuration) {
          console.log(`  ⏭ Durée non récupérée, conservant la valeur actuelle`);
          skipped++;
          continue;
        }

        // Mettre à jour seulement si la durée a changé
        if (video.duration === newDuration) {
          console.log(`  ✓ Durée déjà à jour (${Math.floor(newDuration / 60)}m${newDuration % 60}s)`);
          skipped++;
          continue;
        }

        // Mettre à jour la durée dans la base de données
        await client.query(
          'UPDATE videos SET duration = $1, "updatedAt" = NOW() WHERE id = $2',
          [newDuration, video.id]
        );

        const minutes = Math.floor(newDuration / 60);
        const seconds = newDuration % 60;
        const oldDuration = video.duration 
          ? `${Math.floor(video.duration / 60)}m${video.duration % 60}s`
          : 'non définie';
        console.log(`  ✅ Durée mise à jour: ${oldDuration} → ${minutes}m${seconds}s`);
        updated++;
      } catch (error) {
        console.error(`  ❌ Erreur pour vidéo ID ${video.id}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RÉSUMÉ DE LA MISE À JOUR');
    console.log(`   ✅ Vidéos mises à jour: ${updated}`);
    console.log(`   ⏭ Vidéos ignorées (déjà à jour ou durée non récupérée): ${skipped}`);
    console.log(`   ⚠ Vidéos sans source: ${noSource}`);
    console.log(`   ❌ Erreurs: ${errors}`);

    await client.end();
    console.log('\n✅ Mise à jour terminée!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    await client.end();
    process.exit(1);
  }
}

updateVideoDurations();
