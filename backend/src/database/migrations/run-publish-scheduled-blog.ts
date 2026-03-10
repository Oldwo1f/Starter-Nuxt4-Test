/**
 * Publishes scheduled blog posts (draft with publishedAt <= now).
 * Run via cron, e.g. every minute: * * * * * cd /var/www/nunaheritage/backend && npm run publish:scheduled-blog
 */
import '../../load-env';
import { Client } from 'pg';

async function publishScheduledPosts() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nunaheritage',
  });

  try {
    await client.connect();

    const result = await client.query(
      `UPDATE blog_posts
       SET status = 'active'
       WHERE status = 'draft'
         AND "publishedAt" IS NOT NULL
         AND "publishedAt" <= NOW()`,
    );

    const count = result.rowCount ?? 0;
    if (count > 0) {
      console.log(`Published ${count} scheduled blog post(s)`);
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error publishing scheduled posts:', error);
    await client.end();
    process.exit(1);
  }
}

publishScheduledPosts();
