import { Seat } from "../types/Seat"

type Meta = {
  from: string
  to: string
  date: string
  departureTime: string
  arrivalTime: string
}

export function generateSeatHTML(seats: Seat[], meta: Meta) {
  const rows: Record<number, Seat[]> = {}

  for (const seat of seats) {
    if (!rows[seat.RowNo]) rows[seat.RowNo] = []
    rows[seat.RowNo].push(seat)
  }

  const totalSeats = seats.filter(s => s.SeatTypeID !== 4).length
  const availableSeats = seats.filter(s => s.IsAvailable === 1).length
  const bookedSeats = totalSeats - availableSeats

  const seatRows = Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)
    .map(rowNo =>
      rows[rowNo]
        .sort((a, b) => a.ColumnNo - b.ColumnNo)
        .map(seat => {
          if (seat.SeatTypeID === 4 || seat.IsAisle) {
            return `<div class="cell aisle"></div>`
          }

          const cls =
            seat.IsAvailable === 1
              ? "cell seat available"
              : "cell seat booked"

          return `<div class="${cls}">${seat.SeatLabel}</div>`
        })
        .join("")
    )
    .map(row => `<div class="row">${row}</div>`)
    .join("")

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    padding: 24px;
    color: #111;
  }

  .page {
    page-break-after: always;
  }

  .header {
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 16px;
    padding-bottom: 8px;
  }

  .route {
    font-size: 20px;
    font-weight: bold;
  }

  .date {
    color: #555;
    margin-top: 4px;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 16px 0;
  }

  .meta-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
    background: #f9fafb;
  }

  .meta-card .label {
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
  }

  .meta-card .value {
    font-size: 14px;
    font-weight: bold;
  }

  .legend {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 14px;
    font-size: 12px;
  }

  .legend span {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-box {
    width: 14px;
    height: 14px;
    border-radius: 3px;
  }

  .row {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .cell {
    width: 28px;
    height: 28px;
  }

  .seat {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: white;
    border-radius: 4px;
  }

  .available {
    background-color: #16a34a;
  }

  .booked {
    background-color: #dc2626;
  }

  .aisle {
    background: transparent;
  }
</style>
</head>

<body>
  <div class="page">
    <div class="header">
      <div class="route">${meta.from} → ${meta.to}</div>
      <div class="date">${meta.date}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="label">Departure</div>
        <div class="value">${meta.departureTime}</div>
      </div>
      <div class="meta-card">
        <div class="label">Arrival</div>
        <div class="value">${meta.arrivalTime}</div>
      </div>
      <div class="meta-card">
        <div class="label">Available Seats</div>
        <div class="value">${availableSeats}</div>
      </div>
      <div class="meta-card">
        <div class="label">Booked Seats</div>
        <div class="value">${bookedSeats}</div>
      </div>
      <div class="meta-card">
        <div class="label">Total Seats</div>
        <div class="value">${totalSeats}</div>
      </div>
    </div>

    <div class="legend">
      <span><div class="legend-box available"></div> Available</span>
      <span><div class="legend-box booked"></div> Booked</span>
    </div>

    ${seatRows}
  </div>
</body>
</html>
`
}
