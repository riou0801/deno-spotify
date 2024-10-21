// auth.ts
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { readTextFile, writeTextFile } from "./utils.ts";

const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const redirectUri = "http://localhost:8080";
const tokenFilePath = "./spotify_token.json";
const scopes = encodeURIComponent(
  "user-modify-playback-state user-read-playback-state",
);

// Function to authorize user and get access token
export async function authorizeUser(): Promise<string> {
  const authUrl =
    `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}`;
  console.log("Go to this URL and authorize the app:", authUrl);

  const ac = new AbortController();

  const server = Deno.serve(
    { signal: ac.signal, port: 8080, hostname: "127.0.0.1" },
    async (req) => {
      const url = new URL(req.url, `http://127.0.0.1:8080`);
      const code = url.searchParams.get("code");

      if (code) {
        const accessToken = await getAccessTokenFromCode(code);
        return new Response(
          "Authorization complete. You can close this window.",
          {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          },
        );
      }
      return new Response("Authorization failed.", { status: 400 });
    },
  );

  await server.finished.then(() =>
    console.log("Access token obtained and server closed.")
  );
  ac.abort();
  return "Authorization process completed.";
}

// Function to get or refresh the access token
export async function getAccessToken(): Promise<string> {
  try {
    const tokenData = await readTextFile(tokenFilePath);
    const token = JSON.parse(tokenData);

    // Check if the token is expired and refresh if needed
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

// Exchange authorization code for access token
export async function getAccessTokenFromCode(code: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + encodeBase64(`${clientId}:${clientSecret}`),
    },
    body,
  });

  const data = await response.json();
  if (data.access_token) {
    await saveAccessToken(data);
    return data.access_token;
  } else {
    throw new Error("Failed to get access token");
  }
}

// Save access token in local storage
async function saveAccessToken(tokenInfo: object) {
  await writeTextFile(tokenFilePath, JSON.stringify(tokenInfo));
}

// Refresh the access token using the refresh token
export async function refreshAccessToken(
  refreshToken: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Failed to refresh token:", data);
    if (data.error === "invalid_grant") {
      console.log("Invalid refresh token. Reauthorizing...");
      return await authorizeUser();
    }
    throw new Error(`Failed to refresh token: ${data.error}`);
  }

  const tokenInfo = {
    access_token: data.access_token,
    refresh_token: refreshToken,
    expires_in: data.expires_in,
  };
  await saveAccessToken(tokenInfo);
  return data.access_token;
}
