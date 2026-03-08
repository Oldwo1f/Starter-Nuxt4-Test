import '../../load-env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { Course } from '../../entities/course.entity';
import { AcademyModule } from '../../entities/module.entity';
import { Video } from '../../entities/video.entity';
import * as path from 'path';

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

/**
 * Structure des modules et vidéos de la formation
 */
const formationStructure = {
  course: {
    title: 'Tressage de coquillage',
    description: 'Formation complète sur l\'art du tressage de coquillage tahitien avec Mama Tehea. Apprenez à créer des bijoux traditionnels : bagues, bracelets et ras de cou en coquillage.\n\nHommage à Mama Tehea qui nous a malheureusement quittés avant de nous transmettre tout son savoir. Cette formation préserve et partage les techniques précieuses qu\'elle nous a léguées.',
    isPublished: true,
    order: 1,
  },
  modules: [
    {
      title: 'Module 1 : Tressage de bague',
      description: 'Apprenez les techniques de base pour créer une bague en coquillage tressé avec Mama Tehea.',
      order: 0,
      videos: [
        { filename: 'tressage_bague.mp4', title: 'Tressage de bague', description: 'Découvrez les techniques traditionnelles de tressage pour créer une bague en coquillage', order: 0 },
      ],
    },
    {
      title: 'Module 2 : Tressage de bracelet',
      description: 'Maîtrisez l\'art du tressage de bracelet en coquillage avec les méthodes transmises par Mama Tehea.',
      order: 1,
      videos: [
        { filename: 'tressage_bracelet_coquillage.mp4', title: 'Tressage de bracelet en coquillage', description: 'Apprenez à confectionner un bracelet en coquillage tressé selon les techniques traditionnelles tahitiennes', order: 0 },
      ],
    },
    {
      title: 'Module 3 : Tressage de ras de cou',
      description: 'Perfectionnez-vous dans la création de ras de cou en coquillage tressé avec les enseignements de Mama Tehea.',
      order: 2,
      videos: [
        { filename: 'tressage_ra_de_cou.mp4', title: 'Tressage de ras de cou', description: 'Maîtrisez la confection d\'un ras de cou en coquillage tressé, bijou traditionnel polynésien', order: 0 },
      ],
    },
  ],
};

export async function seedTressageCoquillage(dataSource: DataSource): Promise<void> {
  const courseRepository = dataSource.getRepository(Course);
  const moduleRepository = dataSource.getRepository(AcademyModule);
  const videoRepository = dataSource.getRepository(Video);

  // Chemin de base pour les vidéos
  const baseVideoPath = path.join(process.cwd(), 'uploads', 'academy', 'tressage coquillage');

  console.log('\n🎓 Seeding formation: Tressage de coquillage\n');

  // Vérifier si la formation existe déjà
  const existingCourse = await courseRepository.findOne({
    where: { title: formationStructure.course.title },
  });

  if (existingCourse) {
    console.log('⚠ La formation "Tressage de coquillage" existe déjà.');
    console.log('   Pour la recréer, supprimez-la d\'abord depuis l\'interface admin ou la base de données.');
    return;
  }

  // Créer la formation
  const course = courseRepository.create({
    title: formationStructure.course.title,
    description: formationStructure.course.description,
    isPublished: formationStructure.course.isPublished,
    order: formationStructure.course.order,
    thumbnailImage: null,
    instructorFirstName: 'Mama',
    instructorLastName: 'Tehea',
    instructorTitle: 'Maître artisan en tressage de coquillage',
    instructorAvatar: null,
    instructorLink: null,
  });

  const savedCourse = await courseRepository.save(course);
  console.log(`✓ Formation créée: ${savedCourse.title} (ID: ${savedCourse.id})`);
  console.log(`  Auteur: ${savedCourse.instructorFirstName} ${savedCourse.instructorLastName}`);

  // Créer les modules et leurs vidéos
  for (const moduleData of formationStructure.modules) {
    const module = moduleRepository.create({
      courseId: savedCourse.id,
      title: moduleData.title,
      description: moduleData.description,
      order: moduleData.order,
    });

    const savedModule = await moduleRepository.save(module);
    console.log(`\n  📦 Module créé: ${savedModule.title} (ID: ${savedModule.id})`);

    // Créer les vidéos du module
    for (const videoData of moduleData.videos) {
      const videoFilePath = path.join(baseVideoPath, videoData.filename);
      const relativeVideoPath = `/uploads/academy/tressage coquillage/${videoData.filename}`;

      // Vérifier que le fichier existe
      if (!existsSync(videoFilePath)) {
        console.warn(`  ⚠ Fichier vidéo introuvable: ${videoFilePath}`);
      }

      // Extraire la durée de la vidéo
      let duration: number | null = null;
      if (existsSync(videoFilePath)) {
        duration = getVideoDuration(videoFilePath);
        if (duration) {
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          console.log(`    🎬 ${videoData.title} - ${minutes}m${seconds}s`);
        } else {
          console.log(`    🎬 ${videoData.title} - durée non disponible`);
        }
      } else {
        console.log(`    🎬 ${videoData.title} - fichier non trouvé`);
      }

      const video = videoRepository.create({
        moduleId: savedModule.id,
        title: videoData.title,
        description: videoData.description || null,
        videoFile: relativeVideoPath,
        duration: duration,
        order: videoData.order,
      });

      await videoRepository.save(video);
    }

    console.log(`  ✓ ${moduleData.videos.length} vidéo(s) créée(s) pour le module`);
  }

  console.log(`\n✅ Formation "Tressage de coquillage" créée avec succès!`);
  console.log(`   - ${formationStructure.modules.length} modules`);
  const totalVideos = formationStructure.modules.reduce((sum, m) => sum + m.videos.length, 0);
  console.log(`   - ${totalVideos} vidéos`);
  console.log(`   - Auteur: ${savedCourse.instructorFirstName} ${savedCourse.instructorLastName}`);
}
