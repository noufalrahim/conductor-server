export function formatPrettyDateTime(dateTime: string) {
  const d = new Date(dateTime)

  const day = d.getDate()
  const year = d.getFullYear()

  const month = d.toLocaleString("en-US", { month: "short" })
  const time = d.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" :
    "th"

  return `${day}${suffix} ${month} ${year}, ${time}`
}
