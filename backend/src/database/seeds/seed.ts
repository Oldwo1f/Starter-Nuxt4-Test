import { DataSource } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { BlogPost } from '../../entities/blog-post.entity';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const blogPostRepository = dataSource.getRepository(BlogPost);

  // Clear existing blog posts (keep users to preserve wallet balances)
  try {
    await dataSource.query('DELETE FROM blog_posts');
    console.log('✓ Existing blog posts cleared');
  } catch (error) {
    console.log('Note: Blog posts table will be created automatically');
  }

  // Fixed balance: 50 coquillages for all users
  const DEFAULT_BALANCE = 50;

  // Helper function to get or create user
  const getOrCreateUser = async (email: string, password: string, role: UserRole) => {
    let user = await userRepository.findOne({ where: { email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = userRepository.create({
        email,
        password: hashedPassword,
        role,
        walletBalance: DEFAULT_BALANCE,
      });
      user = await userRepository.save(user);
      console.log(`✓ User created: ${user.email} (${user.role}) - ${user.walletBalance} 🐚`);
    } else {
      // Update balance to 50 if user exists but doesn't have the default balance
      if (user.walletBalance !== DEFAULT_BALANCE) {
        user.walletBalance = DEFAULT_BALANCE;
        user = await userRepository.save(user);
        console.log(`✓ User updated: ${user.email} - ${user.walletBalance} 🐚`);
      } else {
        console.log(`✓ User already exists: ${user.email} - ${user.walletBalance} 🐚`);
      }
    }
    return user;
  };

  // Create superadmin
  const savedSuperAdmin = await getOrCreateUser('alexismomcilovic@gmail.com', 'Alexis09', UserRole.SUPERADMIN);

  // Create admin
  const savedAdmin = await getOrCreateUser('admin@example.com', 'admin123', UserRole.ADMIN);

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
    const user = await getOrCreateUser(userData.email, userData.password, userData.role || UserRole.USER);
    savedUsers.push(user);
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

