import { Seat } from "../types/Seat"
import PDFDocument from "pdfkit"

type Meta = {
  from: string
  to: string
  date: string
  departureTime: string
  arrivalTime: string
}

export function appendSeatPage(
  doc: typeof PDFDocument,
  seats: Seat[],
  meta: Meta
) {
  doc.addPage({ size: "A4", margin: 40 })

  doc.fontSize(18).text(`${meta.from} → ${meta.to}`, { align: "center" })
  doc.moveDown(0.3)
  doc.fontSize(12).text(meta.date, { align: "center" })
  doc.moveDown(1)

  const metaY = doc.y
  const cardWidth = 150
  const cardHeight = 50
  const gap = 10

  const cards = [
    ["Departure", meta.departureTime],
    ["Arrival", meta.arrivalTime],
    ["Available", seats.filter(s => s.IsAvailable === 1).length.toString()],
    ["Booked", seats.filter(s => s.IsAvailable !== 1 && s.SeatTypeID !== 4).length.toString()],
    ["Total", seats.filter(s => s.SeatTypeID !== 4).length.toString()],
  ]

  cards.forEach((c, i) => {
    const x = 40 + (i % 3) * (cardWidth + gap)
    const y = metaY + Math.floor(i / 3) * (cardHeight + gap)

    doc.roundedRect(x, y, cardWidth, cardHeight, 6).stroke()
    doc.fontSize(10).text(c[0], x, y + 8, { align: "center", width: cardWidth })
    doc.fontSize(14).text(c[1], x, y + 22, { align: "center", width: cardWidth })
  })

  doc.moveDown(5)

  const startX = 80
  let y = doc.y + 20
  const size = 22
  const gapX = 6
  const gapY = 6

  const rows: Record<number, Seat[]> = {}
  seats.forEach(s => {
    if (!rows[s.RowNo]) rows[s.RowNo] = []
    rows[s.RowNo].push(s)
  })

  Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(rowNo => {
      let x = startX
      rows[rowNo]
        .sort((a, b) => a.ColumnNo - b.ColumnNo)
        .forEach(seat => {
          if (seat.SeatTypeID === 4 || seat.IsAisle) {
            x += size + gapX
            return
          }

          doc.fillColor(seat.IsAvailable === 1 ? "#16a34a" : "#dc2626")
          doc.roundedRect(x, y, size, size, 4).fill()
          doc.fillColor("white").fontSize(8).text(seat.SeatLabel, x, y + 7, {
            width: size,
            align: "center",
          })
          x += size + gapX
        })
      y += size + gapY
    })
}
