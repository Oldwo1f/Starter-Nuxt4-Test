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
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop',
      offeredByName: 'Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      accessLevel: 'public' as const,
    },
    {
      name: 'Cours de Langue Tahitienne',
      link: 'https://example.com/cours-tahitien',
      description: 'Apprenez les bases de la langue tahitienne avec nos cours interactifs.',
      imageUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=800&fit=crop',
      offeredByName: 'Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      accessLevel: 'public' as const,
    },
    {
      name: 'Recettes Traditionnelles',
      link: null,
      description: 'Découvrez les recettes traditionnelles polynésiennes transmises de génération en génération.',
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=800&fit=crop',
      offeredByName: 'Communauté Nuna\'a',
      offeredByLink: null,
      accessLevel: 'public' as const,
    },
    {
      name: 'Accès VIP aux Événements',
      link: null,
      description: 'Accès prioritaire et privilégié à tous les événements Te Natira\'a et autres rassemblements.',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=800&fit=crop',
      offeredByName: 'Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      accessLevel: 'vip' as const, // Réservé aux membres VIP
    },
    {
      name: 'Mentorat Entrepreneurial',
      link: null,
      description: 'Sessions de mentorat personnalisées pour les entrepreneurs polynésiens.',
      imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=800&fit=crop',
      offeredByName: 'Naho - Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      accessLevel: 'member' as const, // Réservé aux membres
    },
    {
      name: 'Bibliothèque Numérique',
      link: 'https://example.com/bibliotheque',
      description: 'Accès à une bibliothèque numérique riche en ressources sur la Polynésie.',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop',
      offeredByName: 'Nuna\'a Heritage',
      offeredByLink: 'https://nunaaheritage.aito-flow.com',
      accessLevel: 'public' as const,
    },
  ];

  // Créer les goodies
  for (const goodieData of goodies) {
    const goodie = goodieRepository.create({
      name: goodieData.name,
      link: goodieData.link,
      description: goodieData.description,
      imageUrl: goodieData.imageUrl,
      offeredByName: goodieData.offeredByName,
      offeredByLink: goodieData.offeredByLink,
      accessLevel: goodieData.accessLevel,
      createdById: null, // Pas de créateur spécifique pour les seeds
    });

    await goodieRepository.save(goodie);
    const levelLabels: Record<'public' | 'member' | 'premium' | 'vip', string> = {
      public: 'Public',
      member: 'Membre',
      premium: 'Premium',
      vip: 'VIP',
    };
    const visibility = levelLabels[goodieData.accessLevel] || 'Public';
    console.log(`  ✓ Created: ${goodie.name} (${visibility})`);
  }

  console.log(`✓ Created ${goodies.length} goodies`);
}
