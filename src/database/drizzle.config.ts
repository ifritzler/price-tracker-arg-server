import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.NODE_ENV === 'develop' ? process.env.SUPABASE_URI_DEV as string : process.env.SUPABASE_URI as string
  }
})
