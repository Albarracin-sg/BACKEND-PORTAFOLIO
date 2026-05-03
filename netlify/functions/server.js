// Netlify Function that runs NestJS
const { startServer } = require('../../dist/main');

let serverPromise = null;

exports.handler = async (event, context) => {
  // Start server if not started
  if (!serverPromise) {
    serverPromise = startServer();
  }

  await serverPromise;

  // Forward request to local server
  const { path, httpMethod, headers, body } = event;

  // Remove /api/v1 from path if present
  const cleanPath = path.replace(/^\/api\/v1/, '') || '/';
  const url = new URL(cleanPath, 'http://localhost:3000');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: url.pathname + url.search,
      method: httpMethod,
      headers: {
        ...headers,
        'host': 'backend-portafolio.netlify.app',
      },
    };

    const req = require('http').request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: {
            ...res.headers,
            'Access-Control-Allow-Origin': '*',
          },
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 502,
        body: JSON.stringify({ error: 'Backend not ready', detail: err.message }),
      });
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
};