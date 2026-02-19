"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendSeatPage = appendSeatPage;
function appendSeatPage(doc, seats, meta) {
    doc.addPage({ size: "A4", margin: 36 });
    const pageWidth = doc.page.width;
    const contentX = 36;
    const contentWidth = pageWidth - 72;
    const availableCount = seats.filter(s => s.IsAvailable === 1).length;
    const bookedCount = seats.filter(s => s.IsAvailable !== 1 && s.SeatTypeID !== 4).length;
    const totalCount = seats.filter(s => s.SeatTypeID !== 4).length;
    doc
        .roundedRect(contentX, 34, contentWidth, 82, 10)
        .lineWidth(1)
        .strokeColor("#d1d5db")
        .fillAndStroke("#f8fafc", "#d1d5db");
    doc
        .fillColor("#0f172a")
        .fontSize(17)
        .text(`${meta.from} -> ${meta.to}`, contentX + 16, 50, {
        width: contentWidth - 32,
        align: "left",
    });
    doc
        .fillColor("#475569")
        .fontSize(11)
        .text(`Date: ${meta.date}`, contentX + 16, 76);
    doc
        .fillColor("#475569")
        .fontSize(11)
        .text(`Departure: ${meta.departureTime}`, contentX + 16, 94);
    doc
        .fillColor("#475569")
        .fontSize(11)
        .text(`Arrival: ${meta.arrivalTime}`, contentX + contentWidth / 2, 94, {
        width: contentWidth / 2 - 16,
        align: "left",
    });
    const cardsY = 134;
    const cardGap = 12;
    const cardWidth = (contentWidth - cardGap * 4) / 5;
    const cardHeight = 62;
    const cards = [
        ["Available", availableCount.toString(), "#16a34a"],
        ["Booked", bookedCount.toString(), "#dc2626"],
        ["Total", totalCount.toString(), "#0f172a"],
        ["From", meta.from, "#1e3a8a"],
        ["To", meta.to, "#7c2d12"],
    ];
    cards.forEach((card, index) => {
        const x = contentX + index * (cardWidth + cardGap);
        const y = cardsY;
        doc
            .roundedRect(x, y, cardWidth, cardHeight, 8)
            .lineWidth(1)
            .strokeColor("#e2e8f0")
            .fillAndStroke("#ffffff", "#e2e8f0");
        doc.fillColor("#64748b").fontSize(9).text(card[0], x + 10, y + 10, {
            width: cardWidth - 20,
            align: "left",
        });
        doc.fillColor(card[2]).fontSize(12).text(card[1], x + 10, y + 30, {
            width: cardWidth - 20,
            align: "left",
        });
    });
    const seatBlockY = cardsY + cardHeight + 20;
    const seatBlockHeight = doc.page.height - seatBlockY - 50;
    doc
        .roundedRect(contentX, seatBlockY, contentWidth, seatBlockHeight, 10)
        .lineWidth(1)
        .strokeColor("#e2e8f0")
        .fillAndStroke("#ffffff", "#e2e8f0");
    doc.fillColor("#334155").fontSize(10).text("Seat Map", contentX + 14, seatBlockY + 10);
    doc
        .fillColor("#16a34a")
        .fontSize(9)
        .text("Available", contentX + contentWidth - 140, seatBlockY + 10);
    doc.fillColor("#dc2626").fontSize(9).text("Booked", contentX + contentWidth - 76, seatBlockY + 10);
    const startX = contentX + 22;
    let y = seatBlockY + 30;
    const size = 18;
    const gapX = 8;
    const gapY = 8;
    const rows = {};
    seats.forEach(s => {
        if (!rows[s.RowNo])
            rows[s.RowNo] = [];
        rows[s.RowNo].push(s);
    });
    Object.keys(rows)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(rowNo => {
        let x = startX;
        doc.fillColor("#94a3b8").fontSize(8).text(String(rowNo), contentX + 8, y + 5, {
            width: 12,
            align: "right",
        });
        rows[rowNo]
            .sort((a, b) => a.ColumnNo - b.ColumnNo)
            .forEach(seat => {
            if (seat.SeatTypeID === 4 || seat.IsAisle) {
                x += size + gapX;
                return;
            }
            doc.fillColor(seat.IsAvailable === 1 ? "#16a34a" : "#dc2626");
            doc.roundedRect(x, y, size, size, 4).fill();
            doc.fillColor("white").fontSize(7).text(seat.SeatLabel, x, y + 5, {
                width: size,
                align: "center",
            });
            x += size + gapX;
        });
        y += size + gapY;
    });
}
