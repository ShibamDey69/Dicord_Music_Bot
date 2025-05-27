import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import { queues } from "./play.js";
import logger from "../../utils/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("⏭ Skip the currently playing song"),

  async execute(m) {
    try {
      await m.deferReply();
      const queue = queues.get(m.guildId);

      if (!queue || !queue.connection || !queue.player) {
        const noSongEmbed = new EmbedBuilder()
          .setTitle("❌ Nothing to Skip")
          .setDescription("No music is currently playing.")
          .setColor("Red");

        return m.editReply({ embeds: [noSongEmbed] });
      }

      if (queue.player.state.status !== AudioPlayerStatus.Playing) {
        const notPlayingEmbed = new EmbedBuilder()
          .setTitle("⚠️ No Song Playing")
          .setDescription("No song is currently playing.")
          .setColor("Yellow");

        return m.editReply({ embeds: [notPlayingEmbed] });
      }

      if (queue.loopCurrent) {
        const loopEmbed = new EmbedBuilder()
          .setTitle("⛔ Loop Mode Active")
          .setDescription("You cannot skip a song while it's in Current Song loop mode.")
          .setColor("Orange")
          .setFooter({ text: `Loop mode active in: ${m.guild.name}` });

        return m.editReply({ embeds: [loopEmbed] });
      }

      const skippedTrack = queue.tracks[0];
      queue.player.stop();

      const skippedEmbed = new EmbedBuilder()
        .setTitle("⏭ Track Skipped")
        .setDescription(`Skipped: [${skippedTrack.title}](${skippedTrack.url})`)
        .setThumbnail(skippedTrack.thumbnail)
        .setColor("Red")
        .setFooter({ text: `Skipped by ${m.user.username}`, iconURL: m.user.displayAvatarURL() });
      await m.editReply({ embeds: [skippedEmbed] });

    } catch (error) {
      logger.error(`Error in skip command: ${error}`);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription("An error occurred while trying to skip the song.")
        .setColor("Red");

      await m.editReply({ embeds: [errorEmbed] });
    }
  }
};
