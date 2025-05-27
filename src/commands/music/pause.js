import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import { queues } from "./play.js";
import logger from "../../utils/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the currently playing song"),

  async execute(m) {
    try {
      await m.deferReply();

      const queue = queues.get(m.guildId);
      if (!queue) {
        const noMusicEmbed = new EmbedBuilder()
          .setTitle("❌ No Music Playing")
          .setDescription("There is no music currently playing.")
          .setColor("Red");
        return m.editReply({ embeds: [noMusicEmbed] });
      }

      if (queue.player.state.status !== AudioPlayerStatus.Playing) {
        const notPlayingEmbed = new EmbedBuilder()
          .setTitle("❌ Not Playing")
          .setDescription("The music is not currently playing.")
          .setColor("Red");
        return m.editReply({ embeds: [notPlayingEmbed] });
      }

      queue.player.pause();

      const pausedEmbed = new EmbedBuilder()
        .setTitle("⏸ Playback Paused")
        .setDescription("The current track has been paused.")
        .setColor("Orange")
        .setFooter({ text: `Paused in: ${m.guild.name}` });

      await m.editReply({ embeds: [pausedEmbed] });

    } catch (error) {
      logger.error(`Error in pause command: ${error}`);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription("An error occurred while trying to pause the music.")
        .setColor("Red");

      await m.editReply({ embeds: [errorEmbed] });
    }
  },
};
