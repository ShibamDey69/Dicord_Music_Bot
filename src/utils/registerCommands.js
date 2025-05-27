import logger from "../utils/logger.js";
import config from "../config.js";
import { REST, Routes } from "discord.js";
const registerCommands = async (client, message) => {
  try {
    const rest = new REST({ version: "10" }).setToken(config.token);
    const commandData = client.commands.map((command) => command.data.toJSON());
    const clientId = config.clientId;
    const guildId = message.guildId;

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandData,
    });

    logger.info("Successfully registered application commands.");
  } catch (error) {
    logger.error("Error registering commands:", error);
    throw error;
  }
};

export default registerCommands;