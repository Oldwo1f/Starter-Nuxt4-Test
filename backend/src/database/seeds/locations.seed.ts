import { DataSource } from 'typeorm';
import { Location } from '../../entities/location.entity';

interface CommuneData {
  commune: string;
  archipel: string;
  iles: string[];
}

// Données des communes polynésiennes (copiées depuis commune.json)
const communeData: CommuneData[] = [
  { "commune": "Arue", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Faa'a", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Hitiaa O Te Ra", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Mahina", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Moorea-Maiao", "archipel": "Îles de la Société", "iles": ["Moorea", "Maiao"] },
  { "commune": "Paea", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Papara", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Papeete", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Pirae", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Punaauia", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Taiarapu-Est", "archipel": "Îles de la Société", "iles": ["Tahiti", "Mehetia"] },
  { "commune": "Taiarapu-Ouest", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Teva I Uta", "archipel": "Îles de la Société", "iles": ["Tahiti"] },
  { "commune": "Bora-Bora", "archipel": "Îles Sous-le-Vent", "iles": ["Bora Bora", "Tupai"] },
  { "commune": "Huahine", "archipel": "Îles Sous-le-Vent", "iles": ["Huahine"] },
  { "commune": "Maupiti", "archipel": "Îles Sous-le-Vent", "iles": ["Maupiti", "Motu One", "Manuae", "Maupihaa"] },
  { "commune": "Tahaa", "archipel": "Îles Sous-le-Vent", "iles": ["Tahaa"] },
  { "commune": "Taputapuatea", "archipel": "Îles Sous-le-Vent", "iles": ["Raiatea"] },
  { "commune": "Tumaraa", "archipel": "Îles Sous-le-Vent", "iles": ["Raiatea"] },
  { "commune": "Uturoa", "archipel": "Îles Sous-le-Vent", "iles": ["Raiatea"] },
  { "commune": "Raivavae", "archipel": "Îles Australes", "iles": ["Raivavae"] },
  { "commune": "Rapa", "archipel": "Îles Australes", "iles": ["Rapa"] },
  { "commune": "Rimatara", "archipel": "Îles Australes", "iles": ["Rimatara"] },
  { "commune": "Rurutu", "archipel": "Îles Australes", "iles": ["Rurutu"] },
  { "commune": "Tubuai", "archipel": "Îles Australes", "iles": ["Tubuai"] },
  { "commune": "Fatu-Hiva", "archipel": "Îles Marquises", "iles": ["Fatu Hiva"] },
  { "commune": "Hiva-Oa", "archipel": "Îles Marquises", "iles": ["Hiva Oa"] },
  { "commune": "Nuku-Hiva", "archipel": "Îles Marquises", "iles": ["Nuku Hiva"] },
  { "commune": "Tahuata", "archipel": "Îles Marquises", "iles": ["Tahuata"] },
  { "commune": "Ua-Huka", "archipel": "Îles Marquises", "iles": ["Ua Huka"] },
  { "commune": "Ua-Pou", "archipel": "Îles Marquises", "iles": ["Ua Pou"] },
  { "commune": "Anaa", "archipel": "Tuamotu-Gambier", "iles": ["Anaa", "Faaite", "Motutunga", "Tahanea"] },
  { "commune": "Arutua", "archipel": "Tuamotu-Gambier", "iles": ["Arutua", "Tikehau"] },
  { "commune": "Fakarava", "archipel": "Tuamotu-Gambier", "iles": ["Fakarava", "Kauehi", "Raraka", "Taiaro"] },
  { "commune": "Fangatau", "archipel": "Tuamotu-Gambier", "iles": ["Fangatau", "Fakahina"] },
  { "commune": "Gambier", "archipel": "Tuamotu-Gambier", "iles": ["Mangareva", "Aukena", "Akamaru", "Taravai"] },
  { "commune": "Hao", "archipel": "Tuamotu-Gambier", "iles": ["Hao"] },
  { "commune": "Hikueru", "archipel": "Tuamotu-Gambier", "iles": ["Hikueru"] },
  { "commune": "Makemo", "archipel": "Tuamotu-Gambier", "iles": ["Makemo"] },
  { "commune": "Manihi", "archipel": "Tuamotu-Gambier", "iles": ["Manihi"] },
  { "commune": "Napuka", "archipel": "Tuamotu-Gambier", "iles": ["Napuka"] },
  { "commune": "Nukutavake", "archipel": "Tuamotu-Gambier", "iles": ["Nukutavake", "Vahitahi", "Pinaki", "Akiaki", "Vairaatea"] },
  { "commune": "Pukapuka", "archipel": "Tuamotu-Gambier", "iles": ["Puka Puka"] },
  { "commune": "Rangiroa", "archipel": "Tuamotu-Gambier", "iles": ["Rangiroa"] },
  { "commune": "Reao", "archipel": "Tuamotu-Gambier", "iles": ["Reao"] },
  { "commune": "Takaroa", "archipel": "Tuamotu-Gambier", "iles": ["Takaroa", "Takapoto"] },
  { "commune": "Tureia", "archipel": "Tuamotu-Gambier", "iles": ["Tureia", "Vahitahi"] },
];

export async function seedLocations(dataSource: DataSource): Promise<void> {
  const locationRepository = dataSource.getRepository(Location);

  // Clear existing locations
  try {
    await dataSource.query('DELETE FROM locations');
    console.log('✓ Existing locations cleared');
  } catch (error) {
    console.log('Note: Locations table will be created automatically');
  }

  console.log(`✓ Using ${communeData.length} communes from seed data`);

  // Create locations for each commune/île combination
  const locationsCreated: string[] = [];
  const locationsSkipped: string[] = [];
  
  for (const commune of communeData) {
    for (const ile of commune.iles) {
      // Check if location already exists (avoid duplicates)
      const existingLocation = await locationRepository.findOne({
        where: {
          archipel: commune.archipel,
          commune: commune.commune,
          ile: ile,
        },
      });

      if (!existingLocation) {
        const location = locationRepository.create({
          archipel: commune.archipel,
          commune: commune.commune,
          ile: ile,
          isDigital: false,
        });
        await locationRepository.save(location);
        locationsCreated.push(`${commune.commune} - ${ile}`);
      } else {
        locationsSkipped.push(`${commune.commune} - ${ile}`);
      }
    }
  }
  
  console.log(`✓ Created ${locationsCreated.length} new locations`);
  if (locationsSkipped.length > 0) {
    console.log(`  Skipped ${locationsSkipped.length} existing locations`);
  }

  // Add "Digital / À distance" option (check if exists first)
  const existingDigital = await locationRepository.findOne({
    where: {
      archipel: 'Digital',
      commune: 'Digital',
      ile: 'À distance',
      isDigital: true,
    },
  });

  if (!existingDigital) {
    const digitalLocation = locationRepository.create({
      archipel: 'Digital',
      commune: 'Digital',
      ile: 'À distance',
      isDigital: true,
    });
    await locationRepository.save(digitalLocation);
    locationsCreated.push('Digital / À distance');
  }

  console.log(`✓ ${locationsCreated.length} locations created`);
  console.log(`  Including: ${locationsCreated.slice(0, 5).join(', ')}${locationsCreated.length > 5 ? '...' : ''}`);
}
