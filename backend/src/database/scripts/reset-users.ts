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
import { Location } from '../../entities/location.entity';
import { Category } from '../../entities/category.entity';
import { Course } from '../../entities/course.entity';
import { AcademyModule } from '../../entities/module.entity';
import { Video } from '../../entities/video.entity';
import { Goodie } from '../../entities/goodie.entity';
import { Culture } from '../../entities/culture.entity';

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
    Location,
    Category,
    BlogPost,
    Referral,
    CourseProgress,
    Course,
    AcademyModule,
    Video,
    BankTransferPayment,
    StripePayment,
    RefreshToken,
    LegacyPaymentVerification,
    Goodie,
    Culture,
  ],
  synchronize: false,
});

/**
 * Script pour réinitialiser tous les utilisateurs et leurs données associées
 * 
 * Ce script :
 * 1. Crée/met à jour un utilisateur superadmin
 * 2. Réassigner les goodies et cultures au superadmin (pour éviter les violations de contraintes)
 * 3. Supprime :
 *    - Toutes les transactions
 *    - Toutes les annonces du marketplace (listings)
 *    - Tous les articles de blog
 *    - Toutes les progressions de cours (course_progress)
 *    - Tous les parrainages (referrals)
 *    - Tous les paiements (bank_transfer_payments, stripe_payments, legacy_payment_verifications)
 *    - Tous les refresh tokens
 *    - Tous les utilisateurs (sauf le superadmin)
 * 
 * Superadmin créé :
 * - Email: alexismomcilovic@gmail.com
 * - Password: Alexis09
 * - Role: SUPERADMIN
 * - Solde: 50 Pūpū
 * 
 * ATTENTION: Ce script ne touche PAS aux données suivantes :
 * - Partenaires (partners)
 * - Academy (courses, academy_modules, videos) - seulement les progressions sont supprimées
 * - Goodies (réassignés au superadmin, pas supprimés)
 * - Vidéos culture (cultures) (réassignées au superadmin, pas supprimées)
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
    const goodieRepository = dataSource.getRepository(Goodie);
    const cultureRepository = dataSource.getRepository(Culture);
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
    const goodieCount = await goodieRepository.count();
    const cultureCount = await cultureRepository.count();
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
    console.log(`   Goodies: ${goodieCount}`);
    console.log(`   Vidéos culture: ${cultureCount}`);
    console.log(`   Utilisateurs: ${userCount}\n`);

    // ÉTAPE 0: Créer le superadmin en premier
    console.log('0️⃣  Création du superadmin...');
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
    
    // Générer un code de parrainage unique
    const referralCode = `SUPER${Date.now().toString(36).toUpperCase()}`;

    // Vérifier si le superadmin existe déjà
    let superadmin = await userRepository.findOne({ where: { email: SUPERADMIN_EMAIL } });
    
    if (superadmin) {
      // Mettre à jour l'utilisateur existant
      superadmin.password = hashedPassword;
      superadmin.role = UserRole.SUPERADMIN;
      superadmin.walletBalance = DEFAULT_BALANCE;
      superadmin.emailVerified = true;
      superadmin.isActive = true;
      superadmin.referralCode = referralCode;
      superadmin = await userRepository.save(superadmin);
      console.log(`   ✅ Superadmin mis à jour:`);
    } else {
      // Créer le superadmin
      superadmin = userRepository.create({
        email: SUPERADMIN_EMAIL,
        password: hashedPassword,
        role: UserRole.SUPERADMIN,
        walletBalance: DEFAULT_BALANCE,
        emailVerified: true,
        isActive: true,
        referralCode: referralCode,
      });
      superadmin = await userRepository.save(superadmin);
      console.log(`   ✅ Superadmin créé:`);
    }
    console.log(`      Email: ${superadmin.email}`);
    console.log(`      Role: ${superadmin.role}`);
    console.log(`      Solde: ${superadmin.walletBalance} 🐚`);
    console.log(`      Code de parrainage: ${superadmin.referralCode}\n`);

    // ÉTAPE 0.5: Réassigner les goodies et cultures au superadmin
    console.log('0️⃣.5️⃣ Réassignation des goodies et cultures au superadmin...');
    const goodiesUpdated = await goodieRepository
      .createQueryBuilder()
      .update(Goodie)
      .set({ createdById: superadmin.id })
      .where('createdById IS NOT NULL')
      .execute();
    console.log(`   ✅ ${goodiesUpdated.affected || 0} goodie(s) réassigné(s) au superadmin`);

    const culturesUpdated = await cultureRepository
      .createQueryBuilder()
      .update(Culture)
      .set({ createdById: superadmin.id })
      .where('createdById IS NOT NULL')
      .execute();
    console.log(`   ✅ ${culturesUpdated.affected || 0} vidéo(s) culture réassignée(s) au superadmin\n`);

    console.log('🗑️  Suppression des données...\n');

    // 1. Supprimer les transactions (référence User et Listing)
    console.log('1️⃣  Suppression des transactions...');
    await transactionRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${transactionCount} transaction(s) supprimée(s)\n`);

    // 2. Supprimer les annonces du marketplace (référence User)
    console.log('2️⃣  Suppression des annonces du marketplace...');
    await listingRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${listingCount} annonce(s) supprimée(s)\n`);

    // 3. Supprimer les articles de blog (référence User)
    console.log('3️⃣  Suppression des articles de blog...');
    await blogPostRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${blogPostCount} article(s) supprimé(s)\n`);

    // 4. Supprimer les progressions de cours (référence User, mais on garde les cours/modules/vidéos)
    console.log('4️⃣  Suppression des progressions de cours...');
    await courseProgressRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${courseProgressCount} progression(s) supprimée(s)\n`);

    // 5. Supprimer les parrainages (référence User)
    console.log('5️⃣  Suppression des parrainages...');
    await referralRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${referralCount} parrainage(s) supprimé(s)\n`);

    // 6. Supprimer les paiements par virement (référence User)
    console.log('6️⃣  Suppression des paiements par virement...');
    await bankTransferPaymentRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${bankTransferPaymentCount} paiement(s) supprimé(s)\n`);

    // 7. Supprimer les paiements Stripe (référence User)
    console.log('7️⃣  Suppression des paiements Stripe...');
    await stripePaymentRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${stripePaymentCount} paiement(s) supprimé(s)\n`);

    // 8. Supprimer les vérifications de paiements legacy (référence User)
    console.log('8️⃣  Suppression des vérifications de paiements legacy...');
    await legacyPaymentVerificationRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${legacyPaymentVerificationCount} vérification(s) supprimée(s)\n`);

    // 9. Supprimer les refresh tokens (référence User)
    console.log('9️⃣  Suppression des refresh tokens...');
    await refreshTokenRepository.createQueryBuilder().delete().execute();
    console.log(`   ✅ ${refreshTokenCount} refresh token(s) supprimé(s)\n`);

    // 10. Supprimer tous les utilisateurs SAUF le superadmin
    console.log('🔟 Suppression de tous les utilisateurs (sauf superadmin)...');
    const deletedUsers = await userRepository
      .createQueryBuilder()
      .delete()
      .where('id != :superadminId', { superadminId: superadmin.id })
      .execute();
    console.log(`   ✅ ${deletedUsers.affected || 0} utilisateur(s) supprimé(s)\n`);

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
    console.log(`   • ${goodiesUpdated.affected || 0} goodie(s) réassigné(s) au superadmin`);
    console.log(`   • ${culturesUpdated.affected || 0} vidéo(s) culture réassignée(s) au superadmin`);
    console.log(`   • ${deletedUsers.affected || 0} utilisateur(s) supprimé(s)`);
    console.log(`   • 1 superadmin créé/mis à jour\n`);

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
