"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPDFMail = sendPDFMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
function sendPDFMail(attachments, subject) {
    return __awaiter(this, void 0, void 0, function* () {
        const transporter = nodemailer_1.default.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: "noufal.nexorian@gmail.com",
                pass: "krwcmundtouqhfyn",
            },
        });
        const resp = yield transporter.sendMail({
            from: "noufal.nexorian@gmail.com",
            to: "noufalrahim6784@gmail.com",
            subject,
            attachments,
        });
        console.log(resp);
        return resp;
    });
}
