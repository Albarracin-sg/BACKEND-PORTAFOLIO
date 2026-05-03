const { createServer } = require('http');

let server;

async function startNestServer() {
  if (server) return server;
  
  // Start the NestJS server
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../../dist/app.module');
  const { ExpressAdapter } = require('@nestjs/platform-express');
  const express = require('express');
  
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  
  const app = await NestFactory.create(AppModule, adapter);
  app.setGlobalPrefix('api/v1');
  
  await app.init();
  server = app.getHttpAdapter().getHttpServer();
  
  return server;
}

exports.handler = async (event, context) => {
  // Start server if not running
  if (!server) {
    await startNestServer();
  }

  const { path, httpMethod, headers, body } = event;
  
  return new Promise((resolve, reject) => {
    const req = {
      method: httpMethod,
      path: path.replace('/.netlify/functions/server', ''),
      headers: {
        ...headers,
        'host': 'backend-portafolio.netlify.app',
      },
      body: body || '',
    };

    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      send: function(body) {
        this.body = typeof body === 'string' ? body : JSON.stringify(body);
        return this;
      },
      json: function(body) {
        this.body = JSON.stringify(body);
        return this;
      },
      setHeader: function(key, value) {
        this.headers[key] = value;
        return this;
      },
    };

    // Use the raw Node http module to handle the request
    const http = require('http');
    const parsedUrl = new URL(req.path, `http://${req.headers.host || 'localhost'}`);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: parsedUrl.pathname + parsedUrl.search,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        resolve({
          statusCode: proxyRes.statusCode,
          headers: {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
          },
          body: data,
        });
      });
    });

    proxyReq.on('error', (err) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      });
    });

    if (req.body) {
      proxyReq.write(req.body);
    }
    proxyReq.end();
  });
};