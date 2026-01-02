import axios from "axios"
import { Seat } from "../types/Seat"
import { generateSeatHTML } from "../utils/buildSeatMatrix"
import { htmlToPDF } from "../utils/pdfGenerator"
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

    let combinedHTML = ""

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

        console.log(`ROUTE_FOUND ${dir.label} ${date}`)

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

        console.log(`SEAT_DATA_FETCHED ${dir.label} ${date}`)

        const pageHTML = generateSeatHTML(seats, {
          from: dir.fromCityName,
          to: dir.toCityName,
          date,
          departureTime: formatPrettyDateTime(route.DepartureTime),
          arrivalTime: formatPrettyDateTime(route.ArrivalTime),
        })

        combinedHTML += pageHTML

        console.log(`HTML_GENERATED ${dir.label} ${date}`)
      } catch (err) {
        console.error(`DATE_PROCESS_FAILED ${dir.label} ${date}`)
      }
    }

    if (!combinedHTML) {
      console.log(`NO_HTML_GENERATED ${dir.label}`)
      continue
    }

    try {
      console.log(`PDF_GENERATION_START ${dir.label}`)

      const pdf = await htmlToPDF(combinedHTML)

      console.log(`PDF_GENERATION_SUCCESS ${dir.label}`)

      await sendPDFMail(
        pdf,
        `Bus Seat Report | ${dir.label} | ${formatDate(baseDate)} → ${formatDate(
          dates[2]
        )}`
      )

      console.log(`MAIL_SENT_SUCCESS ${dir.label}`)
    } catch (err) {
      console.error(err)
      console.error(`PDF_OR_MAIL_FAILED ${dir.label} ${err}`)
    }
  }

  console.log("TASK_END")
}
