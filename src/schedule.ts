import { CronJob } from 'cron'
import { updateProductFluctuations } from './services/fluctuations.js'
import { getActualHourBuenosAires } from './utils/date.js'

export function createJobToUpdateProductsEachDay() {
  console.log("Hora Argentina" + getActualHourBuenosAires())

  const job = CronJob.from({
    cronTime: '00 00 11 * * *', // All days all months each 11am o'clock in the morning
    onTick: async () => {
      try {
        if (getActualHourBuenosAires().getHours() < 11) {
          throw new Error('Updates only after 11 am.')
        }
        const { error, message } = await updateProductFluctuations()
        console.info({ error, message })
      } catch (error: any) {
        console.error(error.message)
      }
    },
    start: false,
    timeZone: 'America/Argentina/Buenos_Aires',
    runOnInit: true,
  })
  return job
}
