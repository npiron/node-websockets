'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3001;
const INDEX = '/index.html';
const { getData } = require('./binance-futurs');

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

wss.on('connection', (ws) => {
  ws.on('close', () => console.log('Client disconnected'));
  getData((data) => {
    ws.send(JSON.stringify(data));
  });
});
