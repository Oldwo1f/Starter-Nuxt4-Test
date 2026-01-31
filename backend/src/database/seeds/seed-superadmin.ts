import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';

export async function seedSuperAdmin(
  dataSource: DataSource,
  email: string,
  password: string,
): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  const existing = await userRepository.findOne({ where: { email } });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    existing.role = UserRole.SUPERADMIN;
    existing.password = hashedPassword;
    await userRepository.save(existing);
    console.log('✓ Superadmin updated:', existing.email);
    return;
  }

  const user = userRepository.create({
    email,
    password: hashedPassword,
    role: UserRole.SUPERADMIN,
  });
  const saved = await userRepository.save(user);
  console.log('✓ Superadmin created:', saved.email);
}

