const IST_TIMEZONE = "Asia/Kolkata"

export function ensureIst(dateTime: string) {
  if (typeof dateTime !== "string") return dateTime;
  const normalized = dateTime.trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(normalized)) {
    return `${normalized}+05:30`;
  }
  return dateTime;
}

function getIstDateParts(dateTime: string) {
  const d = new Date(ensureIst(dateTime))

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d)

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value ?? ""

  return {
    day: Number(part("day")),
    month: part("month"),
    year: Number(part("year")),
    hour: part("hour"),
    minute: part("minute"),
    dayPeriod: part("dayPeriod"),
  }
}

export function getIstDateString(dateTime: string) {
  const d = new Date(ensureIst(dateTime))
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

export function getIstHour(dateTime: string) {
  const d = new Date(ensureIst(dateTime))
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: IST_TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }).format(d)
  )
}

export function formatPrettyDateTime(dateTime: string) {
  const { day, month, year, hour, minute, dayPeriod } = getIstDateParts(dateTime)
  const time = `${hour}:${minute} ${dayPeriod}`

  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
      day % 10 === 2 && day !== 12 ? "nd" :
        day % 10 === 3 && day !== 13 ? "rd" :
          "th"

  return `${day}${suffix} ${month} ${year}, ${time} IST`
}
