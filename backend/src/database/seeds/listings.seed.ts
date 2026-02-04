import { DataSource } from 'typeorm';
import { Listing, ListingType, ListingStatus } from '../../entities/listing.entity';
import { User } from '../../entities/user.entity';
import { Location } from '../../entities/location.entity';
import { Category } from '../../entities/category.entity';

export async function seedListings(dataSource: DataSource): Promise<void> {
  const listingRepository = dataSource.getRepository(Listing);
  const userRepository = dataSource.getRepository(User);
  const locationRepository = dataSource.getRepository(Location);
  const categoryRepository = dataSource.getRepository(Category);

  // Clear existing listings
  try {
    await dataSource.query('DELETE FROM listings');
    console.log('✓ Existing listings cleared');
  } catch (error) {
    console.log('Note: Listings table will be created automatically');
  }

  // Get users, locations, and categories
  const users = await userRepository.find();
  const locations = await locationRepository.find();
  const categories = await categoryRepository.find();

  if (users.length === 0) {
    console.log('⚠ No users found. Please seed users first.');
    return;
  }

  if (locations.length === 0) {
    console.log('⚠ No locations found. Please seed locations first.');
    return;
  }

  if (categories.length === 0) {
    console.log('⚠ No categories found. Please seed categories first.');
    return;
  }

  // Separate categories by type
  const bienCategories = categories.filter(c => c.type === 'bien');
  const serviceCategories = categories.filter(c => c.type === 'service');

  // Sample listings data
  const bienListings = [
    {
      title: 'Vélo de montagne en excellent état',
      description: 'Vélo de montagne Trek, taille M, très peu utilisé. Pneus neufs, freins révisés. Parfait pour les balades en montagne ou sur les sentiers.',
      price: 35,
      type: ListingType.BIEN,
      categoryName: 'Véhicules',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'],
    },
    {
      title: 'Table en bois de cocotier artisanale',
      description: 'Belle table basse en bois de cocotier, fabriquée localement par un artisan polynésien. Dimensions: 80x50cm, hauteur 40cm. Unique et authentique.',
      price: 45,
      type: ListingType.BIEN,
      categoryName: 'Meubles',
      images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop'],
    },
    {
      title: 'Ukulele soprano avec étui',
      description: 'Ukulele soprano de qualité, parfait pour débuter ou se perfectionner. Comprend un étui de protection et un accordeur. État impeccable.',
      price: 25,
      type: ListingType.BIEN,
      categoryName: 'Jouets',
      images: ['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'],
    },
    {
      title: 'Smartphone Samsung Galaxy A54',
      description: 'Smartphone Samsung Galaxy A54, 128GB, écran 6.4 pouces. Acheté il y a 6 mois, en excellent état avec coque et verre trempé. Boîte d\'origine incluse.',
      price: 60,
      type: ListingType.BIEN,
      categoryName: 'Électronique',
      images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop'],
    },
    {
      title: 'Collection de livres sur la Polynésie',
      description: 'Lot de 15 livres sur l\'histoire, la culture et les traditions polynésiennes. Certains sont rares et épuisés. Parfait pour les passionnés.',
      price: 20,
      type: ListingType.BIEN,
      categoryName: 'Livres',
      images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop'],
    },
    {
      title: 'Panneaux solaires portables 100W',
      description: 'Kit panneaux solaires portables 100W avec régulateur et câbles. Parfait pour le camping, les excursions ou l\'autonomie énergétique. Très peu utilisé.',
      price: 55,
      type: ListingType.BIEN,
      categoryName: 'Électronique',
      images: ['https://images.unsplash.com/photo-1509391366360-2e959bae92c0?w=400&h=400&fit=crop'],
    },
    {
      title: 'Pirogue polynésienne traditionnelle',
      description: 'Pirogue polynésienne authentique, fabriquée à la main selon les techniques ancestrales. Longueur 4m, parfaite pour la pêche côtière ou les balades.',
      price: 80,
      type: ListingType.BIEN,
      categoryName: 'Véhicules',
      images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=400&fit=crop'],
    },
    {
      title: 'Tapis tressé en pandanus',
      description: 'Grand tapis tressé en pandanus selon les techniques traditionnelles. Dimensions 2x3m, motifs polynésiens authentiques. Pièce unique.',
      price: 30,
      type: ListingType.BIEN,
      categoryName: 'Meubles',
      images: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=400&fit=crop'],
    },
    {
      title: 'Outils de jardinage complets',
      description: 'Lot complet d\'outils de jardinage : bêche, râteau, sécateur, arrosoir, gants. Tout en bon état, prêt à l\'emploi pour votre potager ou jardin.',
      price: 15,
      type: ListingType.BIEN,
      categoryName: 'Outils',
      images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop'],
    },
    {
      title: 'Costume traditionnel tahitien',
      description: 'Costume traditionnel tahitien complet (pareo, couronne de fleurs, collier de coquillages). Taille unique, parfait pour les fêtes et cérémonies.',
      price: 25,
      type: ListingType.BIEN,
      categoryName: 'Vêtements',
      images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop'],
    },
    {
      title: 'Moto scooter 125cc',
      description: 'Scooter 125cc, parfait pour se déplacer sur l\'île. Révision récente, pneus neufs, papiers en règle. Idéal pour les trajets quotidiens.',
      price: 70,
      type: ListingType.BIEN,
      categoryName: 'Véhicules',
      images: ['https://images.unsplash.com/photo-1558980663-3681c1f2d6e3?w=400&h=400&fit=crop'],
    },
    {
      title: 'Appareil photo Canon EOS 2000D',
      description: 'Appareil photo reflex Canon EOS 2000D avec objectif 18-55mm. Très peu utilisé, comme neuf. Parfait pour capturer les beautés de la Polynésie.',
      price: 65,
      type: ListingType.BIEN,
      categoryName: 'Électronique',
      images: ['https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=400&fit=crop'],
    },
  ];

  const serviceListings = [
    {
      title: 'Cours de ukulele pour débutants',
      description: 'Cours de ukulele personnalisés pour débutants. Apprentissage des accords de base, des rythmes polynésiens et des chansons traditionnelles. Séances de 1h.',
      price: 12,
      type: ListingType.SERVICE,
      categoryName: 'Formation',
      images: ['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'],
    },
    {
      title: 'Service de réparation de vélos',
      description: 'Réparation et entretien de vélos. Révision complète, changement de pneus, réglage des freins et dérailleurs. Service rapide et professionnel.',
      price: 8,
      type: ListingType.SERVICE,
      categoryName: 'Réparation',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop'],
    },
    {
      title: 'Cours de cuisine polynésienne',
      description: 'Apprenez à cuisiner les plats traditionnels polynésiens : poisson cru, fafaru, poulet fafa, etc. Cours à domicile ou chez vous, matériel fourni.',
      price: 15,
      type: ListingType.SERVICE,
      categoryName: 'Cuisine',
      images: ['https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=400&fit=crop'],
    },
    {
      title: 'Service de jardinage et entretien',
      description: 'Entretien de jardins, tonte, taille des arbustes, désherbage. Service régulier ou ponctuel. Expérience et matériel professionnel.',
      price: 10,
      type: ListingType.SERVICE,
      categoryName: 'Jardinage',
      images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop'],
    },
    {
      title: 'Traduction français-tahitien',
      description: 'Service de traduction français-tahitien pour documents, textes, ou conversations. Connaissance approfondie des deux langues et de la culture.',
      price: 5,
      type: ListingType.SERVICE,
      categoryName: 'Formation',
      images: ['https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=400&fit=crop'],
    },
    {
      title: 'Massage relaxant polynésien',
      description: 'Massage relaxant aux huiles de monoï et de coco. Techniques traditionnelles polynésiennes. Séance de 1h dans un cadre apaisant.',
      price: 18,
      type: ListingType.SERVICE,
      categoryName: 'Bien-être',
      images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop'],
    },
    {
      title: 'Service de nettoyage à domicile',
      description: 'Nettoyage complet de votre domicile : sols, surfaces, sanitaires, poussière. Service ponctuel ou régulier. Matériel et produits fournis.',
      price: 12,
      type: ListingType.SERVICE,
      categoryName: 'Nettoyage',
      images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop'],
    },
    {
      title: 'Cours de danse tahitienne',
      description: 'Cours de danse tahitienne traditionnelle (Ori Tahiti). Apprentissage des pas de base, des gestuelles et des chorégraphies. Pour tous niveaux.',
      price: 10,
      type: ListingType.SERVICE,
      categoryName: 'Formation',
      images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop'],
    },
  ];

  // Combine all listings
  const allListings = [...bienListings, ...serviceListings];

  let createdCount = 0;

  for (const listingData of allListings) {
    // Find appropriate category
    const category = listingData.type === ListingType.BIEN
      ? bienCategories.find(c => c.name === listingData.categoryName) || bienCategories[0]
      : serviceCategories.find(c => c.name === listingData.categoryName) || serviceCategories[0];

    if (!category) {
      console.log(`⚠ Category "${listingData.categoryName}" not found, skipping listing: ${listingData.title}`);
      continue;
    }

    // Pick random user and location
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];

    // Determine price unit based on type
    const getPriceUnit = (type: ListingType): string | null => {
      if (type === ListingType.SERVICE) {
        return 'par heure' // Services are typically per hour
      } else {
        return 'l\'unité' // Biens are typically per unit
      }
    }

    // Create listing
    const listing = listingRepository.create({
      title: listingData.title,
      description: listingData.description,
      price: Math.round(listingData.price), // Ensure integer
      priceUnit: getPriceUnit(listingData.type),
      type: listingData.type,
      status: ListingStatus.ACTIVE,
      sellerId: randomUser.id,
      locationId: randomLocation.id,
      categoryId: category.id,
      images: listingData.images || [], // Use provided images or empty array
      viewCount: Math.floor(Math.random() * 50), // Random view count
    });

    await listingRepository.save(listing);
    createdCount++;
    console.log(`✓ Listing created: ${listingData.title} (${listingData.type})`);
  }

  console.log(`✅ ${createdCount} listings created successfully!`);
}
