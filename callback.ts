import { Buffer } from "node:buffer"

const authCode = "AQA0YmFteSPMaI318VZpJAidhVeOzsI5TH-JfN4mKQmkCb7nKPD_m60p7fWAR5ZRBtGagAdKr7730uXWfXUqCRtSlSS0echMaUmK6UYQ4oj3o9Vxmddu1ZYjexq3xc-HMGgrzMZ6MRuVyWI-w_5SipcnaB5i5y3t6l401EwZqSHAx1CrRvcTD1KSedajquogofe-pJ4Q0iH2Jrv4fbmdgQfje7kyiSvPXkZpeysUbA"

const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
const redirectUri = "http://localhost:8080/callback";

export async function getAccessToken(code: string) {
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
      "Authorization": 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    },
    body,
  });

  const data = await response.json();
  return data.access_token;
}

Deno.serve({port: 8080, hostname: "localhost"},
           async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code")!;
    const accessToken = await getAccessToken(code);
    return new Response(`Access Token: ${accessToken}`, { status: 200 });
  }
  
  return new Response("Not Found", { status: 404 });
});
