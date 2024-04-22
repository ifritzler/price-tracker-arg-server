export function getOnlyDateWithoutHours() {
    return new Date(new Date().setHours(-3,0,0,0))
}

export function getActualHourBuenosAires() {
    return new Date(new Date().getTime() - 1000 * 60 * 60 * 3)
}