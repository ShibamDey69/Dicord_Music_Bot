import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { queues } from "./play.js";
import logger from "../../utils/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("📃 View the current song queue"),

  async execute(m) {
    try {
      await m.deferReply();

      const queue = queues.get(m.guildId);
      if (!queue || queue.tracks.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setTitle("📭 Empty Queue")
          .setDescription("There are no songs in the queue right now.")
          .setColor("Red");

        return m.editReply({ embeds: [emptyEmbed] });
      }

      const embed = new EmbedBuilder()
        .setTitle("🎶 Music Queue")
        .setColor("Blue")
        .setThumbnail(queue.tracks[0].thumbnail)
        .setFooter({ text: `Total Songs: ${queue.tracks.length}` });

      const lines = queue.tracks.map((track, i) =>
        `**${i + 1}.** [${track.title}](${track.url}) ・ \`${track.duration || "?"}\`${i === 0 ? " **(Now Playing)**" : ""}`
      );

      const chunks = [];
      let chunk = "";

      for (const line of lines) {
        if ((chunk + line + "\n").length > 1024) {
          chunks.push(chunk);
          chunk = "";
        }
        chunk += line + "\n";
      }

      if (chunk) chunks.push(chunk);
      chunks.forEach((c, i) => embed.addFields({ name: i === 0 ? "Tracks" : `Page ${i + 1}`, value: c }));

      await m.editReply({ embeds: [embed] });

    } catch (err) {
      logger.error(`Error in queue command: ${err}`);
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription("An error occurred while showing the queue.")
        .setColor("Red");

      await m.editReply({ embeds: [errorEmbed] });
    }
  },
};
