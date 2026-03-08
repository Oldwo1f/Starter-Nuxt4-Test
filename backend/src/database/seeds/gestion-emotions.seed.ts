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
    title: 'Gestion des émotions',
    description: 'Formation complète sur la gestion des émotions, comprenant des modules sur la compréhension des émotions, leur régulation, et leur utilisation pour améliorer votre bien-être.',
    isPublished: true,
    order: 0,
  },
  modules: [
    {
      title: 'Introduction',
      description: 'Introduction à la formation sur la gestion des émotions',
      order: 0,
      videos: [
        { filename: 'M0 A_ INTRO.mp4', title: 'Introduction', description: 'Introduction à la formation sur la gestion des émotions', order: 0 },
        { filename: 'M0 B_ Definition VF.mp4', title: 'Définition', description: 'Définition des émotions et de leur importance dans notre vie quotidienne', order: 1 },
      ],
    },
    {
      title: 'Module 1 : Comprendre les émotions',
      description: 'Découvrez les fonctions adaptatives, sociales et motivationnelles des émotions, ainsi que leur lien avec le cerveau et le stress.',
      order: 1,
      videos: [
        { filename: 'M1-1 VF Fonction adaptative.mp4', title: 'Fonction adaptative', description: 'Comprenez comment les émotions nous aident à nous adapter à notre environnement', order: 0 },
        { filename: 'M1-2 Fonction sociale VF .mp4', title: 'Fonction sociale', description: 'Découvrez le rôle des émotions dans nos interactions sociales', order: 1 },
        { filename: 'M1-3 VF Fonction motivationnelle.mp4', title: 'Fonction motivationnelle', description: 'Explorez comment les émotions nous motivent à agir', order: 2 },
        { filename: 'M1-4 VF Cerveau et émotion.mp4', title: 'Cerveau et émotion', description: 'Apprenez les mécanismes neurologiques des émotions', order: 3 },
        { filename: 'M1-5 VF Profil émotionnel .mp4', title: 'Profil émotionnel', description: 'Identifiez votre propre profil émotionnel', order: 4 },
        { filename: 'M1-6-1 VF Mieux comprendre le stress.mp4', title: 'Mieux comprendre le stress', description: 'Approfondissez votre compréhension du stress et de ses mécanismes', order: 5 },
        { filename: 'M1-6-2 les conséquences du stress VF.mp4', title: 'Les conséquences du stress', description: 'Découvrez les impacts du stress sur votre santé et votre bien-être', order: 6 },
        { filename: 'M1-6-3 VF Stresseurs ext int VF.mp4', title: 'Stresseurs extérieurs et intérieurs', description: 'Identifiez les sources de stress externes et internes', order: 7 },
      ],
    },
    {
      title: 'Module 2 : Réguler les émotions',
      description: 'Apprenez des techniques pratiques pour réguler vos émotions, notamment la méthode RAIN et d\'autres outils de boîte à outils.',
      order: 2,
      videos: [
        { filename: 'M2-1 VF Intro.mp4', title: 'Introduction', description: 'Introduction aux techniques de régulation émotionnelle', order: 0 },
        { filename: 'M2-2 VF Cycle des émotions.mp4', title: 'Cycle des émotions', description: 'Comprenez le cycle naturel des émotions et comment le gérer', order: 1 },
        { filename: 'M2-3 VF Méthode RAIN.mp4', title: 'Méthode RAIN', description: 'Apprenez la méthode RAIN (Reconnaître, Accepter, Investiguer, Nourrir) pour gérer vos émotions', order: 2 },
        { filename: 'M2-4 VF Boite à outil .mp4', title: 'Boîte à outils', description: 'Découvrez une boîte à outils complète pour réguler vos émotions', order: 3 },
        { filename: 'M2-5 VF BAO Emotion Perception #2.mp4', title: 'BAO - Emotion Perception', description: 'Outils pratiques pour améliorer votre perception des émotions', order: 4 },
        { filename: 'M2-7 VF BAO Emotion interpretation 2.mp4', title: 'BAO - Emotion Interpretation', description: 'Techniques pour interpréter et comprendre vos émotions', order: 5 },
        { filename: 'M2-9 VF Etalonnage emotionnel.mp4', title: 'Étalonnage émotionnel', description: 'Apprenez à calibrer et ajuster vos réponses émotionnelles', order: 6 },
        { filename: 'M2-10 VF Equilibrage emotionnel.mp4', title: 'Équilibrage émotionnel', description: 'Techniques pour maintenir un équilibre émotionnel sain', order: 7 },
        { filename: 'M2-11 VF Emotion Actionmp4.mp4', title: 'Emotion Action', description: 'Transformez vos émotions en actions constructives', order: 8 },
      ],
    },
    {
      title: 'Module 3 : Conséquences des émotions',
      description: 'Explorez les conséquences des émotions sur votre vie quotidienne et votre bien-être.',
      order: 3,
      videos: [
        { filename: 'M3-1 VF Conséquences des émotions.mp4', title: 'Conséquences des émotions', description: 'Explorez les conséquences positives et négatives des émotions sur votre vie', order: 0 },
        { filename: 'M3-2 VF Conséquences des émotions_1.mp4', title: 'Conséquences des émotions (suite)', description: 'Approfondissez votre compréhension des impacts émotionnels', order: 1 },
      ],
    },
    {
      title: 'Module 4 : Mindset et optimisme',
      description: 'Développez un mindset positif, apprenez à échouer avec succès, à lâcher prise et cultiver l\'optimisme.',
      order: 4,
      videos: [
        { filename: 'M4-1 VF Mindset.mp4', title: 'Mindset', description: 'Développez un mindset positif et constructif pour mieux gérer vos émotions', order: 0 },
        { filename: 'M4-2 VF Echouer avec succès-_YouTube.mp4', title: 'Échouer avec succès', description: 'Apprenez à transformer les échecs en opportunités d\'apprentissage', order: 1 },
        { filename: 'M4-3 VF Lacher prise_YouTube.mp4', title: 'Lâcher prise', description: 'Techniques pour lâcher prise et accepter ce qui ne peut être changé', order: 2 },
        { filename: 'M4-4 VF Optimisme.mp4', title: 'Optimisme', description: 'Cultivez l\'optimisme et une vision positive de la vie', order: 3 },
      ],
    },
    {
      title: 'Module 5 : La roue de l\'équilibre',
      description: 'Découvrez la roue de l\'équilibre et apprenez à analyser votre équilibre de vie pour définir des objectifs de progrès.',
      order: 5,
      videos: [
        { filename: 'M5-1 VF La roue de l_équilibre.mp4', title: 'La roue de l\'équilibre', description: 'Découvrez la roue de l\'équilibre pour évaluer votre bien-être global', order: 0 },
        { filename: 'M5-2 VF Analyse de la roue.mp4', title: 'Analyse de la roue', description: 'Apprenez à analyser votre roue de l\'équilibre et identifier les axes à améliorer', order: 1 },
        { filename: 'M5-3 VF Objectif de progrès.mp4', title: 'Objectif de progrès', description: 'Définissez des objectifs de progrès concrets pour améliorer votre équilibre', order: 2 },
      ],
    },
    {
      title: 'Module 6 : Conclusion',
      description: 'Conclusion de la formation sur la gestion des émotions.',
      order: 6,
      videos: [
        { filename: 'M6-1 VF conclusion.mp4', title: 'Conclusion', description: 'Conclusion de la formation et récapitulatif des concepts clés', order: 0 },
      ],
    },
  ],
};

