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
 * Structure de la formation Gestion des émotions
 */
const gestionEmotionsStructure = {
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

/**
 * Structure de la formation Tressage de coquillage
 */
const tressageCoquillageStructure = {
  course: {
    title: 'Tressage de coquillage',
    description: 'Formation complète sur l\'art du tressage de coquillage tahitien avec Mama Tehea. Apprenez à créer des bijoux traditionnels : bagues, bracelets et ras de cou en coquillage.\n\nHommage à Mama Tehea qui nous a malheureusement quittés avant de nous transmettre tout son savoir. Cette formation préserve et partage les techniques précieuses qu\'elle nous a léguées.',
    isPublished: true,
    order: 1,
    instructor: {
      firstName: 'Mama',
      lastName: 'Tehea',
      title: 'Maître artisan en tressage de coquillage',
      avatar: null,
      link: null,
    },
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

/**
 * Structure de la formation Charisme
 */
const charismeStructure = {
  course: {
    title: 'Charisme',
    description: 'Formation complète sur le développement du charisme, comprenant des modules sur la compréhension du charisme, les profils de personnalité, les compétences relationnelles et le développement personnel.',
    isPublished: true,
    order: 2,
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

/**
 * Structure de la formation Initiation à l'intelligence artificielle
 */
const initiationIAStructure = {
  course: {
    title: 'Initiation à l\'intelligence artificielle',
    description: 'Formation gratuite pour découvrir les bases de l\'intelligence artificielle et ses applications concrètes. Apprenez à maîtriser les outils d\'IA et à les intégrer dans vos processus métier.\n\nCette formation comprend deux modules : les bases de l\'IA et des exemples concrets d\'applications pratiques.',
    isPublished: true,
    order: 3,
  },
  modules: [
    {
      title: 'Module 1 : Les bases',
      description: 'Découvrez les fondamentaux de l\'intelligence artificielle : types de données, prompts, mémoire de l\'IA et génération d\'images.',
      order: 0,
      videos: [
        {
          videoUrl: 'https://www.youtube.com/watch?v=wKad9TskmGU',
          title: 'Débuter avec l\'IA #1 : Formats de Texte et Données Structurées',
          description: 'Comprendre les différents types de données et de texte utilisés en IA',
          duration: 1874,
          order: 0,
        },
        {
          videoUrl: 'https://www.youtube.com/watch?v=ZGkyl9g6Nmc',
          title: 'Débuter avec l\'IA #2 : Maîtrisez les Prompts',
          description: 'Maîtriser l\'art des prompts pour interagir avec l\'IA',
          duration: 1261,
          order: 1,
        },
        {
          videoUrl: 'https://www.youtube.com/watch?v=WRY5y0ECvn0',
          title: 'Débuter avec l\'IA #3 : la mémoire de l\'IA !',
          description: 'Explorer comment l\'IA gère et utilise la mémoire',
          duration: 805,
          order: 2,
        },
        {
          videoUrl: 'https://www.youtube.com/watch?v=-wMTIO7rSh0',
          title: 'Débuter avec l\'IA #4 : La Génération d\'Images',
          description: 'Découvrir les techniques de génération d\'images par IA',
          duration: 1452,
          order: 3,
        },
      ],
    },
    {
      title: 'Module 2 : Exemples concrets',
      description: 'Explorez des applications pratiques de l\'IA : récupération de prospects qualifiés et techniques pour booster l\'engagement.',
      order: 1,
      videos: [
        {
          videoUrl: 'https://www.youtube.com/watch?v=3WIatnUbc8Y',
          title: 'Concrètement L\'IA : Comment Récupérer une Liste de Prospects Qualifiés Sans Effort !',
          description: 'Techniques pour récupérer gratuitement une liste de prospects qualifiés',
          duration: 881,
          order: 0,
        },
        {
          videoUrl: 'https://www.youtube.com/watch?v=Ymtzo45NZuk',
          title: 'Concrètement l\'IA #2 : La Technique pour Obtenir des Réponses et Booster l\'Engagement !',
          description: 'Découvrez des techniques avancées pour améliorer l\'engagement avec l\'IA',
          duration: 1147,
          order: 1,
        },
      ],
    },
  ],
};

/**
 * Structure de la formation La fabrication du tapa
 */
const fabricationTapaStructure = {
  course: {
    title: 'La fabrication du tapa',
    description: 'Formation complète sur la fabrication traditionnelle du tapa polynésien. Découvrez les techniques ancestrales pour choisir l\'écorce appropriée et maîtriser le processus de fabrication de ce tissu traditionnel.\n\nCette formation comprend deux modules essentiels : le choix de l\'écorce et le processus de fabrication.',
    isPublished: true,
    order: 4,
  },
  modules: [
    {
      title: 'Module 1 : Les bases de la fabrication',
      description: 'Apprenez les fondamentaux de la fabrication du tapa : le choix de l\'écorce et le processus de fabrication traditionnel.',
      order: 0,
      videos: [
        {
          videoUrl: 'https://www.youtube.com/watch?v=6pixQ-QukM0',
          title: 'La fabrication du tapa: #1 quel écorce choisir',
          description: 'Découvrez comment choisir la bonne écorce pour la fabrication du tapa selon les techniques traditionnelles polynésiennes',
          duration: 429,
          order: 0,
        },
        {
          videoUrl: 'https://www.youtube.com/watch?v=2dEJOQpruOE',
          title: 'La fabrication du tapa: #2 le processus',
          description: 'Maîtrisez le processus complet de fabrication du tapa, étape par étape, selon les méthodes ancestrales',
          duration: 1059,
          order: 1,
        },
      ],
    },
  ],
};

/**
 * Type pour la structure d'une formation
 */
type CourseStructure = {
  course: {
    title: string;
    description: string;
    isPublished: boolean;
    order: number;
    instructor?: {
      firstName: string;
      lastName: string;
      title: string;
      avatar: string | null;
      link: string | null;
    };
  };
  modules: Array<{
    title: string;
    description: string;
    order: number;
    videos: Array<{
      filename?: string; // Pour les vidéos locales
      videoUrl?: string; // Pour les vidéos YouTube
      title: string;
      description: string;
      duration?: number; // Durée en secondes (pour les vidéos YouTube)
      order: number;
    }>;
  }>;
};

/**
 * Fonction générique pour créer une formation
 */
async function createCourse(
  dataSource: DataSource,
  structure: CourseStructure,
  baseVideoPath: string,
): Promise<void> {
  const courseRepository = dataSource.getRepository(Course);
  const moduleRepository = dataSource.getRepository(AcademyModule);
  const videoRepository = dataSource.getRepository(Video);

  console.log(`\n🎓 Seeding formation: ${structure.course.title}\n`);

  // Vérifier si la formation existe déjà
  const existingCourse = await courseRepository.findOne({
    where: { title: structure.course.title },
  });

  if (existingCourse) {
    console.log(`⚠ La formation "${structure.course.title}" existe déjà (ID: ${existingCourse.id}).`);
    console.log('   Pour la recréer, supprimez-la d\'abord depuis l\'interface admin ou la base de données.');
    return;
  }

  console.log(`   ✓ La formation "${structure.course.title}" n'existe pas encore, création en cours...`);

  // Créer la formation
  const courseData: any = {
    title: structure.course.title,
    description: structure.course.description,
    isPublished: structure.course.isPublished,
    order: structure.course.order,
    thumbnailImage: null,
  };

  // Ajouter les informations de l'instructeur si présentes
  if ('instructor' in structure.course && structure.course.instructor) {
    const instructor = structure.course.instructor as { firstName: string; lastName: string; title: string; avatar: string | null; link: string | null };
    courseData.instructorFirstName = instructor.firstName;
    courseData.instructorLastName = instructor.lastName;
    courseData.instructorTitle = instructor.title;
    courseData.instructorAvatar = instructor.avatar;
    courseData.instructorLink = instructor.link;
  }

  const course = courseRepository.create(courseData);
  const savedCourse = (await courseRepository.save(course)) as unknown as Course;
  console.log(`✓ Formation créée: ${savedCourse.title} (ID: ${savedCourse.id})`);
  
  if (savedCourse.instructorFirstName && savedCourse.instructorLastName) {
    console.log(`  Auteur: ${savedCourse.instructorFirstName} ${savedCourse.instructorLastName}`);
  }

  // Créer les modules et leurs vidéos
  for (const moduleData of structure.modules) {
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
    if (structure.course.title === 'Gestion des émotions' || structure.course.title === 'Charisme') {
      if (moduleData.order === 0) {
        moduleFolder = 'introduction';
      } else {
        moduleFolder = `module ${moduleData.order}`;
      }
    } else {
      // Pour tressage coquillage, les vidéos sont directement dans le dossier
      moduleFolder = '';
    }

    // Créer les vidéos du module
    for (const videoData of moduleData.videos) {
      // Gérer les vidéos YouTube
      if (videoData.videoUrl) {
        const duration = videoData.duration || null;
        if (duration) {
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          console.log(`    🎬 ${videoData.title} - ${minutes}m${seconds}s`);
        } else {
          console.log(`    🎬 ${videoData.title} - durée non disponible`);
        }

        try {
          const video = videoRepository.create({
            moduleId: savedModule.id,
            title: videoData.title,
            description: videoData.description || null,
            videoUrl: videoData.videoUrl,
            videoFile: null,
            duration: duration,
            order: videoData.order,
          });

          await videoRepository.save(video);
          console.log(`    ✓ Vidéo créée: ${videoData.title}`);
        } catch (error) {
          console.error(`    ❌ Erreur lors de la création de la vidéo "${videoData.title}":`, error);
          throw error;
        }
      } else if (videoData.filename) {
        // Gérer les vidéos locales
        let videoFilePath: string;
        let relativeVideoPath: string;

        if (structure.course.title === 'Gestion des émotions') {
          videoFilePath = path.join(baseVideoPath, 'gestion des emotions', moduleFolder, videoData.filename);
          relativeVideoPath = `/uploads/academy/gestion des emotions/${moduleFolder}/${videoData.filename}`;
        } else if (structure.course.title === 'Charisme') {
          videoFilePath = path.join(baseVideoPath, 'charisme', moduleFolder, videoData.filename);
          relativeVideoPath = `/uploads/academy/charisme/${moduleFolder}/${videoData.filename}`;
        } else {
          // Tressage coquillage
          videoFilePath = path.join(baseVideoPath, 'tressage coquillage', videoData.filename);
          relativeVideoPath = `/uploads/academy/tressage coquillage/${videoData.filename}`;
        }

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
          videoUrl: null,
          duration: duration,
          order: videoData.order,
        });

        await videoRepository.save(video);
      }
    }

    console.log(`  ✓ ${moduleData.videos.length} vidéo(s) créée(s) pour le module`);
  }

  console.log(`\n✅ Formation "${structure.course.title}" créée avec succès!`);
  console.log(`   - ${structure.modules.length} modules`);
  const totalVideos = structure.modules.reduce((sum, m) => sum + m.videos.length, 0);
  console.log(`   - ${totalVideos} vidéos`);
  if (savedCourse.instructorFirstName && savedCourse.instructorLastName) {
    console.log(`   - Auteur: ${savedCourse.instructorFirstName} ${savedCourse.instructorLastName}`);
  }
}

/**
 * Fonction principale pour seed toutes les formations
 */
export async function seedAcademyCourses(dataSource: DataSource): Promise<void> {
  const baseVideoPath = path.join(process.cwd(), 'uploads', 'academy');

  // Créer la formation Gestion des émotions
  await createCourse(dataSource, gestionEmotionsStructure, baseVideoPath);

  // Créer la formation Tressage de coquillage
  await createCourse(dataSource, tressageCoquillageStructure, baseVideoPath);

  // Créer la formation Charisme
  await createCourse(dataSource, charismeStructure, baseVideoPath);

  // Créer la formation Initiation à l'intelligence artificielle
  await createCourse(dataSource, initiationIAStructure, baseVideoPath);

  // Créer la formation La fabrication du tapa
  try {
    await createCourse(dataSource, fabricationTapaStructure, baseVideoPath);
  } catch (error) {
    console.error(`❌ Erreur lors de la création de la formation "La fabrication du tapa":`, error);
    throw error;
  }

  console.log('\n✅ Toutes les formations ont été créées avec succès!');
}
