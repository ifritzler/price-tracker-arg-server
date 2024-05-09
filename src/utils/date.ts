
export function getOnlyDateWithoutHours() {
  const date = getActualHourBuenosAires()
  const hour = Number(
    new Date()
      .toLocaleTimeString('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hourCycle: "h24"
      })
      .split(':')[0],
  )
  
  if (hour < 11) {
    date.setHours(-27, 0, 0, 0)
    const dateModified = new Date(date)
    return dateModified
  }

  date.setHours(-3, 0, 0, 0)
  const dateModified = new Date(date)
  return dateModified
}

export function getActualHourBuenosAires() {
  const date = new Date()
  const options = { timeZone: 'America/Argentina/Buenos_Aires' }
  const localDateString = date.toLocaleString('en-US', options)
  const localDate = new Date(localDateString)
  return localDate
}
