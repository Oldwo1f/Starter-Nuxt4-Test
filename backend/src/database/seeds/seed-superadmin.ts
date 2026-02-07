import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';

export async function seedSuperAdmin(
  dataSource: DataSource,
  email: string,
  password: string,
): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  // Fixed balance: 50 Pūpū
  const DEFAULT_BALANCE = 50;

  const existing = await userRepository.findOne({ where: { email } });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    existing.role = UserRole.SUPERADMIN;
    existing.password = hashedPassword;
    existing.walletBalance = DEFAULT_BALANCE;
    await userRepository.save(existing);
    console.log(`✓ Superadmin updated: ${existing.email} - ${existing.walletBalance} 🐚`);
    return;
  }

  const user = userRepository.create({
    email,
    password: hashedPassword,
    role: UserRole.SUPERADMIN,
    walletBalance: DEFAULT_BALANCE,
  });
  const saved = await userRepository.save(user);
  console.log(`✓ Superadmin created: ${saved.email} - ${saved.walletBalance} 🐚`);
}

