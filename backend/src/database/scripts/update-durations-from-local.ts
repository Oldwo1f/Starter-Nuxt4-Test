import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Video } from '../../entities/video.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [Video],
  synchronize: false,
});

// Durées récupérées depuis la DB locale le 21/02/2026 14:59:57
const videoDurations: Array<{ videoId: number; duration: number | null }> = [
  {
    "videoId": 9,
    "duration": 275
  },
  {
    "videoId": 10,
    "duration": 320
  },
  {
    "videoId": 11,
    "duration": 226
  },
  {
    "videoId": 12,
    "duration": 248
  },
  {
    "videoId": 13,
    "duration": 416
  },
  {
    "videoId": 14,
    "duration": 813
  },
  {
    "videoId": 15,
    "duration": 568
  },
  {
    "videoId": 16,
    "duration": 461
  },
  {
    "videoId": 17,
    "duration": 656
  },
  {
    "videoId": 18,
    "duration": 529
  },
  {
    "videoId": 19,
    "duration": 295
  },
  {
    "videoId": 20,
    "duration": 803
  },
  {
    "videoId": 21,
    "duration": 434
  },
  {
    "videoId": 22,
    "duration": 670
  },
  {
    "videoId": 23,
    "duration": 637
  },
  {
    "videoId": 24,
    "duration": 726
  },
  {
    "videoId": 25,
    "duration": 719
  },
  {
    "videoId": 26,
    "duration": 441
  },
  {
    "videoId": 27,
    "duration": 567
  },
  {
    "videoId": 28,
    "duration": 308
  },
  {
    "videoId": 29,
    "duration": 327
  },
  {
    "videoId": 30,
    "duration": 332
  },
  {
    "videoId": 31,
    "duration": 214
  },
  {
    "videoId": 32,
    "duration": 263
  },
  {
    "videoId": 33,
    "duration": 627
  },
  {
    "videoId": 34,
    "duration": 586
  },
  {
    "videoId": 35,
    "duration": 324
  },
  {
    "videoId": 36,
    "duration": 462
  },
  {
    "videoId": 37,
    "duration": 178
  },
  {
    "videoId": 48,
    "duration": 182
  },
  {
    "videoId": 49,
    "duration": 610
  },
  {
    "videoId": 50,
    "duration": 270
  },
  {
    "videoId": 51,
    "duration": 238
  },
  {
    "videoId": 52,
    "duration": 828
  },
  {
    "videoId": 53,
    "duration": 410
  },
  {
    "videoId": 54,
    "duration": 519
  },
  {
    "videoId": 55,
    "duration": 241
  },
  {
    "videoId": 56,
    "duration": 251
  },
  {
    "videoId": 57,
    "duration": 202
  },
  {
    "videoId": 58,
    "duration": 349
  },
  {
    "videoId": 59,
    "duration": 261
  },
  {
    "videoId": 60,
    "duration": 175
  },
  {
    "videoId": 61,
    "duration": 323
  },
  {
    "videoId": 62,
    "duration": 382
  },
  {
    "videoId": 63,
    "duration": 341
  },
  {
    "videoId": 64,
    "duration": 632
  },
  {
    "videoId": 65,
    "duration": 483
  },
  {
    "videoId": 66,
    "duration": 360
  },
  {
    "videoId": 67,
    "duration": 481
  },
  {
    "videoId": 68,
    "duration": 148
  },
  {
    "videoId": 69,
    "duration": 291
  },
  {
    "videoId": 70,
    "duration": 407
  },
  {
    "videoId": 71,
    "duration": 97
  },
  {
    "videoId": 72,
    "duration": 115
  },
  {
    "videoId": 73,
    "duration": 254
  },
  {
    "videoId": 74,
    "duration": 100
  },
  {
    "videoId": 75,
    "duration": 326
  },
  {
    "videoId": 76,
    "duration": 124
  },
  {
    "videoId": 77,
    "duration": 297
  },
  {
    "videoId": 38,
    "duration": 423
  },
  {
    "videoId": 39,
    "duration": 798
  },
  {
    "videoId": 40,
    "duration": 803
  }
];

async function updateDurations() {
  try {
    console.log('🔄 Mise à jour des durées des vidéos...\n');
    
    await dataSource.initialize();
    console.log('✓ Connexion à la base de données établie\n');

    const videoRepository = dataSource.getRepository(Video);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const { videoId, duration } of videoDurations) {
      try {
        const video = await videoRepository.findOne({ where: { id: videoId } });
        
        if (!video) {
          console.log(`⚠ Vidéo ID ${videoId} non trouvée`);
          errors++;
          continue;
        }

        if (duration === null) {
          console.log(`⏭ Vidéo ID ${videoId} (${video.title}) - Pas de durée à mettre à jour`);
          skipped++;
          continue;
        }

        video.duration = duration;
        await videoRepository.save(video);

        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        console.log(`✅ Vidéo ID ${videoId} (${video.title}) - ${minutes}m${seconds}s`);
        updated++;
      } catch (error) {
        console.error(`❌ Erreur pour vidéo ID ${videoId}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RÉSUMÉ DE LA MISE À JOUR');
    console.log(`   ✅ Vidéos mises à jour: ${updated}`);
    console.log(`   ⏭ Vidéos ignorées (pas de durée): ${skipped}`);
    console.log(`   ⚠ Erreurs: ${errors}`);

    await dataSource.destroy();
    console.log('\n✅ Mise à jour terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

updateDurations();
