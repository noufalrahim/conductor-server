import axios from "axios"
import PDFDocument from "pdfkit"
import { PassThrough } from "stream"
import { Seat } from "../types/Seat"
import { appendSeatPage } from "../utils/buildSeatMatrix"
import { sendPDFMail } from "../utils/mailer"
import { getSentReportKeys, saveSentReportKeys } from "../store/reportDayStore"
import {
  formatPrettyDateTime,
  getIstDateString,
  getIstHour,
} from "../utils/dateTimeFormatter"

type Direction = {
  label: "UP" | "DOWN"
  fromCityID: number
  toCityID: number
  fromCityName: string
  toCityName: string
}

type RouteApi = {
  RouteScheduleId?: string
  FromCityID?: number | string
  ToCityID?: number | string
  DepartureTime?: string
  ArrivalTime?: string
  PickupTime?: string
}

type DirectionResult = {
  attachment: {
    filename: string
    content: Buffer
  }
  pagesAdded: number
  mailedKeys: Set<string>
}

const WINDOW_DAYS = 3

function formatDateUTC(d: Date) {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function getTargetDatesUTC(baseDate: Date) {
  return Array.from({ length: WINDOW_DAYS }, (_, offset) => {
    const dt = new Date(baseDate)
    dt.setUTCDate(baseDate.getUTCDate() + offset)
    return dt
  })
}

function parseScheduleDateFromRouteId(routeId: unknown) {
  if (typeof routeId !== "string") return null
  const parts = routeId.split("~")
  return parts.length ? parts[parts.length - 1] : null
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function getRouteStartTime(route: RouteApi) {
  if (typeof route.PickupTime === "string" && route.PickupTime) {
    return route.PickupTime
  }
  return route.DepartureTime
}

function isNightRoute(route: RouteApi) {
  const startTime = getRouteStartTime(route)
  if (typeof startTime !== "string") return false

  const hour = getIstHour(startTime)
  return !Number.isNaN(hour) && hour >= 19
}

function validateRoute(route: RouteApi, dir: Direction, requestedDate: string) {
  const errors: string[] = []

  if (!route || typeof route !== "object") {
    errors.push("Route payload is missing")
    return errors
  }

  if (typeof route.RouteScheduleId !== "string" || !route.RouteScheduleId) {
    errors.push("RouteScheduleId missing")
  }

  const scheduleDate = parseScheduleDateFromRouteId(route.RouteScheduleId)
  if (scheduleDate !== requestedDate) {
    errors.push("RouteScheduleId date mismatch")
  }

  const fromCity = toNumberOrNull(route.FromCityID)
  if (fromCity !== dir.fromCityID) {
    errors.push("FromCityID mismatch")
  }

  const toCity = toNumberOrNull(route.ToCityID)
  if (toCity !== dir.toCityID) {
    errors.push("ToCityID mismatch")
  }

  const startTime = getRouteStartTime(route)
  if (typeof startTime === "string") {
    const departureDate = startTime.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(departureDate) && departureDate !== requestedDate) {
      errors.push("Start time date mismatch")
    }
  } else {
    errors.push("Pickup/Departure time missing")
  }

  return errors
}

function validateSeats(seats: Seat[]) {
  const errors: string[] = []
  const labels = new Set<string>()

  for (const seat of seats) {
    if (!seat || typeof seat !== "object") {
      errors.push("Invalid seat object")
      continue
    }

    if (typeof seat.SeatLabel === "string") {
      if (labels.has(seat.SeatLabel)) {
        errors.push(`Duplicate seat label: ${seat.SeatLabel}`)
      }
      labels.add(seat.SeatLabel)
    }
  }

  return errors
}

function toTimeSortValue(dateTime: string | undefined) {
  if (!dateTime) return Number.MAX_SAFE_INTEGER
  const ts = Date.parse(dateTime)
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts
}

async function processDirection(
  dir: Direction,
  dates: Date[],
  sentKeys: Set<string>
): Promise<DirectionResult> {
  const doc = new PDFDocument({ autoFirstPage: false })
  const stream = new PassThrough()
  const chunks: Buffer[] = []
  let pagesAdded = 0
  const mailedKeys = new Set<string>()

  doc.pipe(stream)
  stream.on("data", c => chunks.push(c))

  console.log(`DIRECTION_START ${dir.label}`)

  for (const d of dates) {
    const date = formatDateUTC(d)
    const dayDirectionKey = `${date}|${dir.label}`

    if (sentKeys.has(dayDirectionKey)) {
      console.log(`DATE_DIRECTION_ALREADY_MAILED_SKIP ${dir.label} ${date}`)
      continue
    }

    console.log(`DATE_PROCESS_START ${dir.label} ${date}`)

    try {
      const response = await axios.get(
        "https://onlineksrtcswift.com/api/resource/searchRoutesV4",
        {
          params: {
            fromCityID: dir.fromCityID,
            toCityID: dir.toCityID,
            fromCityName: dir.fromCityName,
            toCityName: dir.toCityName,
            journeyDate: date,
            mode: "oneway",
          },
        }
      )

      const routes: RouteApi[] = Array.isArray(response.data) ? response.data : []
      if (!routes.length) {
        console.log(`ROUTE_NOT_FOUND ${dir.label} ${date}`)
        continue
      }

      const validatedRoutes: RouteApi[] = []
      for (const route of routes) {
        const routeErrors = validateRoute(route, dir, date)
        if (routeErrors.length) {
          console.error(
            `ROUTE_VALIDATION_FAILED ${dir.label} ${date} ${route.RouteScheduleId ?? "unknown"} ${routeErrors.join(" | ")}`
          )
          continue
        }

        if (!isNightRoute(route)) {
          continue
        }

        validatedRoutes.push(route)
      }

      if (!validatedRoutes.length) {
        console.log(`NIGHT_ROUTE_NOT_FOUND ${dir.label} ${date}`)
        continue
      }

      validatedRoutes.sort(
        (a, b) => toTimeSortValue(getRouteStartTime(a)) - toTimeSortValue(getRouteStartTime(b))
      )

      for (const route of validatedRoutes) {
        const routeId = route.RouteScheduleId as string

        try {
          const seatResp = await axios.get(
            "https://onlineksrtcswift.com/api/resource/seatArrangement",
            {
              params: {
                routeID: routeId,
                journeyDate: date,
              },
            }
          )

          const seatsRaw = seatResp.data?.APIGetChartMicrositeResult?.Seats
          const seats: Seat[] = Array.isArray(seatsRaw) ? seatsRaw : []

          if (!seats.length) {
            console.error(`SEATS_NOT_FOUND ${dir.label} ${date} route=${routeId}`)
            continue
          }

          const seatErrors = validateSeats(seats)
          if (seatErrors.length) {
            console.error(
              `SEAT_VALIDATION_WARNINGS ${dir.label} ${date} route=${routeId} ${seatErrors.join(" | ")}`
            )
          }

          const startTime = getRouteStartTime(route)
          const arrivalTime = route.ArrivalTime ?? startTime

          if (!startTime || !arrivalTime) {
            console.error(`ROUTE_TIMING_MISSING ${dir.label} ${date} route=${routeId}`)
            continue
          }

          appendSeatPage(doc, seats, {
            from: dir.fromCityName,
            to: dir.toCityName,
            date: getIstDateString(startTime),
            departureTime: formatPrettyDateTime(startTime),
            arrivalTime: formatPrettyDateTime(arrivalTime),
          })

          pagesAdded += 1
          mailedKeys.add(dayDirectionKey)
          console.log(`PAGE_ADDED ${dir.label} ${date} route=${routeId}`)
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error"
          console.error(`SEAT_PROCESS_FAILED ${dir.label} ${date} route=${routeId} ${message}`)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error(`DATE_PROCESS_FAILED ${dir.label} ${date} ${message}`)
    }
  }

  if (!pagesAdded) {
    doc.addPage({ size: "A4", margin: 36 })
    doc
      .fontSize(16)
      .fillColor("#0f172a")
      .text(`${dir.label} Route Report`, { align: "center" })
    doc.moveDown(1)
    doc
      .fontSize(11)
      .fillColor("#475569")
      .text("No eligible night-route data found for the current 3-day window.", {
        align: "center",
      })
  }

  doc.end()
  await new Promise<void>(resolve => stream.on("end", resolve))

  return {
    attachment: {
      filename: `bus-seats-${dir.label.toLowerCase()}.pdf`,
      content: Buffer.concat(chunks),
    },
    pagesAdded,
    mailedKeys,
  }
}

export default async function executeTask() {
  console.log("TASK_START")

  const baseDate = new Date()
  const dates = getTargetDatesUTC(baseDate)
  const targetDates = dates.map(d => formatDateUTC(d))
  const sentKeys = getSentReportKeys()

  const directions: Direction[] = [
    {
      label: "UP",
      fromCityID: 10072,
      toCityID: 451,
      fromCityName: "Kozhikode (11)",
      toCityName: "Kanjirappally (704)",
    },
    {
      label: "DOWN",
      fromCityID: 451,
      toCityID: 10072,
      fromCityName: "Kanjirappally (704)",
      toCityName: "Kozhikode (11)",
    },
  ]

  const results: DirectionResult[] = []
  for (const dir of directions) {
    results.push(await processDirection(dir, dates, sentKeys))
  }

  const totalPages = results.reduce((sum, r) => sum + r.pagesAdded, 0)
  if (!totalPages) {
    console.error("NO_VALID_PAGES_GENERATED_SKIP_MAIL")
    return
  }

  await sendPDFMail(
    results.map(r => r.attachment),
    `Bus Seat Report | ${targetDates.join(", ")}`
  )

  for (const result of results) {
    result.mailedKeys.forEach(key => sentKeys.add(key))
  }
  saveSentReportKeys(sentKeys)

  console.log(`TASK_END pages=${totalPages} attachments=${results.length}`)
}
