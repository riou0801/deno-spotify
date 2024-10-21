// spotify.ts
import { getAccessToken, refreshAccessToken } from "./auth.ts";
import { readTextFile } from "./utils.ts";

// Function to play a track
export async function playTrack(trackUri?: string) {
  let accessToken = await getAccessToken();

  const body = trackUri
    ? JSON.stringify({ uris: [trackUri] })
    : JSON.stringify({});
  const response = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: trackUri ? body : undefined,
  });

  if (response.ok) {
    trackUri
      ? console.log(`Track ${trackUri} is now playing!`)
      : console.log("Playback resumed.");
  } else {
    console.error("Failed to play/resume track:", await response.text());
    if (response.status === 401) {
      console.log("Access token expired. Refreshing token...");
      const tokenInfo = await readTextFile("./spotify_token.json");
      const refreshedToken = await refreshAccessToken(
        JSON.parse(tokenInfo).refresh_token,
      );
      console.log(`New access token: ${refreshedToken}`);
    }
  }
}

// Function to pause playback
export async function pausePlayback() {
  const accessToken = await getAccessToken();
  const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: { "Authorization": `Bearer ${accessToken}` },
  });

  if (response.ok) {
    console.log("Playback paused.");
  } else {
    console.error("Failed to pause playback:", await response.text());
  }
}
