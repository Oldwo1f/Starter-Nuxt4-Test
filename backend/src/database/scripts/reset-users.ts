import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Listing } from '../../entities/listing.entity';
import { BlogPost } from '../../entities/blog-post.entity';
import { Referral } from '../../entities/referral.entity';
import { CourseProgress } from '../../entities/course-progress.entity';
import { BankTransferPayment } from '../../entities/bank-transfer-payment.entity';
import { StripePayment } from '../../entities/stripe-payment.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { LegacyPaymentVerification } from '../../entities/legacy-payment-verification.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nunaheritage',
  entities: [
    User,
    Transaction,
    Listing,
    BlogPost,
    Referral,
    CourseProgress,
    BankTransferPayment,
    StripePayment,
    RefreshToken,
    LegacyPaymentVerification,
  ],
  synchronize: false,
});

/**
 * Script pour réinitialiser tous les utilisateurs et leurs données associées
 * 
 * Ce script supprime :
 * - Toutes les transactions
 * - Toutes les annonces du marketplace (listings)
 * - Tous les articles de blog
 * - Toutes les progressions de cours (course_progress)
 * - Tous les parrainages (referrals)
 * - Tous les paiements (bank_transfer_payments, stripe_payments, legacy_payment_verifications)
 * - Tous les refresh tokens
 * - Tous les utilisateurs
 * 
 * Puis crée un utilisateur superadmin :
 * - Email: alexismomcilovic@gmail.com
 * - Password: Alexis09
 * - Role: SUPERADMIN
 * 
 * ATTENTION: Ce script ne touche PAS aux données suivantes :
 * - Partenaires (partners)
 * - Academy (courses, academy_modules, videos) - seulement les progressions sont supprimées
 * - Goodies
 * - Vidéos culture (cultures)
 * - Todos
 */
