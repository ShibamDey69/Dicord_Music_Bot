import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType
} from "@discordjs/voice";
import yts from "yt-search";
import getAudioStream from "../../utils/ytdl.js";
import logger from "../../utils/logger.js";

export const queues = new Map();

const isLink = (args) => args.includes("https");
const isPlaylist = (args) => args.includes("playlist?list=") || args.includes("&list=");

const createErrorEmbed = (title, description) => 
  new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor("Red");

const createSuccessEmbed = (title, description, thumbnail = null) =>
  new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setThumbnail(thumbnail)
    .setColor("Green");

export default {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song or playlist from YouTube")
    .addStringOption((option) =>
      option
        .setName("song")
        .setDescription("Song name, URL, or playlist URL")
        .setRequired(true)
    ),

  async execute(m) {
    await m.deferReply();
    
    const voiceChannel = m.member.voice.channel;
    if (!voiceChannel) {
      return m.editReply({
        embeds: [createErrorEmbed("❌ Voice Channel Required", "You need to join a voice channel first!")],
      });
    }

    try {
      const song = m.options.getString("song");

      if (!queues.has(m.guildId)) {
        const player = createAudioPlayer({
          behaviors: { noSubscriber: NoSubscriberBehavior.Stop },
        });

        queues.set(m.guildId, {
          connection: null,
          player: player,
          tracks: [],
          loopCurrent: false,
          loopQueue: false,
          processing: false,
          m,
        });

        player.on(AudioPlayerStatus.Error, (error) => {
          logger.error(`Audio player error: ${error.message}`);
          const errorEmbed = createErrorEmbed("❌ Audio Player Error", `An error occurred: ${error.message}`);
          m.followUp({ embeds: [errorEmbed] }).catch(() => {});
          
          const queue = queues.get(m.guildId);
          if (queue) {
            queue.tracks.shift();
            playNext(m.guildId);
          }
        });
      }

      const queue = queues.get(m.guildId);

      if (queue.loopCurrent) {
        return m.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("⛔ Loop Mode Active")
              .setDescription("You cannot add songs while in Current Song loop mode.")
              .setColor("Orange")
              .setFooter({ text: `Loop mode active in: ${m.guild.name}` }),
          ],
        });
      }

      if (!queue.connection) {
        queue.connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          selfDeaf: true,
        });

        queue.connection.on("stateChange", (oldState, newState) => {
          if (newState.status === VoiceConnectionStatus.Disconnected) {
            setTimeout(() => queue.connection.rejoin(), 500);
          }
          if (oldState.status === VoiceConnectionStatus.Ready && newState.status === VoiceConnectionStatus.Connecting) {
              queue.connection.configureNetworking()
          }
        });

        await entersState(queue.connection, VoiceConnectionStatus.Ready, 5000).catch((error) => {
          queue.connection.destroy();
          queue.connection = null;
          throw error;
        });

        queue.connection.subscribe(queue.player);
      }

      await m.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔍 Searching...")
            .setDescription(`Looking for: ${song}`)
            .setColor("Blue"),
        ],
      });

      if (isLink(song) && isPlaylist(song)) {
        await handlePlaylist(m, song, queue);
      } else {
        await handleSingleVideo(m, song, queue);
      }

      if (queue.player.state.status === AudioPlayerStatus.Idle && !queue.processing) {
        playNext(m.guildId);
      }

    } catch (error) {
      logger.error(`Error in play command: ${error}`);
      await m.editReply({
        embeds: [createErrorEmbed("❌ Error", "There was an error while processing your request.")],
      });
    }
  },
};

