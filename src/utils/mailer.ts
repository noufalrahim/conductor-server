import nodemailer from "nodemailer"

export async function sendPDFMail(
  pdfBuffer: Buffer,
  subject: string
) {

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "noufal.nexorian@gmail.com",
      pass: "krwcmundtouqhfyn",
    },
  });

  const resp = await transporter.sendMail({
    from: "noufal.nexorian@gmail.com",
    to: "noufalrahim6784@gmail.com",
    subject,
    attachments: [
      {
        filename: "bus-seats.pdf",
        content: pdfBuffer,
      },
    ],
  })

  console.log(resp)

  return resp
}
