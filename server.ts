import 'zone.js/dist/zone-node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';

import { AppServerModule } from './src/main.server';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/hubspot-oauth-angular-project/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule,
  }));

//---------------------------new code---------------

  const request = require('request-promise-native');
  const NodeCache = require('node-cache'); 
  var session = require('express-session');
  
  const refreshTokenStore = {};
  const accessTokenCache = new NodeCache({ deleteOnExpire: true });
 
  const CLIENT_ID = 'd95f4b80-3148-459e-86ce-4aa14b2cab46';
  const CLIENT_SECRET = '433c70f0-0b07-4729-8fb4-ffe90554a0c7';

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing CLIENT_ID or CLIENT_SECRET environment variable.')
  }

  let SCOPES = 'crm.objects.contacts.read';
  
  const REDIRECT_URI = `http://localhost:4200/oauth-callback`;

  server.use(session({
    secret: Math.random().toString(36).substring(2),
    resave: false,
    saveUninitialized: true
  }));

  const authUrl =
    'https://app.hubspot.com/oauth/authorize' +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` + // app's client ID
    `&scope=${encodeURIComponent(SCOPES)}` + // scopes being requested by the app
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`; // where to send the user after the consent page

  
  server.get('/install', (req, res) => {
    console.log('=== Initiating OAuth 2.0 flow with HubSpot ===');
    console.log('');
    console.log("===> Step 1: Redirecting user to your app's OAuth URL");
    res.redirect(authUrl)
    console.log('===> Step 2: User is being prompted for consent by HubSpot');
  });
  
  server.get('/oauth-callback', async (req, res) => {
    console.log('===> Step 3: Handling the request sent by the server');
  
    // Received a user authorization code, so now combine that with the other
    // required values and exchange both for an access token and a refresh token
    if (req.query['code']) {
        console.log('       > Received an authorization token');
  
        const authCodeProof = {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code: req.query['code']
      };
    
      // Step 4
      // Exchange the authorization code for an access token and refresh token
      console.log('===> Step 4: Exchanging authorization code for an access token and refresh token');
      
      console.log(req.sessionID);
      //const token = await exchangeForTokens(req.query['sessionID'], authCodeProof);
      //if (token.message) {
      //  return res.redirect(`/error?msg=${token.message}`);
      //}
  
      // Once the tokens have been retrieved, use them to make a query
      // to the HubSpot API
      //res.redirect(`/`);
    }
  });  

  /*const exchangeForTokens = async (userId, exchangeProof) => {
    try {
      const responseBody = await request.post('https://api.hubapi.com/oauth/v1/token', {
        form: exchangeProof
      });
      // Usually, this token data should be persisted in a database and associated with a user identity.
      const tokens = JSON.parse(responseBody);
      refreshTokenStore[userId] = tokens.refresh_token;
      accessTokenCache.set(userId, tokens.access_token, Math.round(tokens.expires_in * 0.75));

      console.log('       > Received an access token and refresh token');
      return tokens.access_token;
    } catch (e) {
      console.error(`       > Error exchanging ${exchangeProof.grant_type} for access token`);
      return JSON.parse(e.response.body);
    }
  };*/

  /*const refreshAccessToken = async (userId) => {
    const refreshTokenProof = {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      refresh_token: refreshTokenStore[userId]
    };
    return await exchangeForTokens(userId, refreshTokenProof);
  };

  const getAccessToken = async (userId) => {
    // If the access token has expired, retrieve
    // a new one using the refresh token
    if (!accessTokenCache.get(userId)) {
      console.log('Refreshing expired access token');
      await refreshAccessToken(userId);
    }
    return accessTokenCache.get(userId);
  };

  const isAuthorized = (userId) => {
    return refreshTokenStore[userId] ? true : false;
  };*/

  //====================================================//
  //   Using an Access Token to Query the HubSpot API   //
  //====================================================//

  /*const getContact = async (accessToken) => {
    console.log('');
    console.log('=== Retrieving a contact from HubSpot using the access token ===');
    try {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };
      console.log('===> Replace the following request.get() to test other API calls');
      console.log('===> request.get(\'https://api.hubapi.com/contacts/v1/lists/all/contacts/all?count=1\')');
      const result = await request.get('https://api.hubapi.com/contacts/v1/lists/all/contacts/all?count=2', {
        headers: headers
      });

      return JSON.parse(result).contacts[0];
    } catch (e) {
      console.error('  > Unable to retrieve contact');
      return JSON.parse(e.response.body);
    }
  };

  //========================================//
  //   Displaying information to the user   //
  //========================================//

  const displayContactName = (res, contact) => {
    if (contact.status === 'error') {
      res.write(`<p>Unable to retrieve contact! Error Message: ${contact.message}</p>`);
      return;
    }
    const { firstname, lastname } = contact.properties;
    res.write(`<p>Contact name: ${firstname.value} ${lastname.value}</p>`);
  };

  server.get('/', async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.write(`<h2>HubSpot OAuth 2.0 Quickstart App</h2>`);
    if (isAuthorized(req.sessionID)) {
      const accessToken = await getAccessToken(req.sessionID);
      const contact = await getContact(accessToken);
      res.write(`<h4>Access token: ${accessToken}</h4>`);
      displayContactName(res, contact);
    } else {
      res.write(`<a href="/install"><h3>Install the app</h3></a>`);
    }
    res.end();
  });

  server.get('/error', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.write(`<h4>Error: ${req.query.msg}</h4>`);
    res.end();
  });*/

//-----------------------------------------------------

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', (req, res) => {
    console.log("rendering the server.ts file");
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';