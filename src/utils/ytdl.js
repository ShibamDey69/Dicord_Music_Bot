import axios from "axios";
import crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";
import prism from "prism-media";

const savetube = {
  api: {
    base: "https://media.savetube.me/api",
    cdn: "/random-cdn",
    info: "/v2/info",
    download: "/download",
  },
  headers: {
    accept: "/",
    "content-type": "application/json",
    origin: "https://yt.savetube.me",
    referer: "https://yt.savetube.me/",
    "user-agent": "Postify/1.0.0",
  },
  crypto: {
    hexToBuffer: (hexString) => {
      const matches = hexString.match(/.{1,2}/g);
      return Buffer.from(matches.join(""), "hex");
    },
    decrypt: async (enc) => {
      try {
        const secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12";
        const data = Buffer.from(enc, "base64");
        const iv = data.slice(0, 16);
        const content = data.slice(16);
        const key = savetube.crypto.hexToBuffer(secretKey);
        const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
        let decrypted = decipher.update(content);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString());
      } catch {
        throw new Error("Failed to decrypt data.");
      }
    },
  },
  youtube: (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    ];
    for (let pattern of patterns) {
      if (pattern.test(url)) return url.match(pattern)[1];
    }
    return null;
  },
  request: async (endpoint, data = {}, method = "post") => {
    try {
      const { data: response } = await axios({
        method,
        url: `${
          endpoint.startsWith("http") ? "" : savetube.api.base
        }${endpoint}`,
        data: method === "post" ? data : undefined,
        params: method === "get" ? data : undefined,
        headers: savetube.headers,
      });
      return { status: true, code: 200, data: response };
    } catch {
      throw new Error("Request to SaveTube API failed.");
    }
  },
  getCDN: async () => {
    const response = await savetube.request(savetube.api.cdn, {}, "get");
    if (!response.status) throw new Error("Failed to retrieve CDN.");
    return { status: true, code: 200, data: response.data.cdn };
  },
  convertMp3ToOpus: async (mp3Stream) => {
    const ffmpegStream = ffmpeg(mp3Stream)
      .inputFormat("mp3")
      .audioCodec("libopus")
      .audioChannels(2)
      .format("opus")
      .on("error", (err) => {
        throw new Error("Failed to convert MP3 to Opus.");
      })
      .pipe();

    const opusStream = new prism.opus.OggDemuxer();
    ffmpegStream.pipe(opusStream);

    return opusStream;
      
  },
  ytmp3: async (link) => {
    if (!link) {
      return {
        status: false,
        code: 400,
        error: "Please provide a valid YouTube link.",
      };
    }

    const id = savetube.youtube(link);
    if (!id) {
      return {
        status: false,
        code: 400,
        error: "Invalid YouTube link format.",
      };
    }

    try {
      const cdnx = await savetube.getCDN();
      const cdn = cdnx.data;

      const result = await savetube.request(
        `https://${cdn}${savetube.api.info}`,
        {
          url: `https://www.youtube.com/watch?v=${id}`,
        }
      );

      const decrypted = await savetube.crypto.decrypt(result.data.data);

      const dl = await savetube.request(
        `https://${cdn}${savetube.api.download}`,
        {
          id,
          downloadType: "audio",
          quality: "128",
          key: decrypted.key,
        }
      );

      const { downloadUrl } = dl.data.data;

      const { data: mp3Stream } = await axios.get(downloadUrl, {
        responseType: "stream",
        headers: { ...savetube.headers },
      });

      const opusStream = await savetube.convertMp3ToOpus(mp3Stream);

      return {
        status: true,
        code: 200,
        result: {
          type: "audio",
          format: "opus",
          thumbnail:
            decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/0.jpg`,
          stream: opusStream,
          quality: "128",
        },
      };
    } catch (error) {
      return {
        status: false,
        code: 500,
        error: error.message || "An unexpected error occurred.",
      };
    }
  },
};

export default savetube;
