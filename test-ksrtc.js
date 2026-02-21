const axios = require("axios");

axios.get("https://onlineksrtcswift.com/api/resource/searchRoutesV4", {
  params: {
    fromCityID: 10072,
    toCityID: 451,
    fromCityName: "Kozhikode",
    toCityName: "Kanjirappally",
    journeyDate: "2026-02-21",
    mode: "oneway",
  },
}).then(res => {
  console.log(JSON.stringify(res.data.slice(0, 2), null, 2));
}).catch(err => console.error(err.message));
