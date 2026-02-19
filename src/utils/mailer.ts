import nodemailer from "nodemailer"

type MailAttachment = {
  filename: string
  content: Buffer
}

export async function sendPDFMail(
  attachments: MailAttachment[],
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
  })

  const resp = await transporter.sendMail({
    from: "noufal.nexorian@gmail.com",
    to: "noufalrahim6784@gmail.com",
    subject,
    attachments,
  })

  console.log(resp)

  return resp
}
