import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import postgres from 'postgres'

const connectionString = 'postgresql://postgres:123456@127.0.0.1:5432/price-tracking'

const client = postgres(process.env.NODE_ENV === 'develop' ? connectionString : process.env.SUPABASE_URI as string)

export const db = drizzle(client, { schema, logger:  process.env.NODE_ENV === 'develop' ? true : false})
