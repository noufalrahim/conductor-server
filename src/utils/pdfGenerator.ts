// import PDFDocument from "pdfkit"
// import { PassThrough } from "stream"

// function stripHtml(html: string): string {
//   return html
//     .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
//     .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
//     .replace(/<\/p>/gi, "\n\n")
//     .replace(/<br\s*\/?>/gi, "\n")
//     .replace(/<\/h[1-6]>/gi, "\n\n")
//     .replace(/<[^>]+>/g, "")
//     .trim()
// }

// export async function htmlToPDF(html: string): Promise<Buffer> {
//   const doc = new PDFDocument({
//     size: "A4",
//     margin: 50,
//   })

//   const stream = new PassThrough()
//   const chunks: Buffer[] = []

//   doc.pipe(stream)

//   stream.on("data", (chunk) => chunks.push(chunk))

//   doc.fontSize(12)
//   doc.text(stripHtml(html), {
//     width: 500,
//     align: "left",
//   })

//   doc.end()

//   await new Promise((resolve) => stream.on("end", resolve))

//   return Buffer.concat(chunks)
// }
