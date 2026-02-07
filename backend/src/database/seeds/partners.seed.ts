import { DataSource } from 'typeorm';
import { Partner } from '../../entities/partner.entity';

export async function seedPartners(dataSource: DataSource): Promise<void> {
  const partnerRepository = dataSource.getRepository(Partner);

  // Clear existing partners
  try {
    await dataSource.query('DELETE FROM partners');
    console.log('✓ Existing partners cleared');
  } catch (error) {
    console.log('Note: Partners table will be created automatically');
  }

  // Liste des partenaires à créer
  const partners = [
    {
      name: 'Aito-flow',
      link: 'https://aito-flow.com',
    },
    {
      name: 'Akeo',
      link: null, // Pas de lien fourni
    },
    {
      name: 'Coach de la route',
      link: null, // Pas de lien fourni
    },
  ];

  // Créer les partenaires
  for (const partnerData of partners) {
    const partner = partnerRepository.create({
      name: partnerData.name,
      link: partnerData.link,
      bannerHorizontalUrl: null,
      bannerVerticalUrl: null,
    });

    await partnerRepository.save(partner);
    console.log(`  ✓ Created: ${partner.name}`);
  }

  console.log(`✓ Created ${partners.length} partners`);
}
