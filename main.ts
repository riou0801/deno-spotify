import { encodeBase64 } from "jsr:@std/encoding/base64";
// cli.ts

// Spotify API credentials (from environment variables)
const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const redirectUri = "http://localhost:8080";
const tokenFilePath = "./spotify_token.json"; // Local storage for access tokens

// Scopes for Spotify API
const scopes = encodeURIComponent("user-modify-playback-state user-read-playback-state");

// Function to get the access token from local storage or request a new one
async function getAccessToken(): Promise<string> {
  try {
    const tokenData = await Deno.readTextFile(tokenFilePath);
    const token = JSON.parse(tokenData);
    if (token.expires_in <= 0) {
      console.log("Access token expired, refreshing...");
      return await refreshAccessToken(token.refresh_token);
    }

    return token.access_token;
  } catch (err) {
    console.log("No access token found or invalid token. Starting OAuth flow.");
    return await authorizeUser();
  }
}

async function authorizeUser(): Promise<string> {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}`;
  console.log("Go to this URL and authorize the app:", authUrl);

  // Step 2: Set up a simple server to handle the callback with authorization code
  const ac = new AbortController();

  const server = Deno.serve(
    { signal: ac.signal, port: 8080, hostname: "127.0.0.1" },
    async (req) => {
      const url = new URL(req.url, `http://127.0.0.1:8080`);
      const code = url.searchParams.get("code");

      if (code) {
        // Step 3: Exchange authorization code for access token
       const accessToken: string = await getAccessTokenFromCode(code);

        // Return a response to the browser
        return new Response("Authorization complete. You can close this window.", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }

      return new Response("Authorization failed.", { status: 400 });

    },
  );

  // Close the server when the request is complete (optional if you need)
  await server.finished.then(() => console.log("Access token obtained and server closed."));
  ac.abort();
  return "Authorization process completed.";// You can modify this to return the access token or another message
}

// Step 3: Exchange authorization code for access token
async function getAccessTokenFromCode(code: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + (encodeBase64(`${clientId}:${clientSecret}`)) 
    },
    body,
  });

  const data = await response.json();

  const tokenInfo = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in
  };

  if (data.access_token) {
    await saveAccessToken(data);
    return data.access_token;
  } else {
    throw new Error("Failed to get access token");
  }
}

// Save the access token in a local file
async function saveAccessToken(tokenInfo: string) {
  await Deno.writeTextFile(tokenFilePath, JSON.stringify(tokenInfo));
}

// Function to refresh access token using the refresh token
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams();
  body.append("grant_type", "refresh_token");
  body.append("refresh_token", refreshToken);
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to refresh token:", data);
    if (data.error === "invalid_grant" && data.error_description.includes("Invalid refresh token")) {
      console.log("Refresh token is invalid. Reauthorizing...");
      return await authorizeUser();
      
    }
    throw new Error(`Failed to refresh token: ${data.error}`);
  }

  // Save the new access token and update the expiration time
  const tokenInfo = {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep the same refresh token
    expires_in: data.expires_in,
  };

  await Deno.writeTextFile(tokenFilePath, JSON.stringify(tokenInfo));
  return data.access_token;
}

// Function to pause playback
async function pausePlayback() {
  const accessToken = await getAccessToken();
  const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (response.ok) {
    console.log("Playback paused.");
  } else {
    console.error("Failed to pause playback:", await response.text());
  }
}

// Function to play a track
async function playTrack(trackUri?: string) {
  let accessToken = await getAccessToken();

  // The body will be populated only if a trackUri is provided
  const body = trackUri
    ? JSON.stringify({ uris: [trackUri] })
    : JSON.stringify({}); // If no trackUri, send an empty body to resume playback

  // Make a request to the Spotify API to play/resume playback
  const response = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: trackUri ? body : undefined, // No need for body if resuming
  });

  if (response.ok) {
    if (trackUri) {
      console.log(`Track ${trackUri} is now playing!`);
    } else {
      console.log("Playback resumed.");
    }
  } else {
    const responseBody = await response.json();
    console.error("Failed to play/resume track:", responseBody);
  if (response.status === 401) {
    console.log("Access token expired. Attempting to refresh token.");
    const refreshedToken = await refreshAccessToken(await Deno.readTextFile(tokenFilePath));                                              
    accessToken = await JSON.parse(refreshedToken).refreshToken
  }
    // Handle specific errors, like when no device is available
    if (responseBody.error?.reason === "NO_ACTIVE_DEVICE") {
      console.error("No active Spotify device found. Please open Spotify on a device and try again.");
    }
  }
}

// CLI Command Handling
const args = Deno.args;

if (args.length === 0) {
  console.log("Usage:");
  console.log("  deno run --allow-net --allow-env --allow-read --allow-write cli.ts play [<spotify:track:URI>]");
  console.log("  deno run --allow-net --allow-env --allow-read --allow-write cli.ts pause");
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
