import { DataSource } from 'typeorm';
import { Category, CategoryType } from '../../entities/category.entity';

export async function seedCategories(dataSource: DataSource): Promise<void> {
  const categoryRepository = dataSource.getRepository(Category);

  // Clear existing categories
  try {
    await dataSource.query('DELETE FROM categories');
    console.log('✓ Existing categories cleared');
  } catch (error) {
    console.log('Note: Categories table will be created automatically');
  }

  // Categories principales pour Biens avec couleurs appropriées
  const bienCategories = [
    { name: 'Électronique', description: 'Appareils électroniques et informatiques', color: 'blue' }, // Bleu pour la technologie
    { name: 'Meubles', description: 'Meubles et décoration', color: 'amber' }, // Ambre pour le bois/meubles
    { name: 'Véhicules', description: 'Voitures, motos, vélos', color: 'red' }, // Rouge pour les véhicules
    { name: 'Vêtements', description: 'Vêtements et accessoires', color: 'pink' }, // Rose pour la mode
    { name: 'Outils', description: 'Outils et équipements', color: 'orange' }, // Orange pour les outils
    { name: 'Livres', description: 'Livres et documents', color: 'indigo' }, // Indigo pour la connaissance
    { name: 'Jouets', description: 'Jouets et jeux', color: 'yellow' }, // Jaune pour la joie/enfants
    { name: 'Alimentation', description: 'Produits alimentaires', color: 'lime' }, // Vert clair pour la nourriture
    { name: 'Autre', description: 'Autres biens', color: 'gray' }, // Gris neutre
  ];

  // Categories principales pour Services avec couleurs appropriées
  const serviceCategories = [
    { name: 'Réparation', description: 'Services de réparation', color: 'orange' }, // Orange pour la réparation
    { name: 'Transport', description: 'Services de transport', color: 'cyan' }, // Cyan pour le transport
    { name: 'Formation', description: 'Formations et cours', color: 'purple' }, // Violet pour l'éducation
    { name: 'Cuisine', description: 'Services culinaires', color: 'rose' }, // Rose pour la cuisine
    { name: 'Jardinage', description: 'Services de jardinage', color: 'green' }, // Vert pour la nature
    { name: 'Nettoyage', description: 'Services de nettoyage', color: 'teal' }, // Turquoise pour la propreté
    { name: 'Bricolage', description: 'Services de bricolage', color: 'violet' }, // Violet pour le bricolage
    { name: 'Bien-être', description: 'Services de bien-être', color: 'fuchsia' }, // Fuchsia pour le bien-être
    { name: 'Autre', description: 'Autres services', color: 'slate' }, // Gris ardoise neutre
  ];

  // Create or update bien categories
  let bienCreated = 0;
  let bienUpdated = 0;
  let bienSkipped = 0;
  for (const catData of bienCategories) {
    // Check if category already exists
    const existing = await categoryRepository.findOne({
      where: {
        name: catData.name,
        type: CategoryType.BIEN,
      },
    });

    if (!existing) {
      const category = categoryRepository.create({
        name: catData.name,
        description: catData.description,
        type: CategoryType.BIEN,
        color: catData.color || null,
        parentCategoryId: null,
      });
      await categoryRepository.save(category);
      console.log(`✓ Category created: ${catData.name} (Bien) - color: ${catData.color}`);
      bienCreated++;
    } else {
      // Update existing category with color if it doesn't have one or if it's different
      if (existing.color !== catData.color) {
        existing.color = catData.color || null;
        existing.description = catData.description;
        await categoryRepository.save(existing);
        console.log(`✓ Category updated: ${catData.name} (Bien) - color: ${catData.color}`);
        bienUpdated++;
      } else {
        bienSkipped++;
      }
    }
  }

  // Create or update service categories
  let serviceCreated = 0;
  let serviceUpdated = 0;
  let serviceSkipped = 0;
  for (const catData of serviceCategories) {
    // Check if category already exists
    const existing = await categoryRepository.findOne({
      where: {
        name: catData.name,
        type: CategoryType.SERVICE,
      },
    });

    if (!existing) {
      const category = categoryRepository.create({
        name: catData.name,
        description: catData.description,
        type: CategoryType.SERVICE,
        color: catData.color || null,
        parentCategoryId: null,
      });
      await categoryRepository.save(category);
      console.log(`✓ Category created: ${catData.name} (Service) - color: ${catData.color}`);
      serviceCreated++;
    } else {
      // Update existing category with color if it doesn't have one or if it's different
      if (existing.color !== catData.color) {
        existing.color = catData.color || null;
        existing.description = catData.description;
        await categoryRepository.save(existing);
        console.log(`✓ Category updated: ${catData.name} (Service) - color: ${catData.color}`);
        serviceUpdated++;
      } else {
        serviceSkipped++;
      }
    }
  }

  console.log(`✓ Categories summary:`);
  console.log(`  Biens: ${bienCreated} created, ${bienUpdated} updated, ${bienSkipped} skipped`);
  console.log(`  Services: ${serviceCreated} created, ${serviceUpdated} updated, ${serviceSkipped} skipped`);
  console.log(`  Total: ${bienCreated + serviceCreated} new categories, ${bienUpdated + serviceUpdated} updated`);
}
