import axios from "axios"
import PDFDocument from "pdfkit"
import { PassThrough } from "stream"
import { Seat } from "../types/Seat"
import { appendSeatPage } from "../utils/buildSeatMatrix"
import { sendPDFMail } from "../utils/mailer"
import { formatPrettyDateTime } from "../utils/dateTimeFormatter"

function formatDate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default async function executeTask() {
  console.log("TASK_START")

  const doc = new PDFDocument({ autoFirstPage: false })
  const stream = new PassThrough()
  const chunks: Buffer[] = []

  doc.pipe(stream)
  stream.on("data", c => chunks.push(c))

  const baseDate = new Date()
  const dates = [
    new Date(baseDate),
    new Date(new Date(baseDate).setDate(baseDate.getDate() + 1)),
    new Date(new Date(baseDate).setDate(baseDate.getDate() + 2)),
  ]

  const directions = [
    {
      label: "UP",
      fromCityID: 10072,
      toCityID: 451,
      fromCityName: "Kozhikode",
      toCityName: "Kanjirappally",
      routeIdPrefix: "3946~4085~10072~451",
    },
    {
      label: "DOWN",
      fromCityID: 451,
      toCityID: 10072,
      fromCityName: "Kanjirappally",
      toCityName: "Kozhikode",
      routeIdPrefix: "2823~2881~451~10072",
    },
  ]

  for (const dir of directions) {
    console.log(`DIRECTION_START ${dir.label}`)

    for (const d of dates) {
      const date = formatDate(d)
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

        const route = response.data.find(
          (r: any) => r.RouteScheduleId === `${dir.routeIdPrefix}~${date}`
        )

        if (!route) {
          console.log(`ROUTE_NOT_FOUND ${dir.label} ${date}`)
          continue
        }

        const seatResp = await axios.get(
          "https://onlineksrtcswift.com/api/resource/seatArrangement",
          {
            params: {
              routeID: route.RouteScheduleId,
              journeyDate: date,
            },
          }
        )

        const seats: Seat[] =
          seatResp.data.APIGetChartMicrositeResult.Seats

        appendSeatPage(doc, seats, {
          from: dir.fromCityName,
          to: dir.toCityName,
          date,
          departureTime: formatPrettyDateTime(route.DepartureTime),
          arrivalTime: formatPrettyDateTime(route.ArrivalTime),
        })

        console.log(`PAGE_ADDED ${dir.label} ${date}`)
      } catch (err) {
        console.error(`DATE_PROCESS_FAILED ${dir.label} ${date}`)
      }
    }
  }

  doc.end()
  await new Promise(r => stream.on("end", r))

  const pdf = Buffer.concat(chunks)

  await sendPDFMail(
    pdf,
    `Bus Seat Report | ${formatDate(baseDate)} → ${formatDate(dates[2])}`
  )

  console.log("TASK_END")
}
