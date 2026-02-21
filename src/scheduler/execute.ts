import axios from "axios"
import PDFDocument from "pdfkit"
import { PassThrough } from "stream"
import { getAppConfig } from "../store/appConfigStore"
import { RouteConfig } from "../types/AppConfig"
import { Seat } from "../types/Seat"
import { appendSeatPage } from "../utils/buildSeatMatrix"
import {
  formatPrettyDateTime,
  getIstDateString,
  getIstHour,
  ensureIst,
} from "../utils/dateTimeFormatter"
import { sendPDFMail } from "../utils/mailer"

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
  briefingLines: string[]
}

const WINDOW_DAYS = 3

function formatDateIST(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

function getTargetDates(baseDate: Date) {
  return Array.from({ length: WINDOW_DAYS }, (_, offset) => {
    // Adding days safely via offset milliseconds
    return new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000)
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

function isNightRoute(route: RouteApi, nightStartHour: number) {
  const startTime = getRouteStartTime(route)
  if (typeof startTime !== "string") return false

  const hour = getIstHour(startTime)
  return !Number.isNaN(hour) && hour >= nightStartHour
}

function validateRoute(route: RouteApi, dir: RouteConfig, requestedDate: string) {
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
  const ts = Date.parse(ensureIst(dateTime))
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts
}

async function processDirection(
  dir: RouteConfig,
  dates: Date[],
  nightStartHour: number
): Promise<DirectionResult> {
  const doc = new PDFDocument({ autoFirstPage: false })
  const stream = new PassThrough()
  const chunks: Buffer[] = []
  let pagesAdded = 0
  const briefingLines: string[] = []

  doc.pipe(stream)
  stream.on("data", c => chunks.push(c))

  console.log(`DIRECTION_START ${dir.label}`)

  for (const d of dates) {
    const date = formatDateIST(d)

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

        if (!isNightRoute(route, nightStartHour)) {
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

          const seatsPending = seats.filter(s => s.IsAvailable === 1).length

          appendSeatPage(doc, seats, {
            from: dir.fromCityName,
            to: dir.toCityName,
            date: getIstDateString(startTime),
            departureTime: formatPrettyDateTime(startTime),
            arrivalTime: formatPrettyDateTime(arrivalTime),
          })

          briefingLines.push(
            `${dir.label} | ${getIstDateString(startTime)} | ${formatPrettyDateTime(startTime)} | seats pending: ${seatsPending}`
          )

          pagesAdded += 1
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
    briefingLines,
  }
}

export default async function executeTask() {
  console.log("TASK_START")

  const config = await getAppConfig()

  if (!config.emails.length) {
    console.error("NO_RECIPIENT_EMAILS_CONFIGURED_SKIP_MAIL")
    return
  }

  const activeRoutes = config.routes.filter(route => route.enabled !== false)
  if (!activeRoutes.length) {
    console.error("NO_ACTIVE_ROUTES_CONFIGURED_SKIP_TASK")
    return
  }

  const baseDate = new Date()
  const dates = getTargetDates(baseDate)
  const targetDates = dates.map(d => formatDateIST(d))

  const results: DirectionResult[] = []
  for (const route of activeRoutes) {
    results.push(await processDirection(route, dates, config.nightStartHour))
  }

  const totalPages = results.reduce((sum, r) => sum + r.pagesAdded, 0)
  if (!totalPages) {
    console.error("NO_VALID_PAGES_GENERATED_SKIP_MAIL")
    return
  }

  const briefing = [
    `Bus Seat Report Briefing`,
    `Date Window (UTC): ${targetDates.join(", ")}`,
    `Night Filter Start (IST): ${String(config.nightStartHour).padStart(2, "0")}:00`,
    ``,
    ...results.flatMap(r => r.briefingLines),
  ].join("\n")

  await sendPDFMail(
    results.map(r => r.attachment),
    `Bus Seat Report | ${targetDates.join(", ")}`,
    config.emails,
    briefing
  )

  console.log(`TASK_END pages=${totalPages} attachments=${results.length}`)
}
