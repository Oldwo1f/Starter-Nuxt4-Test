import { DataSource } from 'typeorm';
import { Culture, CultureType } from '../../entities/culture.entity';

export async function seedCulture(dataSource: DataSource): Promise<void> {
  const cultureRepository = dataSource.getRepository(Culture);

  // Clear existing culture videos
  try {
    await dataSource.query('DELETE FROM cultures');
    console.log('✓ Existing culture videos cleared');
  } catch (error) {
    console.log('Note: Cultures table will be created automatically');
  }

  // Liste des vidéos à créer
  const DEFAULT_DIRECTOR = 'Nuna\'a heritage - Naho'
  
  const cultureVideos = [
    // Reportages
    {
      title: 'Apiculteurs du Fenua',
      type: CultureType.REPORTAGE,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
    {
      title: 'Perliculteurs du Fenua',
      type: CultureType.REPORTAGE,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
    {
      title: 'Heiva Tu\'aro Ma\'ohi',
      type: CultureType.REPORTAGE,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
    {
      title: 'Défilé des porteurs d\'oranges',
      type: CultureType.REPORTAGE,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - Bientôt disponible
      director: DEFAULT_DIRECTOR,
      isPublic: false, // Privé car bientôt disponible
    },
    {
      title: 'UMU-TI : La marche sur le feu',
      type: CultureType.REPORTAGE,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - Bientôt disponible
      director: DEFAULT_DIRECTOR,
      isPublic: false, // Privé car bientôt disponible
    },
    {
      title: 'Offrir des Crêpes aux jeunes',
      type: CultureType.REPORTAGE,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
    // Interviews
    {
      title: 'Interview : Toai',
      type: CultureType.INTERVIEW,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
    {
      title: 'Interview : Tini',
      type: CultureType.INTERVIEW,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
    {
      title: 'Interview : PORTEUR D\'ORANGES',
      type: CultureType.INTERVIEW,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
    {
      title: 'Interview : Alexis',
      type: CultureType.INTERVIEW,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
    {
      title: 'Interview : Charly',
      type: CultureType.INTERVIEW,
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - à remplacer par l'URL réelle
      director: DEFAULT_DIRECTOR,
      isPublic: true,
    },
  ];

  // Créer les vidéos
  for (const video of cultureVideos) {
    const culture = cultureRepository.create({
      title: video.title,
      type: video.type,
      youtubeUrl: video.youtubeUrl,
      director: video.director,
      isPublic: video.isPublic,
      createdById: null, // Pas de créateur spécifique pour les seeds
    });

    await cultureRepository.save(culture);
    console.log(`  ✓ Created: ${video.title} (${video.type})`);
  }

  console.log(`✓ Created ${cultureVideos.length} culture videos`);
}
