import '../../load-env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { AcademyModule } from '../../entities/module.entity';
import { Video } from '../../entities/video.entity';
import * as fs from 'fs';
import * as path from 'path';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [Course, AcademyModule, Video],
  synchronize: false,
});

interface VideoDuration {
  videoId: number;
  duration: number | null;
  title: string;
  courseTitle: string;
  moduleTitle: string;
}

async function generateUpdateScript() {
  try {
    console.log('🔍 Récupération des durées depuis la base de données locale...\n');
    
    await dataSource.initialize();
    console.log('✓ Connexion à la base de données établie\n');

    const courseRepository = dataSource.getRepository(Course);
    const moduleRepository = dataSource.getRepository(AcademyModule);
    const videoRepository = dataSource.getRepository(Video);

    // Les 3 formations à traiter
    const courseTitles = [
      'Gestion des émotions',
      'Charisme',
      'Tressage de coquillage'
    ];

    const videoDurations: VideoDuration[] = [];

    for (const courseTitle of courseTitles) {
      console.log(`📚 Récupération pour: ${courseTitle}`);

      const course = await courseRepository.findOne({
        where: { title: courseTitle },
      });

      if (!course) {
        console.log(`⚠ Formation "${courseTitle}" non trouvée\n`);
        continue;
      }

      const modules = await moduleRepository.find({
        where: { courseId: course.id },
        order: { order: 'ASC' },
      });

      for (const module of modules) {
        const videos = await videoRepository.find({
          where: { moduleId: module.id },
          order: { order: 'ASC' },
        });

        for (const video of videos) {
          videoDurations.push({
            videoId: video.id,
            duration: video.duration,
            title: video.title,
            courseTitle: course.title,
            moduleTitle: module.title,
          });
        }
      }
    }

    await dataSource.destroy();

    // Compter les statistiques
    const withDuration = videoDurations.filter(v => v.duration !== null);
    const withoutDuration = videoDurations.filter(v => v.duration === null);

    console.log(`\n📊 Statistiques:`);
    console.log(`   Total vidéos: ${videoDurations.length}`);
    console.log(`   Avec durée: ${withDuration.length}`);
    console.log(`   Sans durée: ${withoutDuration.length}`);

    if (withoutDuration.length > 0) {
      console.log(`\n⚠ Vidéos sans durée:`);
      withoutDuration.forEach(v => {
        console.log(`   - ${v.courseTitle} > ${v.moduleTitle} > ${v.title} (ID: ${v.videoId})`);
      });
    }

    // Générer le script de mise à jour
    const updateScript = `import '../../load-env';
import { Client } from 'pg';

// Durées récupérées depuis la DB locale le ${new Date().toLocaleString('fr-FR')}
const videoDurations: Array<{ videoId: number; duration: number | null }> = ${JSON.stringify(
      videoDurations.map(v => ({ videoId: v.videoId, duration: v.duration })),
      null,
      2
    )};

async function updateDurations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nunaheritage',
  });

  try {
    console.log('🔄 Mise à jour des durées des vidéos...\\n');
    
    await client.connect();
    console.log('✓ Connexion à la base de données établie\\n');

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const { videoId, duration } of videoDurations) {
      try {
        if (duration === null) {
          console.log(\`⏭ Vidéo ID \${videoId} - Pas de durée à mettre à jour\`);
          skipped++;
          continue;
        }

        // Vérifier que la vidéo existe et récupérer son titre
        const checkResult = await client.query(
          'SELECT id, title FROM videos WHERE id = $1',
          [videoId]
        );

        if (checkResult.rows.length === 0) {
          console.log(\`⚠ Vidéo ID \${videoId} non trouvée\`);
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
        console.log(\`✅ Vidéo ID \${videoId} (\${videoTitle}) - \${minutes}m\${seconds}s\`);
        updated++;
      } catch (error) {
        console.error(\`❌ Erreur pour vidéo ID \${videoId}:\`, error);
        errors++;
      }
    }

    console.log('\\n' + '='.repeat(60));
    console.log('\\n📊 RÉSUMÉ DE LA MISE À JOUR');
    console.log(\`   ✅ Vidéos mises à jour: \${updated}\`);
    console.log(\`   ⏭ Vidéos ignorées (pas de durée): \${skipped}\`);
    console.log(\`   ⚠ Erreurs: \${errors}\`);

    await client.end();
    console.log('\\n✅ Mise à jour terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    await client.end();
    process.exit(1);
  }
}

updateDurations();
`;

    // Sauvegarder le script
    const outputPath = path.join(process.cwd(), 'src', 'database', 'scripts', 'update-durations-from-local.ts');
    fs.writeFileSync(outputPath, updateScript, 'utf-8');
    console.log(`\n✅ Script de mise à jour généré: ${outputPath}`);
    console.log(`\n📝 Pour exécuter sur le serveur:`);
    console.log(`   cd backend`);
    console.log(`   npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register src/database/scripts/update-durations-from-local.ts`);

    // Générer aussi un script shell pour faciliter l'exécution
    const shellScript = `#!/bin/bash

set -e

echo "🔄 Mise à jour des durées des vidéos depuis les données locales"
echo ""

# Couleurs
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

# Vérifier que le conteneur backend est en cours d'exécution
if ! docker ps | grep -q "nunaheritage-backend"; then
    echo -e "\${YELLOW}⚠️  Le conteneur backend n'est pas en cours d'exécution\${NC}"
    echo "Démarrez d'abord les conteneurs avec: docker compose up -d"
    exit 1
fi

# Charger les variables d'environnement (racine du projet)
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

echo -e "\${GREEN}🔄 Mise à jour des durées...\${NC}"
echo ""

# Vérifier que le fichier existe localement
SCRIPT_PATH="backend/src/database/scripts/update-durations-from-local.ts"
if [ ! -f "\$SCRIPT_PATH" ]; then
    echo -e "\${YELLOW}❌ Le fichier \$SCRIPT_PATH n'existe pas localement\${NC}"
    exit 1
fi

# Créer le répertoire dans le conteneur si nécessaire
docker exec nunaheritage-backend mkdir -p /app/src/database/scripts

# Copier le script dans le conteneur
echo -e "\${GREEN}📋 Copie du script dans le conteneur...\${NC}"
docker cp "\$SCRIPT_PATH" nunaheritage-backend:/app/src/database/scripts/update-durations-from-local.ts

if [ \$? -ne 0 ]; then
    echo -e "\${YELLOW}❌ Erreur lors de la copie du script\${NC}"
    exit 1
fi

echo -e "\${GREEN}✅ Script copié\${NC}"
echo ""

# Exécuter le script dans le conteneur
docker exec -it nunaheritage-backend sh -c "
  cd /app && \\
  npx ts-node --project tsconfig.seed.json -r tsconfig-paths/register src/database/scripts/update-durations-from-local.ts
"

echo ""
echo -e "\${GREEN}✅ Mise à jour terminée!\${NC}"
`;

    const shellScriptPath = path.join(process.cwd(), '..', 'update-durations-on-server.sh');
    fs.writeFileSync(shellScriptPath, shellScript, 'utf-8');
    
    // Rendre le script exécutable
    try {
      fs.chmodSync(shellScriptPath, 0o755);
    } catch (e) {
      // Ignore si chmod échoue
    }

    console.log(`✅ Script shell généré: ${shellScriptPath}`);
    console.log(`\n📝 Pour exécuter sur le serveur:`);
    console.log(`   ./update-durations-on-server.sh`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

generateUpdateScript();
