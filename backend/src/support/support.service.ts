import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { CreateSupportRequestDto, SupportCategory } from './dto/create-support-request.dto';

type SupportUser = {
  id?: number | string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
};

@Injectable()
export class SupportService {
  private readonly techEmail = process.env.SUPPORT_TECH_EMAIL || 'alexismomcilovic@gmail.com';
  private readonly bizEmail = process.env.SUPPORT_BIZ_EMAIL || 'nunaaheritage@gmail.com';

  constructor(private readonly emailService: EmailService) {}

  private toRecipient(category: SupportCategory): string {
    return category === SupportCategory.TECHNICAL ? this.techEmail : this.bizEmail;
  }

  private categoryLabel(category: SupportCategory): string {
    return category === SupportCategory.TECHNICAL ? 'Support technique' : 'Support commercial';
  }

  async createSupportRequest(user: SupportUser, dto: CreateSupportRequestDto): Promise<void> {
    const to = this.toRecipient(dto.category);
    const subject = `[Nuna Heritage] ${this.categoryLabel(dto.category)} — ${user?.email || 'Utilisateur'}`;

    const identity = [
      `User ID: ${user?.id ?? 'unknown'}`,
      `Email: ${user?.email ?? 'unknown'}`,
      `Nom: ${(user?.firstName || '').trim()} ${(user?.lastName || '').trim()}`.trim(),
      `Role: ${user?.role ?? 'unknown'}`,
      `Catégorie: ${dto.category}`,
      '',
    ].join('\n');

    const textContent = `${identity}${dto.message}\n`;
    await this.emailService.sendSupportTicket(to, subject, textContent);
  }
}

