import dotenv from 'dotenv'
dotenv.config()

export const STOP_INSERTIONS = process.env.STOP_INSERTIONS === 'true' ? true : false
