// cli.ts
import { pausePlayback, playTrack } from "./spotify.ts";

const args = Deno.args;

if (args.length === 0) {
  console.log("Usage:");
  console.log(
    "  deno run --allow-net --allow-env --allow-read --allow-write cli.ts play [<spotify:track:URI>]",
  );
  console.log(
    "  deno run --allow-net --allow-env --allow-read --allow-write cli.ts pause",
  );
} else {
  const command = args[0];

  if (command === "play") {
    const trackUri = args[1];
    await playTrack(trackUri);
  } else if (command === "pause") {
    await pausePlayback();
  } else {
    console.log("Unknown command");
  }
}
