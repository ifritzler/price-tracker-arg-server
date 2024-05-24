import { DateTime } from "luxon";

export function getActualHourBuenosAires() {
  const date = new Date();
  const options = { timeZone: 'America/Argentina/Buenos_Aires' };
  const localDateString = date.toLocaleString('en-US', options);
  const localDate = new Date(localDateString);
  return localDate;
}

export function getOnlyDateWithoutHours() {
  // Obtener la hora actual de Buenos Aires
  const desiredDate = DateTime.now()
      .setZone('America/Argentina/Buenos_Aires')
      .toSQLDate()
  return desiredDate!;
}
