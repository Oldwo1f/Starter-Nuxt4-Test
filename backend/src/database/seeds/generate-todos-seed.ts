import '../../load-env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Todo } from '../../entities/todo.entity';
import { writeFileSync } from 'fs';
import { join } from 'path';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [Todo],
  synchronize: false,
});

async function generateTodosSeed() {
  try {
    console.log('🔄 Connexion à la base de données...\n');
    await dataSource.initialize();
    console.log('✓ Connexion établie\n');

    const todoRepository = dataSource.getRepository(Todo);
    
    console.log('📋 Récupération des todos...');
    const todos = await todoRepository.find({
      order: {
        id: 'ASC',
      },
    });

    if (todos.length === 0) {
      console.log('⚠️  Aucun todo trouvé dans la base de données');
      await dataSource.destroy();
      return;
    }

    console.log(`✓ ${todos.length} todo(s) trouvé(s)\n`);

    // Générer le contenu du fichier de seed
    const seedContent = `import { DataSource } from 'typeorm';
import { Todo } from '../../entities/todo.entity';

export async function seedTodos(dataSource: DataSource): Promise<void> {
  const todoRepository = dataSource.getRepository(Todo);

  // Clear existing todos
  try {
    await dataSource.query('DELETE FROM todos');
    console.log('✓ Existing todos cleared');
  } catch (error) {
    console.log('Note: Todos table will be created automatically');
  }

  // Liste des todos à créer
  const todos = [
${todos.map((todo, index) => {
  const description = todo.description 
    ? `      description: ${JSON.stringify(todo.description)},`
    : `      description: null,`;
  
  return `    {
      title: ${JSON.stringify(todo.title)},
${description}
      status: '${todo.status}' as const,
      assignedTo: '${todo.assignedTo}' as const,
    }${index < todos.length - 1 ? ',' : ''}`;
}).join('\n')}
  ];

  // Créer les todos
  for (const todoData of todos) {
    const todo = todoRepository.create({
      title: todoData.title,
      description: todoData.description,
      status: todoData.status,
      assignedTo: todoData.assignedTo,
    });

    await todoRepository.save(todo);
    const statusLabels: Record<'en_cours' | 'finish' | 'pour_plus_tard', string> = {
      en_cours: 'En cours',
      finish: 'Terminé',
      pour_plus_tard: 'Pour plus tard',
    };
    const assignedToLabels: Record<'naho' | 'tamiga' | 'alexis' | 'vai', string> = {
      naho: 'Naho',
      tamiga: 'Tamiga',
      alexis: 'Alexis',
      vai: 'Vai',
    };
    const status = statusLabels[todoData.status] || todoData.status;
    const assignedTo = assignedToLabels[todoData.assignedTo] || todoData.assignedTo;
    console.log(\`  ✓ Created: \${todo.title} (\${status}, \${assignedTo})\`);
  }

  console.log(\`✓ Created \${todos.length} todos\`);
}
`;

    // Écrire le fichier
    const seedFilePath = join(process.cwd(), 'src', 'database', 'seeds', 'todos.seed.ts');
    writeFileSync(seedFilePath, seedContent, 'utf-8');

    console.log(`✅ Fichier de seed créé: ${seedFilePath}\n`);
    console.log('📊 Résumé:');
    console.log(`   - ${todos.length} todo(s) exporté(s)`);
    console.log(`   - Statuts: ${[...new Set(todos.map(t => t.status))].join(', ')}`);
    console.log(`   - Assignés à: ${[...new Set(todos.map(t => t.assignedTo))].join(', ')}`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la génération du seed:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

generateTodosSeed();
