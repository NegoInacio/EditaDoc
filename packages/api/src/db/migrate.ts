import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { env } from '../env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const client = new pg.Client({ connectionString: env.DATABASE_URL })
  await client.connect()

  try {
    const sql = readFileSync(join(__dirname, 'migrations/0001_initial_schema.sql'), 'utf-8')
    await client.query(sql)
    console.log('Migration aplicada com sucesso.')
  } finally {
    await client.end()
  }
}

migrate().catch((err) => {
  console.error('Erro na migration:', err)
  process.exit(1)
})
