import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { Course } from './backend/src/entities/course.entity';
import { AcademyModule } from './backend/src/entities/module.entity';
import { Video } from './backend/src/entities/video.entity';
import * as path from 'path';
import * as fs from 'fs';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [Course, AcademyModule, Video],
  synchronize: false,
});

/**
 * Extrait la durée d'une vidéo en secondes
 * Utilise ffprobe si disponible, sinon retourne null
 */
function getVideoDuration(videoPath: string): number | null {
  try {
    // Essayer ffprobe d'abord
    try {
      const output = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
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
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
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
    console.warn(`  ⚠ Impossible d'extraire la durée pour ${videoPath}`);
    return null;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Non définie';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m${secs}s`;
}

/**
 * Détermine le chemin complet du fichier vidéo à partir du chemin relatif stocké en DB
 */
function getFullVideoPath(relativePath: string | null, courseTitle: string): string | null {
  if (!relativePath) return null;

  // Les chemins relatifs commencent par /uploads/academy/
  // Dans le container Docker, les fichiers sont dans /app/uploads/
  // Sur la machine hôte, ils peuvent être dans différents emplacements
  
  // Enlever le / initial si présent
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;

  // Chemins possibles (dans l'ordre de priorité)
  const possibleBasePaths = [
    // Dans le container Docker (chemin standard)
    '/app/uploads',
    // Sur la machine hôte (chemins possibles)
    path.join(process.cwd(), 'backend', 'uploads'),
    path.join(process.cwd(), 'uploads'),
    '/var/www/nunaheritage/backend/uploads',
    '/var/www/nunaheritage/uploads',
    // Si on est dans le container backend
    path.join(process.cwd(), 'uploads'),
  ];

  for (const basePath of possibleBasePaths) {
    const fullPath = path.join(basePath, cleanPath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

async function updateVideoDurations() {
  try {
    console.log('🔄 Mise à jour des durées des vidéos...\n');
    
    await dataSource.initialize();
    console.log('✓ Connexion à la base de données établie\n');

    const courseRepository = dataSource.getRepository(Course);
    const moduleRepository = dataSource.getRepository(AcademyModule);
    const videoRepository = dataSource.getRepository(Video);

    // Les 3 formations à traiter
    const courseTitles = [
      'Gestion des émotions',
      'Charisme',
      'Tressage de coquillage'
    ];

    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const courseTitle of courseTitles) {
      console.log(`\n📚 Formation: ${courseTitle}`);
      console.log('─'.repeat(60));

      const course = await courseRepository.findOne({
        where: { title: courseTitle },
      });

      if (!course) {
        console.log(`⚠ Formation "${courseTitle}" non trouvée\n`);
        continue;
      }

      const modules = await moduleRepository.find({
        where: { courseId: course.id },
        order: { order: 'ASC' },
      });

      for (const module of modules) {
        console.log(`\n  📦 Module: ${module.title}`);

        const videos = await videoRepository.find({
          where: { moduleId: module.id },
          order: { order: 'ASC' },
        });

        for (const video of videos) {
          // Si la vidéo a déjà une durée, on peut la garder ou la mettre à jour
          // Ici, on va toujours essayer de mettre à jour depuis le fichier
          
          let duration: number | null = null;
          let videoFilePath: string | null = null;

          // Essayer d'abord avec videoFile
          if (video.videoFile) {
            videoFilePath = getFullVideoPath(video.videoFile, courseTitle);
            if (videoFilePath && existsSync(videoFilePath)) {
              duration = getVideoDuration(videoFilePath);
            }
          }

          // Si pas de fichier local ou pas de durée trouvée, et qu'on a une URL YouTube
          // On ne peut pas extraire la durée depuis YouTube sans API
          // Donc on garde la durée existante si elle existe
          if (duration === null && video.videoUrl && !video.videoFile) {
            console.log(`    ⏭ ${video.title} - URL YouTube (durée non mise à jour)`);
            totalSkipped++;
            continue;
          }

          if (duration === null) {
            if (!videoFilePath) {
              console.log(`    ⚠ ${video.title} - Fichier non trouvé`);
              totalErrors++;
            } else {
              console.log(`    ⚠ ${video.title} - Impossible d'extraire la durée`);
              totalErrors++;
            }
            continue;
          }

          // Mettre à jour la durée dans la base de données
          video.duration = duration;
          await videoRepository.save(video);

          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          console.log(`    ✅ ${video.title} - ${minutes}m${seconds}s`);
          totalUpdated++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RÉSUMÉ DE LA MISE À JOUR');
    console.log(`   ✅ Vidéos mises à jour: ${totalUpdated}`);
    console.log(`   ⏭ Vidéos ignorées (YouTube): ${totalSkipped}`);
    console.log(`   ⚠ Erreurs: ${totalErrors}`);

    await dataSource.destroy();
    console.log('\n✅ Mise à jour terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

updateVideoDurations();
