import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { queues } from "./play.js";
import logger from "../../utils/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("🔁 Loop the current song or the whole queue")
    .addStringOption(option =>
      option.setName("mode")
        .setDescription("Loop mode: current song or entire queue")
        .setRequired(true)
        .addChoices(
          { name: "Current Song", value: "current" },
          { name: "Queue", value: "queue" }
        )
    ),

  async execute(m) {
    try {
      await m.deferReply();
      const queue = queues.get(m.guildId);

      if (!queue || !queue.tracks.length) {
        return m.editReply("❌ Nothing is currently playing.");
      }

      const mode = m.options.getString("mode");

      if (mode === "current") {
        queue.loopCurrent = !queue.loopCurrent;
        queue.loopQueue = false; // disable other mode if set
        queue.tracks.splice(1);
        const embed = new EmbedBuilder()
          .setTitle(queue.loopCurrent ? "🔂 Loop Enabled" : "🔁 Loop Disabled")
          .setDescription(
            queue.loopCurrent
              ? `The **current song** will loop continuously.`
              : `Looping for the current song has been disabled.`
          )
          .setColor(queue.loopCurrent ? "Green" : "Orange")
          .setFooter({ text: `Loop mode: current • ${m.guild.name}` });

        return m.editReply({ embeds: [embed] });
      }

      if (mode === "queue") {
        queue.loopQueue = !queue.loopQueue;
        queue.loopCurrent = false; // disable other mode if set

        const embed = new EmbedBuilder()
          .setTitle(queue.loopQueue ? "🔁 Queue Loop Enabled" : "🔁 Queue Loop Disabled")
          .setDescription(
            queue.loopQueue
              ? `The **entire queue** will loop endlessly.`
              : `Looping for the entire queue has been disabled.`
          )
          .setColor(queue.loopQueue ? "Green" : "Orange")
          .setFooter({ text: `Loop mode: queue • ${m.guild.name}` });

        return m.editReply({ embeds: [embed] });
      }

    } catch (error) {
      logger.error(`Error in loop command: ${error}`);
      await m.editReply("❌ An error occurred while setting the loop mode.");
    }
  }
};
