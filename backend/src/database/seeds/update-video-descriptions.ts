import '../../load-env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Video } from '../../entities/video.entity';
import { AcademyModule } from '../../entities/module.entity';
import { Course } from '../../entities/course.entity';

/**
 * Descriptions des vidéos par titre
 */
const videoDescriptions: Record<string, string> = {
  'Introduction': 'Introduction à la formation sur la gestion des émotions',
  'Définition': 'Définition des émotions et de leur importance dans notre vie quotidienne',
  'Fonction adaptative': 'Comprenez comment les émotions nous aident à nous adapter à notre environnement',
  'Fonction sociale': 'Découvrez le rôle des émotions dans nos interactions sociales',
  'Fonction motivationnelle': 'Explorez comment les émotions nous motivent à agir',
  'Cerveau et émotion': 'Apprenez les mécanismes neurologiques des émotions',
  'Profil émotionnel': 'Identifiez votre propre profil émotionnel',
  'Mieux comprendre le stress': 'Approfondissez votre compréhension du stress et de ses mécanismes',
  'Les conséquences du stress': 'Découvrez les impacts du stress sur votre santé et votre bien-être',
  'Stresseurs extérieurs et intérieurs': 'Identifiez les sources de stress externes et internes',
  'Cycle des émotions': 'Comprenez le cycle naturel des émotions et comment le gérer',
  'Méthode RAIN': 'Apprenez la méthode RAIN (Reconnaître, Accepter, Investiguer, Nourrir) pour gérer vos émotions',
  'Boîte à outils': 'Découvrez une boîte à outils complète pour réguler vos émotions',
  'BAO - Emotion Perception': 'Outils pratiques pour améliorer votre perception des émotions',
  'BAO - Emotion Interpretation': 'Techniques pour interpréter et comprendre vos émotions',
  'Étalonnage émotionnel': 'Apprenez à calibrer et ajuster vos réponses émotionnelles',
  'Équilibrage émotionnel': 'Techniques pour maintenir un équilibre émotionnel sain',
  'Emotion Action': 'Transformez vos émotions en actions constructives',
  'Conséquences des émotions': 'Explorez les conséquences positives et négatives des émotions sur votre vie',
  'Conséquences des émotions (suite)': 'Approfondissez votre compréhension des impacts émotionnels',
  'Mindset': 'Développez un mindset positif et constructif pour mieux gérer vos émotions',
  'Échouer avec succès': 'Apprenez à transformer les échecs en opportunités d\'apprentissage',
  'Lâcher prise': 'Techniques pour lâcher prise et accepter ce qui ne peut être changé',
  'Optimisme': 'Cultivez l\'optimisme et une vision positive de la vie',
  'La roue de l\'équilibre': 'Découvrez la roue de l\'équilibre pour évaluer votre bien-être global',
  'Analyse de la roue': 'Apprenez à analyser votre roue de l\'équilibre et identifier les axes à améliorer',
  'Objectif de progrès': 'Définissez des objectifs de progrès concrets pour améliorer votre équilibre',
  'Conclusion': 'Conclusion de la formation et récapitulatif des concepts clés',
};

export async function updateVideoDescriptions(dataSource: DataSource): Promise<void> {
  const courseRepository = dataSource.getRepository(Course);
  const videoRepository = dataSource.getRepository(Video);

  console.log('\n📝 Mise à jour des descriptions des vidéos...\n');

  // Trouver la formation "Gestion des émotions"
  const course = await courseRepository.findOne({
    where: { title: 'Gestion des émotions' },
  });

  if (!course) {
    console.log('⚠ La formation "Gestion des émotions" n\'a pas été trouvée.');
    return;
  }

  // Récupérer toutes les vidéos de la formation
  const videos = await videoRepository
    .createQueryBuilder('video')
    .innerJoin('video.academyModule', 'module')
    .where('module.courseId = :courseId', { courseId: course.id })
    .getMany();

  let updated = 0;
  let skipped = 0;

  for (const video of videos) {
    const description = videoDescriptions[video.title];

    if (description) {
      video.description = description;
      await videoRepository.save(video);
      console.log(`✓ ${video.title}: description mise à jour`);
      updated++;
    } else {
      console.log(`⚠ Description non trouvée pour: ${video.title}`);
      skipped++;
    }
  }

  console.log(`\n✅ Mise à jour terminée:`);
  console.log(`   - ${updated} vidéo(s) mise(s) à jour`);
  if (skipped > 0) {
    console.log(`   - ${skipped} vidéo(s) sans description correspondante`);
  }
}
