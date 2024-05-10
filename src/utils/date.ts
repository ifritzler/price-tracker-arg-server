export function getActualHourBuenosAires() {
  const date = new Date();
  const options = { timeZone: 'America/Argentina/Buenos_Aires' };
  const localDateString = date.toLocaleString('en-US', options);
  const localDate = new Date(localDateString);
  return localDate;
}

export function resetToMidnight(date: Date) {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0); // Establecer la hora a medianoche en la zona horaria local
  const offset = date.getTimezoneOffset(); // Obtener el desfase horario de la zona horaria local
  midnight.setMinutes(midnight.getMinutes() - offset); // Ajustar para el desfase horario
  return midnight;
}


export function getOnlyDateWithoutHours() {
  // Obtener la hora actual de Buenos Aires
  const date = getActualHourBuenosAires();
  const hour = date.getHours();

  // Determinar si la hora actual es antes de las 11AM en Buenos Aires
  if (hour < 11) {
    // Si es antes de las 11AM, restar 1 día
    date.setDate(date.getDate() - 1);
  }

  // Resetear la hora a la medianoche
  const dateWithoutHours = resetToMidnight(date);
  return dateWithoutHours;
}
