import { DataSource } from 'typeorm';
import { Goodie } from '../../entities/goodie.entity';

export async function seedGoodies(dataSource: DataSource): Promise<void> {
  const goodieRepository = dataSource.getRepository(Goodie);

  // Clear existing goodies
  try {
    await dataSource.query('DELETE FROM goodies');
    console.log('✓ Existing goodies cleared');
  } catch (error) {
    console.log('Note: Goodies table will be created automatically');
  }

  // Liste des goodies à créer
  const goodies = [
    {
      name: 'Guide de la Culture Polynésienne',
      link: 'https://example.com/guide-culture',
      description: 'Un guide complet sur la culture polynésienne, ses traditions et ses valeurs.',
      offeredByName: 'Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      isPublic: true,
    },
    {
      name: 'Cours de Langue Tahitienne',
      link: 'https://example.com/cours-tahitien',
      description: 'Apprenez les bases de la langue tahitienne avec nos cours interactifs.',
      offeredByName: 'Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      isPublic: true,
    },
    {
      name: 'Recettes Traditionnelles',
      link: null,
      description: 'Découvrez les recettes traditionnelles polynésiennes transmises de génération en génération.',
      offeredByName: 'Communauté Nuna\'a',
      offeredByLink: null,
      isPublic: true,
    },
    {
      name: 'Accès VIP aux Événements',
      link: null,
      description: 'Accès prioritaire et privilégié à tous les événements Te Natira\'a et autres rassemblements.',
      offeredByName: 'Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      isPublic: false, // Réservé aux membres connectés
    },
    {
      name: 'Mentorat Entrepreneurial',
      link: null,
      description: 'Sessions de mentorat personnalisées pour les entrepreneurs polynésiens.',
      offeredByName: 'Naho - Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      isPublic: false, // Réservé aux membres connectés
    },
    {
      name: 'Bibliothèque Numérique',
      link: 'https://example.com/bibliotheque',
      description: 'Accès à une bibliothèque numérique riche en ressources sur la Polynésie.',
      offeredByName: 'Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      isPublic: true,
    },
  ];

  // Créer les goodies
  for (const goodieData of goodies) {
    const goodie = goodieRepository.create({
      name: goodieData.name,
      link: goodieData.link,
      description: goodieData.description,
      imageUrl: null, // Les images seront ajoutées via l'interface admin
      offeredByName: goodieData.offeredByName,
      offeredByLink: goodieData.offeredByLink,
      isPublic: goodieData.isPublic,
      createdById: null, // Pas de créateur spécifique pour les seeds
    });

    await goodieRepository.save(goodie);
    const visibility = goodieData.isPublic ? 'Public' : 'Privé';
    console.log(`  ✓ Created: ${goodie.name} (${visibility})`);
  }

  console.log(`✓ Created ${goodies.length} goodies`);
}