async function resetUsers() {
  try {
    console.log('🔄 Démarrage de la réinitialisation des utilisateurs...\n');
    
    await dataSource.initialize();
    console.log('✓ Connexion à la base de données établie\n');

    const transactionRepository = dataSource.getRepository(Transaction);
    const listingRepository = dataSource.getRepository(Listing);
    const blogPostRepository = dataSource.getRepository(BlogPost);
    const referralRepository = dataSource.getRepository(Referral);
    const courseProgressRepository = dataSource.getRepository(CourseProgress);
    const bankTransferPaymentRepository = dataSource.getRepository(BankTransferPayment);
    const stripePaymentRepository = dataSource.getRepository(StripePayment);
    const refreshTokenRepository = dataSource.getRepository(RefreshToken);
    const legacyPaymentVerificationRepository = dataSource.getRepository(LegacyPaymentVerification);
    const userRepository = dataSource.getRepository(User);

    // Configuration du superadmin
    const SUPERADMIN_EMAIL = 'alexismomcilovic@gmail.com';
    const SUPERADMIN_PASSWORD = 'Alexis09';
    const DEFAULT_BALANCE = 50; // Solde initial en Pūpū

    console.log('📊 Statistiques avant suppression:');
    console.log('─'.repeat(60));
    
    const transactionCount = await transactionRepository.count();
    const listingCount = await listingRepository.count();
    const blogPostCount = await blogPostRepository.count();
    const referralCount = await referralRepository.count();
    const courseProgressCount = await courseProgressRepository.count();
    const bankTransferPaymentCount = await bankTransferPaymentRepository.count();
    const stripePaymentCount = await stripePaymentRepository.count();
    const legacyPaymentVerificationCount = await legacyPaymentVerificationRepository.count();
    const refreshTokenCount = await refreshTokenRepository.count();
    const userCount = await userRepository.count();

    console.log(`   Transactions: ${transactionCount}`);
    console.log(`   Annonces (marketplace): ${listingCount}`);
    console.log(`   Articles de blog: ${blogPostCount}`);
    console.log(`   Progressions de cours: ${courseProgressCount}`);
    console.log(`   Parrainages: ${referralCount}`);
    console.log(`   Paiements virement: ${bankTransferPaymentCount}`);
    console.log(`   Paiements Stripe: ${stripePaymentCount}`);
    console.log(`   Vérifications paiements legacy: ${legacyPaymentVerificationCount}`);
    console.log(`   Refresh tokens: ${refreshTokenCount}`);
    console.log(`   Utilisateurs: ${userCount}\n`);

    console.log('🗑️  Suppression des données...\n');

    // 1. Supprimer les transactions (référence User et Listing)
    console.log('1️⃣  Suppression des transactions...');
    await transactionRepository.delete({});
    console.log(`   ✅ ${transactionCount} transaction(s) supprimée(s)\n`);

    // 2. Supprimer les annonces du marketplace (référence User)
    console.log('2️⃣  Suppression des annonces du marketplace...');
    await listingRepository.delete({});
    console.log(`   ✅ ${listingCount} annonce(s) supprimée(s)\n`);

    // 3. Supprimer les articles de blog (référence User)
    console.log('3️⃣  Suppression des articles de blog...');
    await blogPostRepository.delete({});
    console.log(`   ✅ ${blogPostCount} article(s) supprimé(s)\n`);

    // 4. Supprimer les progressions de cours (référence User, mais on garde les cours/modules/vidéos)
    console.log('4️⃣  Suppression des progressions de cours...');
    await courseProgressRepository.delete({});
    console.log(`   ✅ ${courseProgressCount} progression(s) supprimée(s)\n`);

    // 5. Supprimer les parrainages (référence User)
    console.log('5️⃣  Suppression des parrainages...');
    await referralRepository.delete({});
    console.log(`   ✅ ${referralCount} parrainage(s) supprimé(s)\n`);

    // 6. Supprimer les paiements par virement (référence User)
    console.log('6️⃣  Suppression des paiements par virement...');
    await bankTransferPaymentRepository.delete({});
    console.log(`   ✅ ${bankTransferPaymentCount} paiement(s) supprimé(s)\n`);

    // 7. Supprimer les paiements Stripe (référence User)
    console.log('7️⃣  Suppression des paiements Stripe...');
    await stripePaymentRepository.delete({});
    console.log(`   ✅ ${stripePaymentCount} paiement(s) supprimé(s)\n`);

    // 8. Supprimer les vérifications de paiements legacy (référence User)
    console.log('8️⃣  Suppression des vérifications de paiements legacy...');
    await legacyPaymentVerificationRepository.delete({});
    console.log(`   ✅ ${legacyPaymentVerificationCount} vérification(s) supprimée(s)\n`);

    // 9. Supprimer les refresh tokens (référence User)
    console.log('9️⃣  Suppression des refresh tokens...');
    await refreshTokenRepository.delete({});
    console.log(`   ✅ ${refreshTokenCount} refresh token(s) supprimé(s)\n`);

    // 10. Supprimer tous les utilisateurs
    console.log('🔟 Suppression de tous les utilisateurs...');
    await userRepository.delete({});
    console.log(`   ✅ ${userCount} utilisateur(s) supprimé(s)\n`);

    // 11. Créer le superadmin
    console.log('1️⃣1️⃣ Création du superadmin...');
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
    
    // Générer un code de parrainage unique
    const referralCode = `SUPER${Date.now().toString(36).toUpperCase()}`;

    const superadmin = userRepository.create({
      email: SUPERADMIN_EMAIL,
      password: hashedPassword,
      role: UserRole.SUPERADMIN,
      walletBalance: DEFAULT_BALANCE,
      emailVerified: true,
      isActive: true,
      referralCode: referralCode,
    });

    const savedSuperadmin = await userRepository.save(superadmin);
    console.log(`   ✅ Superadmin créé:`);
    console.log(`      Email: ${savedSuperadmin.email}`);
    console.log(`      Role: ${savedSuperadmin.role}`);
    console.log(`      Solde: ${savedSuperadmin.walletBalance} 🐚`);
    console.log(`      Code de parrainage: ${savedSuperadmin.referralCode}\n`);

    console.log('='.repeat(60));
    console.log('\n✅ Réinitialisation terminée avec succès!');
    console.log('\n📝 Récapitulatif:');
    console.log(`   • ${transactionCount} transaction(s) supprimée(s)`);
    console.log(`   • ${listingCount} annonce(s) supprimée(s)`);
    console.log(`   • ${blogPostCount} article(s) supprimé(s)`);
    console.log(`   • ${courseProgressCount} progression(s) supprimée(s)`);
    console.log(`   • ${referralCount} parrainage(s) supprimé(s)`);
    console.log(`   • ${bankTransferPaymentCount} paiement(s) virement supprimé(s)`);
    console.log(`   • ${stripePaymentCount} paiement(s) Stripe supprimé(s)`);
    console.log(`   • ${legacyPaymentVerificationCount} vérification(s) paiement legacy supprimée(s)`);
    console.log(`   • ${refreshTokenCount} refresh token(s) supprimé(s)`);
    console.log(`   • ${userCount} utilisateur(s) supprimé(s)`);
    console.log(`   • 1 superadmin créé\n`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la réinitialisation:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    await dataSource.destroy();
    process.exit(1);
  }
}

resetUsers();