export async function seedGestionEmotions(dataSource: DataSource): Promise<void> {
  const courseRepository = dataSource.getRepository(Course);
  const moduleRepository = dataSource.getRepository(AcademyModule);
  const videoRepository = dataSource.getRepository(Video);

  // Chemin de base pour les vidéos
  const baseVideoPath = path.join(process.cwd(), 'uploads', 'academy', 'gestion des emotions');

  console.log('\n🎓 Seeding formation: Gestion des émotions\n');

  // Vérifier si la formation existe déjà
  const existingCourse = await courseRepository.findOne({
    where: { title: formationStructure.course.title },
  });

  if (existingCourse) {
    console.log('⚠ La formation "Gestion des émotions" existe déjà.');
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
  });

  const savedCourse = await courseRepository.save(course);
  console.log(`✓ Formation créée: ${savedCourse.title} (ID: ${savedCourse.id})`);

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

    // Déterminer le nom du dossier du module
    let moduleFolder: string;
    if (moduleData.order === 0) {
      moduleFolder = 'introduction';
    } else {
      moduleFolder = `module ${moduleData.order}`;
    }

    // Créer les vidéos du module
    for (const videoData of moduleData.videos) {
      const videoFilePath = path.join(baseVideoPath, moduleFolder, videoData.filename);
      const relativeVideoPath = `/uploads/academy/gestion des emotions/${moduleFolder}/${videoData.filename}`;

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

  console.log(`\n✅ Formation "Gestion des émotions" créée avec succès!`);
  console.log(`   - ${formationStructure.modules.length} modules`);
  const totalVideos = formationStructure.modules.reduce((sum, m) => sum + m.videos.length, 0);
  console.log(`   - ${totalVideos} vidéos`);
}
