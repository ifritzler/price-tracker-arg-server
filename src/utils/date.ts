export function getOnlyDateWithoutHours() {
  const date = getActualHourBuenosAires()
  date.setHours(-3, 0, 0, 0)
  const dateModified = new Date(date)
  return dateModified;
}

export function getActualHourBuenosAires() {
  const date = new Date();
  const options = { timeZone: 'America/Argentina/Buenos_Aires' };
  const localDateString = date.toLocaleString('en-US', options);
  const localDate = new Date(localDateString);

  return localDate
}

