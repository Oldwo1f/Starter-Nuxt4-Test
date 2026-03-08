import '../../load-env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { AcademyModule } from '../../entities/module.entity';
import { Video } from '../../entities/video.entity';
import * as fs from 'fs';

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

interface VideoInfo {
  courseTitle: string;
  moduleTitle: string;
  videoId: number;
  videoTitle: string;
  videoFile: string | null;
  videoUrl: string | null;
  duration: number | null;
  durationFormatted: string;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Non définie';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h${minutes}m${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m${secs}s`;
  } else {
    return `${secs}s`;
  }
}

async function getVideoDurations() {
  try {
    console.log('🔍 Récupération des durées des vidéos depuis la base de données...\n');
    
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

    const allVideos: VideoInfo[] = [];

    for (const courseTitle of courseTitles) {
      console.log(`\n📚 Formation: ${courseTitle}`);
      console.log('─'.repeat(60));

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
          allVideos.push({
            courseTitle: course.title,
            moduleTitle: module.title,
            videoId: video.id,
            videoTitle: video.title,
            videoFile: video.videoFile,
            videoUrl: video.videoUrl,
            duration: video.duration,
            durationFormatted: formatDuration(video.duration),
          });
        }
      }
    }

    // Afficher le résumé
    console.log('\n\n📊 RÉSUMÉ DES DURÉES\n');
    console.log('='.repeat(80));

    let totalVideos = 0;
    let videosWithDuration = 0;
    let videosWithoutDuration = 0;
    let totalDurationSeconds = 0;

    for (const courseTitle of courseTitles) {
      const courseVideos = allVideos.filter(v => v.courseTitle === courseTitle);
      const withDuration = courseVideos.filter(v => v.duration !== null);
      const withoutDuration = courseVideos.filter(v => v.duration === null);
      const courseTotalSeconds = courseVideos
        .filter(v => v.duration !== null)
        .reduce((sum, v) => sum + (v.duration || 0), 0);

      totalVideos += courseVideos.length;
      videosWithDuration += withDuration.length;
      videosWithoutDuration += withoutDuration.length;
      totalDurationSeconds += courseTotalSeconds;

      console.log(`\n📚 ${courseTitle}`);
      console.log(`   Total vidéos: ${courseVideos.length}`);
      console.log(`   Avec durée: ${withDuration.length}`);
      console.log(`   Sans durée: ${withoutDuration.length}`);
      console.log(`   Durée totale: ${formatDuration(courseTotalSeconds)}`);

      if (withoutDuration.length > 0) {
        console.log(`\n   ⚠ Vidéos sans durée:`);
        withoutDuration.forEach(v => {
          console.log(`      - ${v.videoTitle} (ID: ${v.videoId})`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📈 TOTAL GLOBAL`);
    console.log(`   Total vidéos: ${totalVideos}`);
    console.log(`   Avec durée: ${videosWithDuration}`);
    console.log(`   Sans durée: ${videosWithoutDuration}`);
    console.log(`   Durée totale: ${formatDuration(totalDurationSeconds)}`);

    // Exporter en JSON
    const outputPath = './video-durations-report.json';
    fs.writeFileSync(
      outputPath,
      JSON.stringify(allVideos, null, 2),
      'utf-8'
    );
    console.log(`\n💾 Rapport détaillé exporté dans: ${outputPath}`);

    // Exporter en CSV
    const csvPath = './video-durations-report.csv';
    const csvHeader = 'Formation,Module,ID Vidéo,Titre,Fichier,URL,Durée (secondes),Durée formatée\n';
    const csvRows = allVideos.map(v => 
      `"${v.courseTitle}","${v.moduleTitle}",${v.videoId},"${v.videoTitle}","${v.videoFile || ''}","${v.videoUrl || ''}",${v.duration || ''},"${v.durationFormatted}"`
    ).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf-8');
    console.log(`💾 Rapport CSV exporté dans: ${csvPath}`);

    await dataSource.destroy();
    console.log('\n✅ Récupération terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

getVideoDurations();
