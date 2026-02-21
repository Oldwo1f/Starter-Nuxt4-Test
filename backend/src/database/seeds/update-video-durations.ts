import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { Video } from '../../entities/video.entity';
import * as path from 'path';

/**
 * Extrait la durée d'une vidéo en secondes
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
    return null;
  }
}

export async function updateVideoDurations(dataSource: DataSource): Promise<void> {
  const videoRepository = dataSource.getRepository(Video);

  console.log('\n🎬 Mise à jour des durées des vidéos...\n');

  const videos = await videoRepository.find();
  const baseUploadPath = path.join(process.cwd(), 'uploads');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const video of videos) {
    // Ignorer les vidéos YouTube (pas de fichier à vérifier)
    if (video.videoUrl) {
      console.log(`⊘ ${video.title}: vidéo YouTube (pas de durée à extraire)`);
      skipped++;
      continue;
    }

    // Vérifier qu'un fichier est présent
    if (!video.videoFile) {
      console.log(`⚠ ${video.title}: aucun fichier vidéo ni URL YouTube`);
      skipped++;
      continue;
    }

    const videoPath = path.join(baseUploadPath, video.videoFile);

    if (!existsSync(videoPath)) {
      console.log(`⚠ Fichier introuvable: ${video.videoFile}`);
      notFound++;
      continue;
    }

    // Si la durée existe déjà, on peut la mettre à jour quand même
    const duration = getVideoDuration(videoPath);

    if (duration) {
      video.duration = duration;
      await videoRepository.save(video);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      console.log(`✓ ${video.title}: ${minutes}m${seconds}s`);
      updated++;
    } else {
      console.log(`⚠ Impossible d'extraire la durée: ${video.title}`);
      skipped++;
    }
  }

  console.log(`\n✅ Mise à jour terminée:`);
  console.log(`   - ${updated} vidéo(s) mise(s) à jour`);
  if (skipped > 0) {
    console.log(`   - ${skipped} vidéo(s) ignorée(s) (durée non disponible)`);
  }
  if (notFound > 0) {
    console.log(`   - ${notFound} fichier(s) introuvable(s)`);
  }
}
