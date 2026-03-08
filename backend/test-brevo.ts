import './src/load-env';
import { BrevoClient } from '@getbrevo/brevo';

async function testBrevo() {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@nunaheritage.com';
  const fromName = process.env.BREVO_FROM_NAME || 'Nuna Heritage';

  console.log('🔍 Test de connexion Brevo');
  console.log('==========================');
  console.log(`API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'NON CONFIGURÉE'}`);
  console.log(`FROM Email: ${fromEmail}`);
  console.log(`FROM Name: ${fromName}`);
  console.log('');

  if (!apiKey) {
    console.error('❌ BREVO_API_KEY n\'est pas configurée dans .env');
    process.exit(1);
  }

  try {
    const brevoClient = new BrevoClient({
      apiKey: apiKey,
    });

    console.log('✅ Client Brevo initialisé');
    console.log('');

    // Test d'envoi d'email
    const testEmail = process.argv[2] || 'test@example.com';
    console.log(`📧 Test d'envoi d'email à: ${testEmail}`);
    console.log('');

    const result = await brevoClient.transactionalEmails.sendTransacEmail({
      subject: 'Test Brevo - Nuna Heritage',
      htmlContent: '<h1>Test</h1><p>Ceci est un email de test.</p>',
      textContent: 'Test - Ceci est un email de test.',
      sender: { name: fromName, email: fromEmail },
      to: [{ email: testEmail }],
    });

    console.log('✅ Email envoyé avec succès!');
    console.log(`Message ID: ${result.messageId}`);
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi:');
    console.error('Message:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Body:', JSON.stringify(error.body, null, 2));
    
    if (error.statusCode === 400) {
      console.error('');
      console.error('💡 Erreur 400 - Vérifiez:');
      console.error('   - L\'adresse email FROM est-elle vérifiée dans Brevo?');
      console.error('   - Le format de l\'email FROM est-il correct?');
    } else if (error.statusCode === 401) {
      console.error('');
      console.error('💡 Erreur 401 - Vérifiez:');
      console.error('   - La clé API est-elle correcte?');
      console.error('   - La clé API a-t-elle les permissions nécessaires?');
    }
    
    process.exit(1);
  }
}

testBrevo();
