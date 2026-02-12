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
      title: 'Ukulele soprano avec étui',
      description: 'Ukulele soprano de qualité, parfait pour débuter ou se perfectionner. Comprend un étui de protection et un accordeur. État impeccable.',
      price: 25,
      type: ListingType.BIEN,
      categoryName: 'Jouets',
      images: [],
    },
    {
      title: 'Smartphone Samsung Galaxy A54',
      description: 'Smartphone Samsung Galaxy A54, 128GB, écran 6.4 pouces. Acheté il y a 6 mois, en excellent état avec coque et verre trempé. Boîte d\'origine incluse.',
      price: 60,
      type: ListingType.BIEN,
      categoryName: 'Électronique',
      images: [],
    },
    {
      title: 'Panneaux solaires portables 100W',
      description: 'Kit panneaux solaires portables 100W avec régulateur et câbles. Parfait pour le camping, les excursions ou l\'autonomie énergétique. Très peu utilisé.',
      price: 55,
      type: ListingType.BIEN,
      categoryName: 'Électronique',
      images: [],
    },
    {
      title: 'Pirogue polynésienne traditionnelle',
      description: 'Pirogue polynésienne authentique, fabriquée à la main selon les techniques ancestrales. Longueur 4m, parfaite pour la pêche côtière ou les balades.',
      price: 80,
      type: ListingType.BIEN,
      categoryName: 'Véhicules',
      images: [],
    },
    {
      title: 'Tapis tressé en pandanus',
      description: 'Grand tapis tressé en pandanus selon les techniques traditionnelles. Dimensions 2x3m, motifs polynésiens authentiques. Pièce unique.',
      price: 30,
      type: ListingType.BIEN,
      categoryName: 'Meubles',
      images: [],
    },
    {
      title: 'Costume traditionnel tahitien',
      description: 'Costume traditionnel tahitien complet (pareo, couronne de fleurs, collier de Pūpū). Taille unique, parfait pour les fêtes et cérémonies.',
      price: 25,
      type: ListingType.BIEN,
      categoryName: 'Vêtements',
      images: [],
    },
  ];

  const serviceListings = [
    {
      title: 'Cours de ukulele pour débutants',
      description: 'Cours de ukulele personnalisés pour débutants. Apprentissage des accords de base, des rythmes polynésiens et des chansons traditionnelles. Séances de 1h.',
      price: 12,
      type: ListingType.SERVICE,
      categoryName: 'Formation',
      images: [],
    },
    {
      title: 'Cours de cuisine polynésienne',
      description: 'Apprenez à cuisiner les plats traditionnels polynésiens : poisson cru, fafaru, poulet fafa, etc. Cours à domicile ou chez vous, matériel fourni.',
      price: 15,
      type: ListingType.SERVICE,
      categoryName: 'Cuisine',
      images: [],
    },
    {
      title: 'Massage relaxant polynésien',
      description: 'Massage relaxant aux huiles de monoï et de coco. Techniques traditionnelles polynésiennes. Séance de 1h dans un cadre apaisant.',
      price: 18,
      type: ListingType.SERVICE,
      categoryName: 'Bien-être',
      images: [],
    },
    {
      title: 'Cours de danse tahitienne',
      description: 'Cours de danse tahitienne traditionnelle (Ori Tahiti). Apprentissage des pas de base, des gestuelles et des chorégraphies. Pour tous niveaux.',
      price: 10,
      type: ListingType.SERVICE,
      categoryName: 'Formation',
      images: [],
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
