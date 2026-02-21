import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Course } from '../../entities/course.entity';

export async function updateTressageDescription(dataSource: DataSource): Promise<void> {
  const courseRepository = dataSource.getRepository(Course);

  console.log('\n📝 Mise à jour de la description de la formation "Tressage de coquillage"...\n');

  // Trouver la formation
  const course = await courseRepository.findOne({
    where: { title: 'Tressage de coquillage' },
  });

  if (!course) {
    console.log('⚠ La formation "Tressage de coquillage" n\'a pas été trouvée.');
    return;
  }

  // Nouvelle description avec l'hommage
  const newDescription = 'Formation complète sur l\'art du tressage de coquillage tahitien avec Mama Tehea. Apprenez à créer des bijoux traditionnels : bagues, bracelets et ras de cou en coquillage.\n\nHommage à Mama Tehea qui nous a malheureusement quittés avant de nous transmettre tout son savoir. Cette formation préserve et partage les techniques précieuses qu\'elle nous a léguées.';

  course.description = newDescription;
  await courseRepository.save(course);

  console.log('✓ Description mise à jour avec succès');
  console.log('\nNouvelle description:');
  console.log(newDescription);
}
