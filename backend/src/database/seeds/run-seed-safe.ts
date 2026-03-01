import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { seedTodosSafe } from './todos.seed-safe';
import { Todo } from '../../entities/todo.entity';

/**
 * Script de seed SÉCURISÉ pour les todos uniquement
 * 
 * ⚠️ IMPORTANT: Ce script ne supprime AUCUNE donnée existante
 * Il ajoute uniquement les todos qui n'existent pas déjà
 * 
 * Utilisation:
 *   npm run seed:todos-safe
 * 
 * Ou depuis le conteneur:
 *   docker exec -it nunaheritage-backend npm run seed:todos-safe
 */

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [Todo],
  synchronize: false, // Ne pas synchroniser automatiquement
});

async function runSeedSafe() {
  try {
    console.log('🔒 Seed SÉCURISÉ des todos');
    console.log('═══════════════════════════════════════════');
    console.log('⚠️  Mode sécurisé: AUCUNE donnée ne sera supprimée');
    console.log('   Seuls les todos manquants seront ajoutés\n');
    
    await dataSource.initialize();
    console.log('✓ Connexion à la base de données établie\n');
    
    // Seed todos (version sécurisée)
    await seedTodosSafe(dataSource);
    
    await dataSource.destroy();
    console.log('\n✅ Seed sécurisé terminé avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed sécurisé:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

runSeedSafe();
