import { SlashCommandBuilder, MessageFlags } from "discord.js";

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(m) {
    await m.reply({
      content: "Pong!",
      flags: MessageFlags.Ephemeral,
    });
  },
};
