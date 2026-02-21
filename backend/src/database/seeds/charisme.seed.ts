import 'dotenv/config';
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
 * Structure des modules et vidéos de la formation Charisme
 */
const formationStructure = {
  course: {
    title: 'Charisme',
    description: 'Formation complète sur le développement du charisme, comprenant des modules sur la compréhension du charisme, les profils de personnalité, les compétences relationnelles et le développement personnel.',
    isPublished: true,
    order: 1,
  },
  modules: [
    {
      title: 'Introduction',
      description: 'Introduction à la formation sur le charisme',
      order: 0,
      videos: [
        { 
          filename: '#0 Présentation VF.mp4', 
          title: 'Présentation', 
          description: 'Introduction à la formation sur le charisme et présentation des objectifs pédagogiques', 
          order: 0 
        },
      ],
    },
    {
      title: 'Module 1 : Comprendre le charisme',
      description: 'Découvrez ce qu\'est le charisme, évaluez votre niveau actuel et apprenez les bonnes pratiques pour développer votre charisme.',
      order: 1,
      videos: [
        { 
          filename: '#1-1 Définition VF.mp4', 
          title: 'Définition du charisme', 
          description: 'Comprenez ce qu\'est réellement le charisme et ses composantes essentielles', 
          order: 0 
        },
        { 
          filename: '#1-2 Test charisme VF.mp4', 
          title: 'Test de charisme', 
          description: 'Évaluez votre niveau actuel de charisme grâce à un test pratique', 
          order: 1 
        },
        { 
          filename: '#1-3 do et don_t du charisme VF.mp4', 
          title: 'Do\'s et Don\'ts du charisme', 
          description: 'Découvrez les bonnes pratiques à adopter et les erreurs à éviter pour développer votre charisme', 
          order: 2 
        },
      ],
    },
    {
      title: 'Module 2 : L\'animal totem',
      description: 'Explorez le concept de l\'animal totem et son lien avec votre charisme personnel.',
      order: 2,
      videos: [
        { 
          filename: '#2 l_animal totem VF.mp4', 
          title: 'L\'animal totem', 
          description: 'Découvrez votre animal totem et comment il peut influencer votre charisme et votre présence', 
          order: 0 
        },
      ],
    },
    {
      title: 'Module 3 : La roue du charisme',
      description: 'Comprenez les différents aspects et dimensions du charisme à travers la roue du charisme.',
      order: 3,
      videos: [
        { 
          filename: '#3 la roue du charismeVF.mp4', 
          title: 'La roue du charisme', 
          description: 'Explorez les différentes dimensions du charisme et comment elles s\'articulent ensemble', 
          order: 0 
        },
      ],
    },
    {
      title: 'Module 4 : Profils de personnalité DISC',
      description: 'Découvrez votre profil de personnalité DISC et comment chaque profil peut développer son charisme de manière unique.',
      order: 4,
      videos: [
        { 
          filename: '#4-1 Test DISCVF.mp4', 
          title: 'Test DISC', 
          description: 'Identifiez votre profil de personnalité DISC et comprenez ses caractéristiques', 
          order: 0 
        },
        { 
          filename: '#4-2 bleuVF.mp4', 
          title: 'Profil Bleu', 
          description: 'Découvrez les caractéristiques du profil bleu et comment développer votre charisme en tant que personne analytique', 
          order: 1 
        },
        { 
          filename: '#4-3rougeVF.mp4', 
          title: 'Profil Rouge', 
          description: 'Explorez les traits du profil rouge et les moyens d\'amplifier votre charisme en tant que leader naturel', 
          order: 2 
        },
        { 
          filename: '#4-4JauneVF.mp4', 
          title: 'Profil Jaune', 
          description: 'Comprenez le profil jaune et comment votre enthousiasme peut devenir un atout charismatique', 
          order: 3 
        },
        { 
          filename: '#4-5VertVF.mp4', 
          title: 'Profil Vert', 
          description: 'Découvrez les qualités du profil vert et comment votre empathie renforce votre charisme', 
          order: 4 
        },
        { 
          filename: '#4-6Facteurs charismeVF.mp4', 
          title: 'Facteurs du charisme', 
          description: 'Synthèse des facteurs clés qui composent le charisme selon les différents profils', 
          order: 5 
        },
      ],
    },
    {
      title: 'Module 5 : Compétences relationnelles',
      description: 'Développez vos compétences relationnelles essentielles : assertivité, écoute, empathie, estime de soi et communication.',
      order: 5,
      videos: [
        { 
          filename: '#5-1 IntroVF.mp4', 
          title: 'Introduction', 
          description: 'Introduction aux compétences relationnelles fondamentales pour le charisme', 
          order: 0 
        },
        { 
          filename: '#5-2 AssertiviteVF.mp4', 
          title: 'Assertivité', 
          description: 'Apprenez à exprimer vos besoins et opinions de manière claire et respectueuse', 
          order: 1 
        },
        { 
          filename: '#5-3 Test GordonVF.mp4', 
          title: 'Test Gordon', 
          description: 'Évaluez votre style de communication et votre capacité à résoudre les conflits', 
          order: 2 
        },
        { 
          filename: '#5-4 EcouteVF.mp4', 
          title: 'Écoute active', 
          description: 'Maîtrisez l\'art de l\'écoute active pour créer des connexions authentiques', 
          order: 3 
        },
        { 
          filename: '#5-5 EmpathieVF.mp4', 
          title: 'Empathie', 
          description: 'Développez votre capacité à comprendre et partager les émotions des autres', 
          order: 4 
        },
        { 
          filename: '#5-6 l_estime de soiVF.mp4', 
          title: 'L\'estime de soi', 
          description: 'Comprenez l\'importance de l\'estime de soi dans le développement du charisme', 
          order: 5 
        },
        { 
          filename: '#5-7 Renforcer l_esime de soiVF.mp4', 
          title: 'Renforcer l\'estime de soi', 
          description: 'Techniques pratiques pour renforcer votre estime de soi et votre confiance', 
          order: 6 
        },
        { 
          filename: '#5-8 Communication et affirmation de soiVF.mp4', 
          title: 'Communication et affirmation de soi', 
          description: 'Améliorez votre communication et apprenez à vous affirmer de manière charismatique', 
          order: 7 
        },
        { 
          filename: '#5-9 ConclusionVF.mp4', 
          title: 'Conclusion', 
          description: 'Conclusion du module sur les compétences relationnelles et synthèse des apprentissages', 
          order: 8 
        },
      ],
    },
    {
      title: 'Module 6 : Développement personnel et leadership',
      description: 'Approfondissez votre développement personnel : conscience de soi, gestion des émotions, responsabilité, optimisme et présence.',
      order: 6,
      videos: [
        { 
          filename: '#6-1 Conscience de soiVF.mp4', 
          title: 'Conscience de soi', 
          description: 'Développez votre conscience de soi pour mieux comprendre vos forces et vos axes d\'amélioration', 
          order: 0 
        },
        { 
          filename: '#6-2 Gestion des émotionsVF.mp4', 
          title: 'Gestion des émotions', 
          description: 'Apprenez à gérer vos émotions pour maintenir votre charisme en toutes circonstances', 
          order: 1 
        },
        { 
          filename: '#6-3 Prendre ses responsabilitéVF.mp4', 
          title: 'Prendre ses responsabilités', 
          description: 'Apprenez à assumer vos responsabilités et à transformer les défis en opportunités', 
          order: 2 
        },
        { 
          filename: '#6-4 Echouer avce succèsVF.mp4', 
          title: 'Échouer avec succès', 
          description: 'Transformez vos échecs en opportunités d\'apprentissage et de croissance', 
          order: 3 
        },
        { 
          filename: '#6-5 Faire de son mieuxVF.mp4', 
          title: 'Faire de son mieux', 
          description: 'Adoptez une approche d\'excellence personnelle et de dépassement de soi', 
          order: 4 
        },
        { 
          filename: '#6-6 La présenceVF.mp4', 
          title: 'La présence', 
          description: 'Développez votre capacité à être pleinement présent et à captiver l\'attention', 
          order: 5 
        },
        { 
          filename: '#6-7 L_optimismeVF.mp4', 
          title: 'L\'optimisme', 
          description: 'Cultivez l\'optimisme et une vision positive pour inspirer et motiver les autres', 
          order: 6 
        },
        { 
          filename: '#6-8 Assume ta vulnérabilitéVF.mp4', 
          title: 'Assumer sa vulnérabilité', 
          description: 'Apprenez à assumer votre vulnérabilité comme une force charismatique authentique', 
          order: 7 
        },
        { 
          filename: '#6-9 La plan d_actionVF.mp4', 
          title: 'Le plan d\'action', 
          description: 'Créez votre plan d\'action personnalisé pour continuer à développer votre charisme', 
          order: 8 
        },
      ],
    },
  ],
};

export async function seedCharisme(dataSource: DataSource): Promise<void> {
  const courseRepository = dataSource.getRepository(Course);
  const moduleRepository = dataSource.getRepository(AcademyModule);
  const videoRepository = dataSource.getRepository(Video);

  // Chemin de base pour les vidéos
  const baseVideoPath = path.join(process.cwd(), 'uploads', 'academy', 'charisme');

  console.log('\n🎓 Seeding formation: Charisme\n');

  // Vérifier si la formation existe déjà
  const existingCourse = await courseRepository.findOne({
    where: { title: formationStructure.course.title },
  });

  if (existingCourse) {
    console.log('⚠ La formation "Charisme" existe déjà.');
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
      const relativeVideoPath = `/uploads/academy/charisme/${moduleFolder}/${videoData.filename}`;

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

  console.log(`\n✅ Formation "Charisme" créée avec succès!`);
  console.log(`   - ${formationStructure.modules.length} modules`);
  const totalVideos = formationStructure.modules.reduce((sum, m) => sum + m.videos.length, 0);
  console.log(`   - ${totalVideos} vidéos`);
}
