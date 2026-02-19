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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
const mongoUri = process.env.MONGODB_URI ||
    "mongodb+srv://noufalrahim6784_db_user:UzxRUvPFsnQ7fz3Q@cluster0.dvyj0fv.mongodb.net";
const dbName = process.env.MONGODB_DB || "conductor";
let clientPromise = null;
function getClient() {
    if (!clientPromise) {
        // Lazy-load to avoid hard crash when dependency is not installed in restricted envs.
        const mongodb = eval("require")("mongodb");
        const client = new mongodb.MongoClient(mongoUri);
        clientPromise = client.connect();
    }
    return clientPromise;
}
function getDb() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield getClient();
        return client.db(dbName);
    });
}
