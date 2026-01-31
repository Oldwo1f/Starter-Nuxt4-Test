import { DataSource } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { BlogPost } from '../../entities/blog-post.entity';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const blogPostRepository = dataSource.getRepository(BlogPost);

  // Clear existing data (if tables exist)
  try {
    // Supprimer d'abord les blog posts (pour respecter les contraintes de clé étrangère)
    await dataSource.query('DELETE FROM blog_posts');
    // Puis supprimer tous les utilisateurs
    await dataSource.query('DELETE FROM users');
    console.log('✓ Existing data cleared');
  } catch (error) {
    // Tables might not exist yet, that's okay
    console.log('Note: Tables will be created automatically');
  }

  // Create superadmin
  const superAdminPassword = await bcrypt.hash('Alexis09', 10);
  const superAdmin = userRepository.create({
    email: 'alexismomcilovic@gmail.com',
    password: superAdminPassword,
    role: UserRole.SUPERADMIN,
  });
  const savedSuperAdmin = await userRepository.save(superAdmin);
  console.log('✓ Super Admin created:', savedSuperAdmin.email);

  // Create admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = userRepository.create({
    email: 'admin@example.com',
    password: adminPassword,
    role: UserRole.ADMIN,
  });
  const savedAdmin = await userRepository.save(admin);
  console.log('✓ Admin created:', savedAdmin.email);

  // Create regular users with various roles
  const usersData = [
    { email: 'user1@example.com', password: 'user123', role: UserRole.USER },
    { email: 'user2@example.com', password: 'user123', role: UserRole.USER },
    { email: 'user3@example.com', password: 'user123', role: UserRole.MEMBER },
    { email: 'user4@example.com', password: 'user123', role: UserRole.MEMBER },
    { email: 'user5@example.com', password: 'user123', role: UserRole.PREMIUM },
    { email: 'user6@example.com', password: 'user123', role: UserRole.PREMIUM },
    { email: 'user7@example.com', password: 'user123', role: UserRole.VIP },
    { email: 'user8@example.com', password: 'user123', role: UserRole.VIP },
    { email: 'user9@example.com', password: 'user123', role: UserRole.MODERATOR },
    { email: 'user10@example.com', password: 'user123', role: UserRole.USER },
    { email: 'user11@example.com', password: 'user123', role: UserRole.MEMBER },
    { email: 'user12@example.com', password: 'user123', role: UserRole.PREMIUM },
    { email: 'user13@example.com', password: 'user123', role: UserRole.USER },
    { email: 'user14@example.com', password: 'user123', role: UserRole.VIP },
  ];

  const savedUsers: User[] = [];
  for (const userData of usersData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = userRepository.create({
      email: userData.email,
      password: hashedPassword,
      role: userData.role || UserRole.USER,
    });
    const savedUser = await userRepository.save(user);
    savedUsers.push(savedUser);
    console.log(`✓ User created: ${savedUser.email} (${savedUser.role})`);
  }

  // Create blog posts
  const blogPostsData = [
    {
      title: 'Bienvenue sur Nuna Heritage',
      content: 'Ceci est le premier article de blog de notre plateforme. Nous sommes ravis de vous accueillir et de partager avec vous notre passion pour le patrimoine culturel.',
      authorId: savedSuperAdmin.id,
    },
    {
      title: 'L\'importance du patrimoine culturel',
      content: 'Le patrimoine culturel représente l\'héritage d\'une communauté, transmis de génération en génération. Il est essentiel de le préserver pour les générations futures.',
      authorId: savedUsers[0].id,
    },
    {
      title: 'Techniques de préservation',
      content: 'La préservation du patrimoine nécessite des techniques spécifiques et une expertise approfondie. Dans cet article, nous explorons les différentes méthodes utilisées.',
      authorId: savedUsers[1].id,
    },
    {
      title: 'Histoire et traditions',
      content: 'Les traditions sont le reflet de notre histoire. Elles nous connectent à nos ancêtres et nous aident à comprendre notre identité culturelle.',
      authorId: savedUsers[0].id,
    },
    {
      title: 'Patrimoine mondial de l\'UNESCO',
      content: 'Découvrez les sites du patrimoine mondial de l\'UNESCO et leur importance dans la préservation de la culture humaine à travers le monde.',
      authorId: savedUsers[2].id,
    },
    {
      title: 'Technologie et patrimoine',
      content: 'Comment la technologie moderne peut-elle aider à préserver et à documenter le patrimoine culturel ? Explorons les innovations dans ce domaine.',
      authorId: savedSuperAdmin.id,
    },
    {
      title: 'Engagement communautaire',
      content: 'L\'engagement de la communauté est crucial pour la préservation du patrimoine. Découvrez comment vous pouvez contribuer à cette noble cause.',
      authorId: savedUsers[3].id,
    },
  ];

  for (const postData of blogPostsData) {
    const blogPost = blogPostRepository.create(postData);
    const savedPost = await blogPostRepository.save(blogPost);
    console.log('✓ Blog post created:', savedPost.title);
  }

  console.log('\n✅ Database seeding completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Super Admin: alexismomcilovic@gmail.com / Alexis09');
  console.log('   Admin: admin@example.com / admin123');
  console.log('   Users (password: user123):');
  console.log('          user1@example.com (user)');
  console.log('          user2@example.com (user)');
  console.log('          user3@example.com (member)');
  console.log('          user4@example.com (member)');
  console.log('          user5@example.com (premium)');
  console.log('          user6@example.com (premium)');
  console.log('          user7@example.com (vip)');
  console.log('          user8@example.com (vip)');
  console.log('          user9@example.com (moderator)');
  console.log('          user10@example.com (user)');
  console.log('          user11@example.com (member)');
  console.log('          user12@example.com (premium)');
  console.log('          user13@example.com (user)');
  console.log('          user14@example.com (vip)');
}

