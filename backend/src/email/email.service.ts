import { Injectable, Logger } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';

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
      this.brevoClient = new BrevoClient({
        apiKey: apiKey,
      });
    }

    this.fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@nunaheritage.com';
    this.fromName = process.env.BREVO_FROM_NAME || 'Nuna Heritage';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<void> {
    if (!this.brevoClient) {
      this.logger.warn('Brevo API not initialized. Email not sent.');
      this.logger.debug(`Would send email to ${to}: ${subject}`);
      return;
    }

    try {
      const result = await this.brevoClient.transactionalEmails.sendTransacEmail({
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent || this.stripHtml(htmlContent),
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: to }],
      });

      this.logger.log(`Email sent successfully to ${to}. Message ID: ${result.messageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}:`, error);
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
}
