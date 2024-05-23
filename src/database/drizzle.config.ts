import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

const externalCredentials = {
  url: process.env.SUPABASE_URI as string
}

const dbLocalCredentials = {
  database: process.env.DRIZZLE_LOCAL_DB_NAME as string,
  host: process.env.DRIZZLE_LOCAL_DB_HOST as string,
  port: Number(process.env.DRIZZLE_LOCAL_DB_PORT) as number,
  user: process.env.DRIZZLE_LOCAL_DB_USER as string,
  password: process.env.DRIZZLE_LOCAL_DB_PASSWORD as string,
}

export const dbCredentials = process.env.NODE_ENV === 'develop' ? dbLocalCredentials : externalCredentials

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: dbCredentials
})
