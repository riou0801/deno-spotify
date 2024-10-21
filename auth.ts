const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const redirectUri = "http://localhost:8080"; // Make sure this matches the one in your Spotify app settings
const scopes = encodeURIComponent("user-modify-playback-state user-read-playback-state");

const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}`;

console.log("Go to the following URL to authorize the app:", authUrl);
