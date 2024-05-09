import { PrismaClient } from '@prisma/client'

import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

function createPrismaClient() {
  const env = process.env.NODE_ENV
  if (env === 'develop') {
    return new PrismaClient({ log: ['query', 'error'] })
  }

  const libsql = createClient({
    url: `${process.env.TURSO_DATABASE_URL}`,
    authToken: `${process.env.TURSO_AUTH_TOKEN}`,
  })

  const adapter = new PrismaLibSQL(libsql)
  return new PrismaClient({ adapter })
}

export const db = createPrismaClient()
