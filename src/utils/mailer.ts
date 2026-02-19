import nodemailer from "nodemailer"

type MailAttachment = {
  filename: string
  content: Buffer
}

export async function sendPDFMail(
  attachments: MailAttachment[],
  subject: string,
  toEmails: string[],
  briefingText: string
) {
  const smtpUser = process.env.SMTP_USER || "noufal.nexorian@gmail.com"
  const smtpPass = process.env.SMTP_PASS || "krwcmundtouqhfyn"

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const resp = await transporter.sendMail({
    from: smtpUser,
    to: toEmails.join(","),
    subject,
    text: briefingText,
    attachments,
  })

  console.log(resp)

  return resp
}
