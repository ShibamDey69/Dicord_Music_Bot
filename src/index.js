import config from "./config.js";
import logger from "./utils/logger.js";
import setupErrorHandling from "./helpers/errorHandler.js";
import commandHandler from "./helpers/commandHandler.js";
import * as Discord from "discord.js";
const { Client, GatewayIntentBits, Collection, Events } = Discord;
import registerCommands from "./utils/registerCommands.js";
import { EmbedBuilder } from "discord.js";
import express from "express";

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
client.commands = new Collection();
client.login(config.token);
setupErrorHandling(client);
commandHandler(client);

client.once(Events.ClientReady, () => {
  logger.info(`Bot initialized: ${client.user.tag}`);
  app.get("/", (req, res) => {
    res.send("Bot is running!");
  });
});

client.on(Events.MessageCreate, async (m) => {
  if (m.author.bot) return;
  if (m.content === "nigga") {
    await registerCommands(client, m);
    const embed = new EmbedBuilder()
      .setTitle("✅ Commands Loaded")
      .setDescription("Commands loaded successfully! 😁")
      .setColor("Green");
    m.reply({ embeds: [embed] });
  }
});

client.on(Events.InteractionCreate, async (m) => {
  if (!m.isCommand()) return;

  const command = client.commands.get(m.commandName);

  if (!command) {
    const embed = new EmbedBuilder()
      .setTitle("❌ Command Not Found")
      .setDescription("This command is not registered!")
      .setColor("Red");
    m.reply({ embeds: [embed] });
    logger.error(`Command not found: ${m.commandName}`);
    return;
  }

  try {
    await command.execute(m);
  } catch (error) {
    const embed = new EmbedBuilder()
      .setTitle("❌ Error")
      .setDescription("There was an error while executing this command!")
      .setColor("Red");
    logger.error(`Error executing command: ${error}`);
    await m.reply({ embeds: [embed] });
  }
});

app.listen(config.port, () => {
  logger.info(`Server is running on port ${config.port}`);
});