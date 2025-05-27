import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { queues } from "./play.js";
import logger from "../../utils/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("break")
    .setDescription("⛔ Stop any active loop mode"),

  async execute(m) {
    try {
      await m.deferReply();
      const queue = queues.get(m.guildId);

      if (!queue || !queue.tracks.length) {
        const noMusicEmbed = new EmbedBuilder()
          .setTitle("❌ Nothing Playing")
          .setDescription("There is no music playing at the moment.")
          .setColor("Red");
      
        return m.editReply({ embeds: [noMusicEmbed] });
      }
      
      if (!queue.loopCurrent && !queue.loopQueue) {
        const noLoopEmbed = new EmbedBuilder()
          .setTitle("ℹ️ No Loop Active")
          .setDescription("Neither the current song nor the queue is in loop mode.")
          .setColor("Yellow");
      
        return m.editReply({ embeds: [noLoopEmbed] });
      }

      queue.loopCurrent = false;
      queue.loopQueue = false;

      const embed = new EmbedBuilder()
        .setTitle("⛔ Loop Stopped")
        .setDescription(
          "Both **current song** and **queue** loop modes have been disabled."
        )
        .setColor("Red")
        .setFooter({ text: `Loop broken • ${m.guild.name}` });

      return m.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error(`Error in break command: ${err}`);
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription("An error occurred while trying to break the loop.")
        .setColor("Red");

      await m.editReply({ embeds: [errorEmbed] });
    }
  },
};
