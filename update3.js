
import fs from "fs";
import path from "path";

const START_URL = "https://url24.link/AtomSporTV";
const OUTPUT_FOLDER = "streams3";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  Referer: "https://url24.link/",
};

const M3U8_HEADER = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5500000,AVERAGE-BANDWIDTH=8976000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",FRAME-RATE=25`;

async function getStreamUrl() {
  let currentUrl = START_URL;
  let referer = HEADERS.Referer;

  try {
    for (let i = 0; i < 10; i++) {
      console.log(`Requesting: ${currentUrl}`);

      let response;

      try {
        response = await fetch(currentUrl, {
          headers: {
            ...HEADERS,
            Referer: referer,
          },
          redirect: "manual",
        });
      } catch (e) {
        const cause = e.cause;

        throw new Error(
          `Request failed at ${currentUrl}\n` +
          `Cause: ${cause?.code ?? ""} ${cause?.message ?? e.message}`
        );
      }

      const location = response.headers.get("location");

      if (
        response.status >= 300 &&
        response.status < 400 &&
        location
      ) {
        await response.body?.cancel();

        referer = currentUrl;
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} at ${currentUrl}`);
      }

      const html = await response.text();

      const sourceMatch = html.match(
        /\bsource\s*:\s*(['"])(https?:\/\/[^'"]+)\1/i
      );

      const streamUrl = sourceMatch?.[2] ?? null;

      if (streamUrl) {
        console.log("Detected stream:", streamUrl);
        return streamUrl;
      }

      throw new Error(`Source URL not found in ${currentUrl}`);
    }

    throw new Error("Too many redirects.");
  } catch (e) {
    console.error("Failed to get stream:", e.message);
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });

  console.log("Scanning stream...");

  const streamUrl = await getStreamUrl();

  if (!streamUrl) {
    console.warn("No stream found.");
    return;
  }

  const fileName = path.basename(new URL(streamUrl).pathname);
  const filePath = path.join(OUTPUT_FOLDER, "bein-sports-1.m3u8");

  fs.writeFileSync(filePath, `${M3U8_HEADER}\n${streamUrl}`);

  console.log(`Saved ${filePath}`);
}

main();