async function handlePlaylist(m, song, queue) {
  try {
    const playlistId = song.match(/[&?]list=([^&]+)/)?.[1];
    if (!playlistId) {
      return await m.editReply({
        embeds: [createErrorEmbed("❌ Invalid Playlist URL", "Could not extract playlist ID from the URL.")],
      });
    }

    await m.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📋 Loading Playlist...")
          .setDescription("Fetching videos from playlist, please wait...")
          .setColor("Yellow"),
      ],
    });

    const playlistResult = await yts({ listId: playlistId });
    
    if (!playlistResult || !playlistResult.videos || playlistResult.videos.length === 0) {
      return await m.editReply({
        embeds: [createErrorEmbed("❌ Playlist Not Found", "Could not find any videos in this playlist or the playlist is private.")],
      });
    }

    const videos = playlistResult.videos
    const addedCount = videos.length;
    const queuePositionStart = queue.tracks.length + 1;

    videos.forEach(video => {
      queue.tracks.push({
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        thumbnail: video.thumbnail,
        duration: video.duration.timestamp,
      });
    });

    await m.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📋 Playlist Added to Queue")
          .setDescription(`Added **${addedCount}** songs from playlist`)
          .setThumbnail(videos[0]?.thumbnail || null)
          .addFields(
            {
              name: "First Track",
              value: `[${videos[0]?.title}](${videos[0]?.url})`,
              inline: false,
            },
            {
              name: "Queue Position",
              value: `${queuePositionStart} - ${queuePositionStart + addedCount - 1}`,
              inline: true,
            },
            {
              name: "Total Queue Length",
              value: `${queue.tracks.length}`,
              inline: true,
            }
          )
          .setFooter({ text: `Playlist loaded by ${m.user.username}` })
          .setColor("Purple"),
      ],
    });

  } catch (error) {
    logger.error(`Error loading playlist: ${error}`);
    return await m.editReply({
      embeds: [createErrorEmbed("❌ Playlist Error", "There was an error loading the playlist."+error.message)],
    });
  }
}

async function handleSingleVideo(m, song, queue) {
  const video = isLink(song) ? song : (await yts(song)).videos[0];

  if (!video) {
    return await m.editReply({
      embeds: [createErrorEmbed("🔍 No Results Found", "Couldn't find any matching video for your query.")],
    });
  }

  let videoInfo = video;
  if (isLink(song)) {
    try {
      const videoId = song.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      const searchResult = await yts({ videoId });
      if (searchResult) {
        videoInfo = {
          title: searchResult.title,
          url: searchResult.url,
          thumbnail: searchResult.thumbnail,
          timestamp: searchResult.timestamp,
        };
      }
    } catch (error) {
      videoInfo = {
        title: "YouTube Video",
        url: song,
        thumbnail: "",
        timestamp: "Unknown",
      };
    }
  }

  queue.tracks.push({
    title: videoInfo.title,
    url: videoInfo.url,
    thumbnail: videoInfo.thumbnail,
    duration: videoInfo.timestamp,
    textChannel: m.channel,
  });

  await m.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle("➕ Added to Queue")
        .setDescription(`[${videoInfo.title}](${videoInfo.url})`)
        .setThumbnail(videoInfo.thumbnail)
        .addFields({
          name: "Duration",
          value: `${videoInfo.timestamp || "Unknown"}`,
          inline: true,
        })
        .setFooter({ text: `Queue Position: ${queue.tracks.length}` })
        .setColor("Random"),
    ],
  });
}

export async function playNext(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.tracks.length) {
    if (queue?.connection) queue.connection.destroy();
    queues.delete(guildId);
    return;
  }
  if (queue && queue.tracks.length > 0) {
    const track = queue.tracks[0];

    const nowPlayingEmbed = new EmbedBuilder()
      .setTitle("🎧 Now Playing")
      .setDescription(`[${track.title}](${track.url})`)
      .setThumbnail(track.thumbnail)
      .addFields({
        name: "Duration",
        value: `${track.duration || "Unknown"}`,
        inline: true,
      })
      .setFooter({ text: `Queue Length: ${queue.tracks.length - 1}` })
      .setColor("Green");

    queue.textChannel.send({ embeds: [nowPlayingEmbed] }).catch(() => {
      logger.error(`Error sending now playing message: ${error}`);
    });
  }

  if (queue.processing) return;
  queue.processing = true;

  const track = queue.tracks[0];

  try {
    const { result } = await getAudioStream.ytmp3(track.url);

    if (!result.stream) {
      queue.tracks.shift();
      queue.processing = false;
      return playNext(guildId);
    }

    const resource = createAudioResource(result.stream, {
      inlineVolume: true,
      inputType: StreamType.Opus,
      highWaterMark: 1024 * 1024 * 10
    });

    if (resource.volume) resource.volume.setVolume(1.0);

    queue.player.play(resource);
    queue.processing = false;

    queue.player.once(AudioPlayerStatus.Idle, () => {
      if (queue.loopCurrent) return playNext(guildId);
      if (queue.loopQueue) queue.tracks.push(queue.tracks.shift());
      else queue.tracks.shift();

      setTimeout(() => playNext(guildId), 500);
    });
  } catch (error) {
    logger.error(`Error playing track: ${error}`);
    const errorEmbed = createErrorEmbed("❌ Error", `Failed to play ${track.title}`);

    await queue.m.followUp({ embeds: [errorEmbed] }).catch(() => {});

    queue.tracks.shift();
    queue.processing = false;
    playNext(guildId);
  }
}