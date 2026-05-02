import http from 'node:http';
import { URL, URLSearchParams } from 'node:url';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  console.error('Missing required env vars: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI');
  process.exit(1);
}

const parsedRedirectUri = new URL(redirectUri);
const scope = 'user-read-currently-playing user-read-recently-played';

const authUrl = new URL('https://accounts.spotify.com/authorize');
authUrl.search = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  scope,
  redirect_uri: redirectUri,
  show_dialog: 'true',
}).toString();

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Missing request URL');
    return;
  }

  const callbackUrl = new URL(request.url, redirectUri);
  const code = callbackUrl.searchParams.get('code');
  const error = callbackUrl.searchParams.get('error');

  if (error) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`Spotify returned error: ${error}`);
    server.close();
    return;
  }

  if (!code) {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Spotify auth helper running. Open printed URL in browser.');
    return;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(`Spotify token exchange failed: ${JSON.stringify(tokenData)}`);
      server.close();
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Spotify autorizado. Volvé a terminal para copiar refresh_token.');

    console.log('\n=== Spotify Tokens ===');
    console.log(`access_token: ${tokenData.access_token ?? ''}`);
    console.log(`refresh_token: ${tokenData.refresh_token ?? ''}`);
    console.log(`expires_in: ${tokenData.expires_in ?? ''}`);
    console.log('======================\n');

    if (!tokenData.refresh_token) {
      console.warn('No refresh_token returned. Remove app access in Spotify, keep show_dialog=true, and try again.');
    }

    server.close();
  } catch (cause) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Unexpected error exchanging Spotify code');
    console.error(cause);
    server.close();
  }
});

server.listen(Number(parsedRedirectUri.port || 80), parsedRedirectUri.hostname, () => {
  console.log(`Spotify auth helper listening on ${redirectUri}`);
  console.log('Open this URL in your browser:\n');
  console.log(authUrl.toString());
  console.log('\nAfter approve, script prints refresh_token.');
});
