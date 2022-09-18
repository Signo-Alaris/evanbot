require('dotenv').config()
const axios = require('axios').default;

let url = `https://discord.com/api/v8/applications/${process.env.APP_ID}/commands`

const headers = {
  "Authorization": `Bot ${process.env.BOT_TOKEN}`,
  "Content-Type": "application/json"
}

let command_data = {
  "name": "lfg",
  "type": 1,
  "description": "Places you in the LFG group so others can know you're looking for a group to play with!",
}

axios.post(url, JSON.stringify(command_data), {
  headers: headers,
}).then((response) => response.data)
.then((jsonResponse) => {
  console.log(jsonResponse)
})