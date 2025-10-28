import fs from 'fs';
import path from 'path';
import pool from './db.js';

async function migrate() {
  console.log('🚀 Running migrations...');
  try {
    const client = await pool.connect();
    const files = fs.readdirSync(path.join(process.cwd(), 'migrations'))
                    .filter(f => f.endsWith('.sql'))
                    .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'migrations', file), 'utf8');
      console.log(`-> Running ${file}`);
      await client.query(sql);
    }
    client.release();
    console.log('✅ Migrations complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

export default migrate;
