import '../../load-env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Video } from '../../entities/video.entity';
import { AcademyModule } from '../../entities/module.entity';
import { Course } from '../../entities/course.entity';

export async function updateVideoPaths(dataSource: DataSource): Promise<void> {
  const courseRepository = dataSource.getRepository(Course);
  const videoRepository = dataSource.getRepository(Video);

  console.log('\n🔗 Mise à jour des chemins des vidéos...\n');

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
    // Si le chemin ne commence pas par /uploads/, l'ajouter
    if (video.videoFile && !video.videoFile.startsWith('/uploads/')) {
      // Si le chemin commence par "academy/", ajouter /uploads/ devant
      if (video.videoFile.startsWith('academy/')) {
        video.videoFile = `/uploads/${video.videoFile}`;
        await videoRepository.save(video);
        console.log(`✓ ${video.title}: ${video.videoFile}`);
        updated++;
      } else {
        console.log(`⚠ Format de chemin inattendu pour: ${video.title} (${video.videoFile})`);
        skipped++;
      }
    } else {
      console.log(`⊘ ${video.title}: chemin déjà correct`);
      skipped++;
    }
  }

  console.log(`\n✅ Mise à jour terminée:`);
  console.log(`   - ${updated} vidéo(s) mise(s) à jour`);
  if (skipped > 0) {
    console.log(`   - ${skipped} vidéo(s) déjà correcte(s) ou ignorée(s)`);
  }
}
