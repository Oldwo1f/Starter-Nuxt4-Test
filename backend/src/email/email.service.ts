import { Injectable, Logger } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

export interface EmailAttachment {
  content: string; // base64
  name: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevoClient: BrevoClient | null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY not configured. Email sending will be disabled.');
      this.brevoClient = null;
    } else {
      this.logger.log(`Brevo API initialized with API key: ${apiKey.substring(0, 8)}...`);
      this.brevoClient = new BrevoClient({
        apiKey: apiKey,
      });
    }

    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@nunaheritage.com';
    this.fromName = process.env.BREVO_FROM_NAME || 'Nuna Heritage';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    this.logger.log(`Email service configured - FROM: ${this.fromEmail} (${this.fromName}), Frontend URL: ${this.frontendUrl}`);
    this.logger.log(`Email format: ${this.usePlainTextOnly ? 'plain text only (EMAIL_TEXT_ONLY)' : 'HTML + text'}`);
  }

  /**
   * When true, emails are sent as plain text only (no HTML).
   * Set EMAIL_TEXT_ONLY=false in env to restore HTML emails.
   */
  private get usePlainTextOnly(): boolean {
    const val = process.env.EMAIL_TEXT_ONLY;
    return val === undefined || val === '' || val.toLowerCase() === 'true' || val === '1';
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    attachments?: EmailAttachment[],
  ): Promise<void> {
    if (!this.brevoClient) {
      this.logger.warn('Brevo API not initialized. Email not sent.');
      this.logger.debug(`Would send email to ${to}: ${subject}`);
      return;
    }

    const plainText = textContent || this.stripHtml(htmlContent);

    try {
      this.logger.log(`Attempting to send email to ${to} from ${this.fromEmail} (${this.fromName})`);
      
      const payload: Parameters<BrevoClient['transactionalEmails']['sendTransacEmail']>[0] = {
        subject,
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: to }],
      };

      if (this.usePlainTextOnly) {
        payload.textContent = plainText;
        this.logger.debug('Sending plain text email (EMAIL_TEXT_ONLY)');
      } else {
        payload.htmlContent = htmlContent;
        payload.textContent = plainText;
      }

      if (attachments?.length) {
        payload.attachment = attachments.map((a) => ({ content: a.content, name: a.name }));
      }

      const result = await this.brevoClient.transactionalEmails.sendTransacEmail(payload);

      this.logger.log(`Email sent successfully to ${to}. Message ID: ${result.messageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}:`, {
        message: error.message,
        statusCode: error.statusCode,
        body: error.body,
        response: error.response?.data || error.response,
        stack: error.stack,
      });
      throw error;
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  async sendEmailVerification(email: string, firstName: string | null, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    const subject = 'Confirmez votre adresse email - Nuna Heritage';
    
    const htmlContent = this.getEmailVerificationTemplate(firstName, verificationUrl);
    const textContent = this.getEmailVerificationTextTemplate(firstName, verificationUrl);

    await this.sendEmail(email, subject, htmlContent, textContent);
  }

  async sendPasswordReset(email: string, firstName: string | null, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    const subject = 'Réinitialisation de votre mot de passe - Nuna Heritage';
    
    const htmlContent = this.getPasswordResetTemplate(firstName, resetUrl);
    const textContent = this.getPasswordResetTextTemplate(firstName, resetUrl);

    await this.sendEmail(email, subject, htmlContent, textContent);
  }

  private getEmailVerificationTemplate(firstName: string | null, verificationUrl: string): string {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation d'email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Bienvenue sur Nuna Heritage</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Merci de vous être inscrit sur Nuna Heritage ! Pour finaliser votre inscription et activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
              </p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Confirmer mon email</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :
              </p>
              <p style="margin: 10px 0 0 0; color: #667eea; font-size: 12px; word-break: break-all;">
                ${verificationUrl}
              </p>
              <p style="margin: 30px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                Ce lien est valide pendant 24 heures. Si vous n'avez pas créé de compte sur Nuna Heritage, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Nuna Heritage. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private getEmailVerificationTextTemplate(firstName: string | null, verificationUrl: string): string {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
    
    return `
${greeting}

Merci de vous être inscrit sur Nuna Heritage ! Pour finaliser votre inscription et activer votre compte, veuillez confirmer votre adresse email en visitant le lien suivant :

${verificationUrl}

Ce lien est valide pendant 24 heures. Si vous n'avez pas créé de compte sur Nuna Heritage, vous pouvez ignorer cet email.

© ${new Date().getFullYear()} Nuna Heritage. Tous droits réservés.
    `.trim();
  }

  private getPasswordResetTemplate(firstName: string | null, resetUrl: string): string {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Réinitialisation de mot de passe</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
              </p>
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Réinitialiser mon mot de passe</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :
              </p>
              <p style="margin: 10px 0 0 0; color: #667eea; font-size: 12px; word-break: break-all;">
                ${resetUrl}
              </p>
              <p style="margin: 30px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                Ce lien est valide pendant 1 heure. Si vous n'avez pas demandé de réinitialisation de mot de passe, vous pouvez ignorer cet email. Votre mot de passe restera inchangé.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Nuna Heritage. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private getPasswordResetTextTemplate(firstName: string | null, resetUrl: string): string {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
    
    return `
${greeting}

Vous avez demandé à réinitialiser votre mot de passe. Visitez le lien suivant pour créer un nouveau mot de passe :

${resetUrl}

Ce lien est valide pendant 1 heure. Si vous n'avez pas demandé de réinitialisation de mot de passe, vous pouvez ignorer cet email. Votre mot de passe restera inchangé.

© ${new Date().getFullYear()} Nuna Heritage. Tous droits réservés.
    `.trim();
  }

  async sendTeNatiraaTicket(
    email: string,
    firstName: string,
    lastName: string,
    adultCount: number,
    childCount: number,
    qrCode: string,
  ): Promise<void> {
    const subject = 'Votre billet Te Natira\'a - Nuna\'a Heritage';

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrCode, { width: 400, margin: 2 });
    } catch (err) {
      this.logger.error('Failed to generate QR code for Te Natiraa ticket', err);
    }

    const htmlContent = this.getTeNatiraaTicketTemplate(
      firstName,
      lastName,
      adultCount,
      childCount,
      qrDataUrl,
    );
    const textContent = this.getTeNatiraaTicketTextTemplate(
      firstName,
      lastName,
      adultCount,
      childCount,
      qrCode,
    );

    const attachments: EmailAttachment[] = [];
    try {
      const pdfBuffer = await this.generateTeNatiraaTicketPdf(
        firstName,
        lastName,
        adultCount,
        childCount,
        qrCode,
      );
      const safeName = `${lastName}-${firstName}`.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
      attachments.push({
        content: pdfBuffer.toString('base64'),
        name: `billet-te-natiraa-${safeName}.pdf`,
      });
    } catch (err) {
      this.logger.error('Failed to generate PDF ticket for Te Natiraa', err);
    }

    await this.sendEmail(email, subject, htmlContent, textContent, attachments);
  }

  private async generateTeNatiraaTicketPdf(
    firstName: string,
    lastName: string,
    adultCount: number,
    childCount: number,
    qrCode: string,
  ): Promise<Buffer> {
    const qrBuffer = await QRCode.toBuffer(qrCode, { width: 300, margin: 2, type: 'png' });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // En-tête
      doc.fontSize(24).font('Helvetica-Bold').text('Te Natira\'a', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica').text('Nuna\'a Heritage', { align: 'center' });
      doc.moveDown(2);

      // Billet
      doc.fontSize(12).font('Helvetica');
      doc.text(`Bonjour ${firstName} ${lastName},`);
      doc.moveDown(1);
      doc.text('Votre inscription au Te Natira\'a est confirmée.');
      doc.text('Présentez ce billet à l\'entrée.');
      doc.moveDown(1.5);

      doc.fontSize(11).text(`Adultes : ${adultCount}`, { continued: false });
      doc.text(`Enfants : ${childCount}`);
      doc.moveDown(2);

      // QR code centré
      const qrSize = 180;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const qrX = (doc.page.width - qrSize) / 2;
      const qrY = doc.y;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      doc.y = qrY + qrSize + 20;

      // Infos événement
      doc.fontSize(11).text('Samedi 11 avril à 8h00', { align: 'center' });
      doc.text('Vallée de Tipaerui', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(9).fillColor('#666666').text(`Code : ${qrCode}`, { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(8).fillColor('#999999').text(`© ${new Date().getFullYear()} Nuna'a Heritage`, { align: 'center' });

      doc.end();
    });
  }

  private getTeNatiraaTicketTemplate(
    firstName: string,
    lastName: string,
    adultCount: number,
    childCount: number,
    qrDataUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Billet Te Natira'a</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Te Natira'a</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Nuna'a Heritage</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 18px; font-weight: 600;">
                Bonjour ${firstName} ${lastName},
              </p>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Votre inscription au Te Natira'a est confirmée. Votre billet électronique avec QR code scannable est en pièce jointe.
              </p>
              <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Adultes : ${adultCount}</p>
                <p style="margin: 0; color: #666; font-size: 14px;">Enfants : ${childCount}</p>
              </div>
              ${qrDataUrl ? `<div style="margin: 30px 0; text-align: center;"><img src="${qrDataUrl}" alt="QR Code" style="width: 300px; height: 300px; max-width: 100%;" /></div>` : ''}
              <p style="margin: 30px 0 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                Samedi 11 avril à 8h00 - Vallée de Tipaerui
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Nuna'a Heritage. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private getTeNatiraaTicketTextTemplate(
    firstName: string,
    lastName: string,
    adultCount: number,
    childCount: number,
    qrCode: string,
  ): string {
    return `
Bonjour ${firstName} ${lastName},

Votre inscription au Te Natira'a est confirmée. Votre billet électronique avec QR code scannable est en pièce jointe (PDF).

Adultes : ${adultCount}
Enfants : ${childCount}

Samedi 11 avril à 8h00 - Vallée de Tipaerui

© ${new Date().getFullYear()} Nuna'a Heritage. Tous droits réservés.
    `.trim();
  }
}
