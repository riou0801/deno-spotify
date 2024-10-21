// play spotify with spotify web api in deno
import { createSpotifyOAuthConfig } from "jsr:@deno/kv-oauth";

const oauthConfig = createSpotifyOAuthConfig({
  redirectUri: "http://localhost:8080",
  scope: "user-read-private user-read-email user-modify-playback-state",
});

// console.log(oauthConfig)
// 情報が帰ってきたので次
// できたconfigを使ってアクセストークンの取得
// fetch APIを使ってみる
const authQuery = {
  client_id: oauthConfig.clientId,
  response_type: "code",
  redirect_uri: oauthConfig.redirectUri,
  scope: "user-read-private user-read-email user-modify-playback-state" 
}

const response = await fetch("http://accounts.spotify.com/authorize", {
  method: "POST",
  body: JSON.stringify(authQuery),
});

console.log(response);

// authorizeできなかった。client_idがないよとのこと
// {
//   clientId: "0c545ce7204e404a824b251e6e447d4c",
//   clientSecret: "266cd8acef1542a88a82f30cd77b66d7",
//   authorizationEndpointUri: "https://accounts.spotify.com/authorize",
//   tokenUri: "https://accounts.spotify.com/api/token",
//   redirectUri: "http://localhost:8080",
//   defaults: {
//     scope: "user-read-private user-read-email user-modify-playback-state"
//   }
// }
// 正しい形になっていないかパースしないと行けないのかも？
// よくわからないからベタうちする


