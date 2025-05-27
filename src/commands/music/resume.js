import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import { queues } from "./play.js";
import logger from "../../utils/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the currently paused song"),

  async execute(m) {
    try {
      await m.deferReply();
      const queue = queues.get(m.guildId);

      if (!queue) {
        const noMusicEmbed = new EmbedBuilder()
          .setTitle("❌ No Music Paused")
          .setDescription("There is no music currently paused.")
          .setColor("Red");

        return m.editReply({ embeds: [noMusicEmbed] });
      }

      if (queue.player.state.status !== AudioPlayerStatus.Paused) {
        const notPausedEmbed = new EmbedBuilder()
          .setTitle("❌ Not Paused")
          .setDescription("The music is not currently paused.")
          .setColor("Red");

        return m.editReply({ embeds: [notPausedEmbed] });
      }

      queue.player.unpause();

      const resumedEmbed = new EmbedBuilder()
        .setTitle("▶️ Playback Resumed")
        .setDescription("The music has been resumed.")
        .setColor("Green")
        .setFooter({ text: `Resumed in: ${m.guild.name}` });

      await m.editReply({ embeds: [resumedEmbed] });

    } catch (error) {
      logger.error(`Error in resume command: ${error}`);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription("An error occurred while trying to resume the music.")
        .setColor("Red");

      await m.editReply({ embeds: [errorEmbed] });
    }
  },
};
