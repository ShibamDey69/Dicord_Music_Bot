import dotenv from "dotenv";
dotenv.config();

export default {
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  port: process.env.PORT || 3000,
};
