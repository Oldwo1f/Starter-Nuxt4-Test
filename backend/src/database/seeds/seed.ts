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

  // Fixed balance: 50 Pūpū for all users
  const DEFAULT_BALANCE = 50;

  // Helper function to get Unsplash avatar URL (square format)
  const getUnsplashAvatar = (photoId: string) => {
    return `https://images.unsplash.com/photo-${photoId}?w=400&h=400&fit=crop`;
  };

  // Helper function to get or create user
  const getOrCreateUser = async (
    email: string,
    password: string,
    role: UserRole,
    firstName?: string | null,
    lastName?: string | null,
    avatarImage?: string | null,
    commune?: string | null,
    contactPreferences?: {
      order: string[];
      accounts: {
        messenger?: string;
        telegram?: string;
        whatsapp?: string;
      };
    } | null
  ) => {
    let user = await userRepository.findOne({ where: { email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = userRepository.create({
        email,
        password: hashedPassword,
        role,
        walletBalance: DEFAULT_BALANCE,
        firstName: firstName || null,
        lastName: lastName || null,
        avatarImage: avatarImage || null,
        commune: commune || null,
        contactPreferences: contactPreferences || null,
      });
      user = await userRepository.save(user);
      console.log(`✓ User created: ${user.email} (${user.role}) - ${user.walletBalance} 🐚`);
    } else {
      // Update balance and profile info if user exists
      let updated = false;
      if (user.walletBalance !== DEFAULT_BALANCE) {
        user.walletBalance = DEFAULT_BALANCE;
        updated = true;
      }
      if (firstName && user.firstName !== firstName) {
        user.firstName = firstName;
        updated = true;
      }
      if (lastName && user.lastName !== lastName) {
        user.lastName = lastName;
        updated = true;
      }
      if (avatarImage && user.avatarImage !== avatarImage) {
        user.avatarImage = avatarImage;
        updated = true;
      }
      if (commune && user.commune !== commune) {
        user.commune = commune;
        updated = true;
      }
      if (contactPreferences && JSON.stringify(user.contactPreferences) !== JSON.stringify(contactPreferences)) {
        user.contactPreferences = contactPreferences;
        updated = true;
      }
      if (role && user.role !== role) {
        user.role = role;
        updated = true;
      }
      if (updated) {
        user = await userRepository.save(user);
        console.log(`✓ User updated: ${user.email} (${user.role}) - ${user.walletBalance} 🐚`);
      } else {
        console.log(`✓ User already exists: ${user.email} (${user.role}) - ${user.walletBalance} 🐚`);
      }
    }
    return user;
  };

  // Create superadmin
  const savedSuperAdmin = await getOrCreateUser(
    'alexismomcilovic@gmail.com',
    'Alexis09',
    UserRole.SUPERADMIN,
    'Alexis',
    'Momcilovic',
    getUnsplashAvatar('1507003211169-0a1dd7228f2d')
  );

  // Create admin
  const savedAdmin = await getOrCreateUser(
    'admin@example.com',
    'admin123',
    UserRole.ADMIN,
    'Marie',
    'Dupont',
    getUnsplashAvatar('1573496359142-b8d87734a5a2')
  );

  // Create regular users with various roles
  const usersData = [
    {
      email: 'user1@example.com',
      password: 'user123',
      role: UserRole.MEMBER,
      firstName: 'Teva',
      lastName: 'Tama',
      avatarImage: getUnsplashAvatar('1500648767791-00dcc994a43e'),
      commune: 'Papeete',
      contactPreferences: {
        order: ['whatsapp', 'messenger', 'telegram'],
        accounts: {
          whatsapp: '+689 87 12 34 56',
        },
      },
    },
    {
      email: 'user2@example.com',
      password: 'user123',
      role: UserRole.PREMIUM,
      firstName: 'Sophie',
      lastName: 'Martin',
      avatarImage: getUnsplashAvatar('1438761681033-6461ffad8d80'),
      commune: 'Punaauia',
      contactPreferences: {
        order: ['whatsapp', 'messenger'],
        accounts: {
          whatsapp: '+689 87 65 43 21',
        },
      },
    },
    {
      email: 'user3@example.com',
      password: 'user123',
      role: UserRole.VIP,
      firstName: 'Hinano',
      lastName: 'Tehei',
      avatarImage: getUnsplashAvatar('1531425384884-0c0c0c0c0c0c'),
      commune: 'Bora-Bora',
      contactPreferences: {
        order: ['whatsapp', 'telegram', 'messenger'],
        accounts: {
          whatsapp: '+689 87 98 76 54',
        },
      },
    },
    {
      email: 'user4@example.com',
      password: 'user123',
      role: UserRole.MODERATOR,
      firstName: 'Lucas',
      lastName: 'Bernard',
      avatarImage: getUnsplashAvatar('1539571690997-28b0d0c0c0c0'),
      commune: 'Moorea-Maiao',
      contactPreferences: {
        order: ['whatsapp', 'messenger'],
        accounts: {
          whatsapp: '+689 87 11 22 33',
        },
      },
    },
    {
      email: 'user5@example.com',
      password: 'user123',
      role: UserRole.PREMIUM,
      firstName: 'Manaarii',
      lastName: 'Temauri',
      avatarImage: getUnsplashAvatar('1472099645785-5658abf4ff4e'),
    },
    {
      email: 'user6@example.com',
      password: 'user123',
      role: UserRole.PREMIUM,
      firstName: 'Emma',
      lastName: 'Petit',
      avatarImage: getUnsplashAvatar('1494790108377-be9c29b29330'),
    },
    {
      email: 'user7@example.com',
      password: 'user123',
      role: UserRole.VIP,
      firstName: 'Tahiri',
      lastName: 'Ariitai',
      avatarImage: getUnsplashAvatar('1502823403499-6ccfcf4fb453'),
    },
    {
      email: 'user8@example.com',
      password: 'user123',
      role: UserRole.VIP,
      firstName: 'Camille',
      lastName: 'Dubois',
      avatarImage: getUnsplashAvatar('1517841905240-472988babdf9'),
    },
    {
      email: 'user9@example.com',
      password: 'user123',
      role: UserRole.MODERATOR,
      firstName: 'Jean',
      lastName: 'Moreau',
      avatarImage: getUnsplashAvatar('1506794778202-cad84cf45f1d'),
    },
    {
      email: 'user10@example.com',
      password: 'user123',
      role: UserRole.USER,
      firstName: 'Vaihere',
      lastName: 'Temarama',
      avatarImage: getUnsplashAvatar('1534528741776-53994a69daeb'),
    },
    {
      email: 'user11@example.com',
      password: 'user123',
      role: UserRole.MEMBER,
      firstName: 'Thomas',
      lastName: 'Lefebvre',
      avatarImage: getUnsplashAvatar('1502823403499-6ccfcf4fb453'),
    },
    {
      email: 'user12@example.com',
      password: 'user123',
      role: UserRole.PREMIUM,
      firstName: 'Heiata',
      lastName: 'Tauraa',
      avatarImage: getUnsplashAvatar('1508214751196-b9a298eeb90e'),
    },
    {
      email: 'user13@example.com',
      password: 'user123',
      role: UserRole.USER,
      firstName: 'Julie',
      lastName: 'Garcia',
      avatarImage: getUnsplashAvatar('1534528741776-53994a69daeb'),
    },
    {
      email: 'user14@example.com',
      password: 'user123',
      role: UserRole.VIP,
      firstName: 'Tama',
      lastName: 'Tepano',
      avatarImage: getUnsplashAvatar('1506794778202-cad84cf45f1d'),
    },
  ];

  const savedUsers: User[] = [];
  for (const userData of usersData) {
    const user = await getOrCreateUser(
      userData.email,
      userData.password,
      userData.role || UserRole.USER,
      userData.firstName,
      userData.lastName,
      userData.avatarImage,
      userData.commune,
      userData.contactPreferences
    );
    savedUsers.push(user);
  }

  // Helper function to get Unsplash image URL (800x600, ratio 4/3)
  const getUnsplashImage = (photoId: string) => {
    return `https://images.unsplash.com/photo-${photoId}?w=800&h=600&fit=crop`;
  };

  // Create blog posts with images and videos
  // Using real Unsplash photo IDs with 800x600 dimensions (4/3 ratio)
  const blogPostsData = [
    {
      title: 'Bienvenue sur Nuna Heritage',
      content: 'Ceci est le premier article de blog de notre plateforme. Nous sommes ravis de vous accueillir et de partager avec vous notre passion pour le patrimoine culturel.\n\nNotre mission est de préserver et de valoriser le patrimoine culturel de la Polynésie française. À travers cette plateforme, nous souhaitons créer une communauté engagée dans la protection de notre héritage commun.',
      authorId: savedSuperAdmin.id,
      images: [
        getUnsplashImage('1515886657613-9f3515b0c78f'), // Island/tropical
        getUnsplashImage('1506905925346-21bda4d32df4'), // Ocean/island
        getUnsplashImage('1469474968028-36686e3eaa7f'), // Tropical beach
      ],
    },
    {
      title: 'L\'importance du patrimoine culturel',
      content: 'Le patrimoine culturel représente l\'héritage d\'une communauté, transmis de génération en génération. Il est essentiel de le préserver pour les générations futures.\n\nLe patrimoine culturel englobe les monuments, les sites historiques, les traditions orales, les expressions artistiques, les pratiques sociales et bien plus encore. Chaque élément contribue à façonner notre identité collective.',
      authorId: savedUsers[0].id,
      images: [
        getUnsplashImage('1519681393784-d120267933ba'), // Heritage/monument
        getUnsplashImage('1469474968028-36686e3eaa7f'), // Ancient architecture
      ],
    },
    {
      title: 'Techniques de préservation',
      content: 'La préservation du patrimoine nécessite des techniques spécifiques et une expertise approfondie. Dans cet article, nous explorons les différentes méthodes utilisées.\n\nLes techniques modernes de préservation combinent savoir-faire traditionnel et innovations technologiques. De la restauration des monuments à la numérisation des archives, chaque méthode a son importance.',
      authorId: savedUsers[1].id,
      images: [
        getUnsplashImage('1513475382585-d06e58bcb0e0'), // Museum/art
        getUnsplashImage('1469474968028-36686e3eaa7f'), // Artifacts
        getUnsplashImage('1515886657613-9f3515b0c78f'), // Documentation
      ],
    },
    {
      title: 'Histoire et traditions polynésiennes',
      content: 'Les traditions sont le reflet de notre histoire. Elles nous connectent à nos ancêtres et nous aident à comprendre notre identité culturelle.\n\nLa Polynésie française regorge de traditions ancestrales : la danse, la musique, l\'artisanat, la navigation traditionnelle. Chaque île possède ses propres spécificités culturelles qui méritent d\'être préservées et transmises.',
      authorId: savedUsers[0].id,
      images: [
        getUnsplashImage('1515886657613-9f3515b0c78f'), // Culture/tradition
        getUnsplashImage('1506905925346-21bda4d32df4'), // Ceremony
      ],
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Exemple YouTube
    },
    {
      title: 'Patrimoine mondial de l\'UNESCO',
      content: 'Découvrez les sites du patrimoine mondial de l\'UNESCO et leur importance dans la préservation de la culture humaine à travers le monde.\n\nL\'UNESCO a classé de nombreux sites en Polynésie française au patrimoine mondial. Ces reconnaissances internationales soulignent l\'importance universelle de notre patrimoine et encouragent sa protection.',
      authorId: savedUsers[2].id,
      images: [
        getUnsplashImage('1519681393784-d120267933ba'), // UNESCO site
      ],
    },
    {
      title: 'Technologie et patrimoine : une alliance moderne',
      content: 'Comment la technologie moderne peut-elle aider à préserver et à documenter le patrimoine culturel ? Explorons les innovations dans ce domaine.\n\nLa numérisation 3D, la réalité virtuelle, les bases de données numériques : autant d\'outils qui permettent de documenter, préserver et rendre accessible notre patrimoine. Cette vidéo présente quelques projets innovants.',
      authorId: savedSuperAdmin.id,
      videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Exemple YouTube
    },
    {
      title: 'Engagement communautaire',
      content: 'L\'engagement de la communauté est crucial pour la préservation du patrimoine. Découvrez comment vous pouvez contribuer à cette noble cause.\n\nChaque membre de la communauté peut apporter sa pierre à l\'édifice. Que ce soit par le bénévolat, le partage de connaissances ou le soutien financier, toutes les contributions comptent pour préserver notre héritage commun.',
      authorId: savedUsers[3].id,
      images: [
        getUnsplashImage('1469474968028-36686e3eaa7f'), // Community
        getUnsplashImage('1515886657613-9f3515b0c78f'), // People together
      ],
    },
    {
      title: 'Les sites archéologiques de Polynésie',
      content: 'La Polynésie française abrite de nombreux sites archéologiques témoignant de l\'histoire ancienne de ces îles. Des marae aux pétroglyphes, découvrez ces trésors cachés.\n\nCes sites archéologiques sont des témoins précieux de la civilisation polynésienne. Leur étude permet de mieux comprendre l\'organisation sociale, les croyances et les pratiques de nos ancêtres.',
      authorId: savedUsers[1].id,
      images: [
        getUnsplashImage('1469474968028-36686e3eaa7f'), // Archaeology
        getUnsplashImage('1515886657613-9f3515b0c78f'), // Ancient ruins
        getUnsplashImage('1506905925346-21bda4d32df4'), // Stone monument
      ],
    },
  ];

  for (const postData of blogPostsData) {
    const blogPost = blogPostRepository.create({
      title: postData.title,
      content: postData.content,
      authorId: postData.authorId,
      images: postData.images || [],
      videoUrl: postData.videoUrl || null,
    });
    const savedPost = await blogPostRepository.save(blogPost);
    const mediaInfo: string[] = [];
    if (savedPost.images && savedPost.images.length > 0) {
      mediaInfo.push(`${savedPost.images.length} image(s)`);
    }
    if (savedPost.videoUrl) {
      mediaInfo.push('vidéo YouTube');
    }
    console.log(`✓ Blog post created: ${savedPost.title}${mediaInfo.length > 0 ? ` (${mediaInfo.join(', ')})` : ''}`);
  }

  console.log('\n✅ Database seeding completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Super Admin: alexismomcilovic@gmail.com / Alexis09');
  console.log('   Admin: admin@example.com / admin123');
  console.log('   Users (password: user123):');
  console.log('          user1@example.com (member)');
  console.log('          user2@example.com (premium)');
  console.log('          user3@example.com (vip)');
  console.log('          user4@example.com (moderator)');
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

