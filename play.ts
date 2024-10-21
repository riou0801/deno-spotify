
export async function playTrack(accessToken: string, trackUri: string) {
  const response = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uris: [trackUri],
    }),
  });

  if (response.ok) {
    console.log("Track started playing!");
  } else {
    console.error("Failed to play track:", await response.text());
  }
}


// Example usage:
const accessToken = "YOUR_ACCESS_TOKEN"; // Replace with the actual access token
const trackUri = "spotify:track:7ouMYWpwJ422jRcDASZB7P"; // Replace with a track URI
await playTrack(accessToken, trackUri);
