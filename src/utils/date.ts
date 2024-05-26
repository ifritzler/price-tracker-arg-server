import { DateTime } from 'luxon'

export function getOnlyDateWithoutHours() {
  // Obtener la hora actual de Buenos Aires
  const desiredDate = DateTime.now()
    .setZone('America/Argentina/Buenos_Aires')
  return desiredDate!
}

export function isMorning() {
  const currentHour = DateTime.now().setZone(
    'America/Argentina/Buenos_Aires',
  ).hour
  console.log({currentHour})
  return currentHour >= 0 && currentHour < 11
}
