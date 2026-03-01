import { DataSource } from 'typeorm';
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
    {
      title: "Les notifications",
      description: "être notifier en temps réel lorsqu'on a des verification de paiement a faire.",
      status: 'pour_plus_tard' as const,
      assignedTo: 'alexis' as const,
    },
    {
      title: "Photo Tamiga",
      description: "J'ai besoins d'une photo de toi Tamiga",
      status: 'en_cours' as const,
      assignedTo: 'tamiga' as const,
    },
    {
      title: "Calendly",
      description: "J'ai besoins de ton liens calendly.\nPense a le créer, ca devrais prendre que 10 minutes",
      status: 'en_cours' as const,
      assignedTo: 'tamiga' as const,
    },
    {
      title: "NOm de domaine .pf",
      description: "Il faut déposé le formulaire chez vini au plus vite",
      status: 'en_cours' as const,
      assignedTo: 'naho' as const,
    },
    {
      title: "Ajout de fonctionalité en temp réel",
      description: "Chat/messagerie\nNotification de paiement/ Notification de contact / de transfert de pupup /etc",
      status: 'pour_plus_tard' as const,
      assignedTo: 'alexis' as const,
    },
    {
      title: "Kikiri",
      description: null,
      status: 'pour_plus_tard' as const,
      assignedTo: 'alexis' as const,
    },
    {
      title: "Annuaire partenaire",
      description: "Tu a dit qu'il y avais des artisants partenaire.\nEs ce que tu as une liste?",
      status: 'en_cours' as const,
      assignedTo: 'naho' as const,
    },
    {
      title: "Emailing",
      description: "Prendre et installer un service email",
      status: 'en_cours' as const,
      assignedTo: 'alexis' as const,
    },
    {
      title: "Video",
      description: "tester amazon pour l hebergement de video ou trouver une autre solution",
      status: 'en_cours' as const,
      assignedTo: 'alexis' as const,
    },
    {
      title: "Academy ajouter formation crypto",
      description: null,
      status: 'en_cours' as const,
      assignedTo: 'alexis' as const,
    },
    {
      title: "Académy - systeme premium",
      description: "Refaire le systeme premium pour laisser l'acces au premier module avant de bloquer.",
      status: 'en_cours' as const,
      assignedTo: 'alexis' as const,
    },
    {
      title: "Annonce de recherche",
      description: "Donner la possibilité de mettre des annonce de recherche.\neg: \nRecher poisson pour vendredi\nRecherche un Seira pour m'aider a poser mon carlage ce dimanche.",
      status: 'pour_plus_tard' as const,
      assignedTo: 'alexis' as const,
    }
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
    console.log(`  ✓ Created: ${todo.title} (${status}, ${assignedTo})`);
  }

  console.log(`✓ Created ${todos.length} todos`);
}
