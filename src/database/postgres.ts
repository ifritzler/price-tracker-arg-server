import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import postgres from 'postgres'
import dotenv from 'dotenv'
dotenv.config()

const connectionString =
  process.env.NODE_ENV === 'develop'
    ? (process.env.SUPABASE_URI_DEV as string)
    : (process.env.SUPABASE_URI as string)
console.log({connectionString})
const client = postgres(connectionString)

export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'develop' ? true : false,
})
