import 'dotenv/config';
import { Client } from 'pg';

// Durées récupérées depuis la DB locale le 21/02/2026 15:07:29
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
    "duration": 456
  },
  {
    "videoId": 18,
    "duration": 360
  },
  {
    "videoId": 19,
    "duration": 300
  },
  {
    "videoId": 20,
    "duration": 420
  },
  {
    "videoId": 21,
    "duration": 480
  },
  {
    "videoId": 22,
    "duration": 540
  },
  {
    "videoId": 23,
    "duration": 600
  },
  {
    "videoId": 24,
    "duration": 660
  },
  {
    "videoId": 25,
    "duration": 720
  },
  {
    "videoId": 26,
    "duration": 780
  },
  {
    "videoId": 27,
    "duration": 840
  },
  {
    "videoId": 28,
    "duration": 900
  },
  {
    "videoId": 29,
    "duration": 960
  },
  {
    "videoId": 30,
    "duration": 1020
  },
  {
    "videoId": 31,
    "duration": 1080
  },
  {
    "videoId": 32,
    "duration": 1140
  },
  {
    "videoId": 33,
    "duration": 1200
  },
  {
    "videoId": 34,
    "duration": 1260
  },
  {
    "videoId": 35,
    "duration": 1320
  },
  {
    "videoId": 36,
    "duration": 1380
  },
  {
    "videoId": 37,
    "duration": 1440
  },
  {
    "videoId": 38,
    "duration": 1500
  },
  {
    "videoId": 39,
    "duration": 1560
  },
  {
    "videoId": 40,
    "duration": 1620
  },
  {
    "videoId": 41,
    "duration": 1680
  },
  {
    "videoId": 42,
    "duration": 1740
  },
  {
    "videoId": 43,
    "duration": 1800
  },
  {
    "videoId": 44,
    "duration": 1860
  },
  {
    "videoId": 45,
    "duration": 1920
  },
  {
    "videoId": 46,
    "duration": 1980
  },
  {
    "videoId": 47,
    "duration": 2040
  },
  {
    "videoId": 48,
    "duration": 2100
  },
  {
    "videoId": 49,
    "duration": 2160
  },
  {
    "videoId": 50,
    "duration": 2220
  },
  {
    "videoId": 51,
    "duration": 2280
  },
  {
    "videoId": 52,
    "duration": 2340
  },
  {
    "videoId": 53,
    "duration": 2400
  },
  {
    "videoId": 54,
    "duration": 2460
  },
  {
    "videoId": 55,
    "duration": 2520
  },
  {
    "videoId": 56,
    "duration": 2580
  },
  {
    "videoId": 57,
    "duration": 2640
  },
  {
    "videoId": 58,
    "duration": 2700
  },
  {
    "videoId": 59,
    "duration": 2760
  },
  {
    "videoId": 60,
    "duration": 2820
  },
  {
    "videoId": 61,
    "duration": 2880
  },
  {
    "videoId": 62,
    "duration": 2940
  },
  {
    "videoId": 63,
    "duration": 3000
  },
  {
    "videoId": 64,
    "duration": 3060
  },
  {
    "videoId": 65,
    "duration": 3120
  },
  {
    "videoId": 66,
    "duration": 3180
  },
  {
    "videoId": 67,
    "duration": 3240
  },
  {
    "videoId": 68,
    "duration": 3300
  },
  {
    "videoId": 69,
    "duration": 3360
  },
  {
    "videoId": 70,
    "duration": 3420
  }
];

async function updateDurations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nunaheritage',
  });

  try {
    console.log('🔄 Mise à jour des durées des vidéos...\n');
    
    await client.connect();
    console.log('✓ Connexion à la base de données établie\n');

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const { videoId, duration } of videoDurations) {
      try {
        if (duration === null) {
          console.log(`⏭ Vidéo ID ${videoId} - Pas de durée à mettre à jour`);
          skipped++;
          continue;
        }

        // Vérifier que la vidéo existe et récupérer son titre
        const checkResult = await client.query(
          'SELECT id, title FROM videos WHERE id = $1',
          [videoId]
        );

        if (checkResult.rows.length === 0) {
          console.log(`⚠ Vidéo ID ${videoId} non trouvée`);
          errors++;
          continue;
        }

        const videoTitle = checkResult.rows[0].title;

        // Mettre à jour la durée avec une requête SQL directe
        await client.query(
          'UPDATE videos SET duration = $1, "updatedAt" = NOW() WHERE id = $2',
          [duration, videoId]
        );

        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        console.log(`✅ Vidéo ID ${videoId} (${videoTitle}) - ${minutes}m${seconds}s`);
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

    await client.end();
    console.log('\n✅ Mise à jour terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    await client.end();
    process.exit(1);
  }
}

updateDurations();
