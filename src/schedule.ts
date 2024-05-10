import { CronJob } from 'cron'
import { updateProductFluctuations } from './services/fluctuations.js'
import { getActualHourBuenosAires, getOnlyDateWithoutHours } from './utils/date.js'

export function createJobToUpdateProductsEachDay() {
  console.log("Hora Argentina " + getActualHourBuenosAires())
  console.log("Epoch: " + getOnlyDateWithoutHours().getTime())
  const job = CronJob.from({
    cronTime: '00 00 11 * * *', // All days all months each 11am o'clock in the morning
    onTick: async () => {
      try {
        if (getActualHourBuenosAires().getHours() < 11) {
          throw new Error('Updates only after 11 am.')
        }
        if(process.env.STOP_INSERTIONS !== 'true') {
          const { error, message } = await updateProductFluctuations()
          console.info({ error, message })
        }
      } catch (error: Error | unknown) {
        error instanceof Error && console.log(error.message)
      }
    },
    start: false,
    timeZone: 'America/Argentina/Buenos_Aires',
    runOnInit: true,
  })
  return job
}
