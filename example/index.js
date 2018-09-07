const express = require('express');
const app = express();
const http = require('http').Server(app);
const port = process.env.PORT || 3000;
const proxy = require('../src/proxy');
const ips = require('./ip');
const path = require('path');

app.get('*', function(req, res, next) {
  console.log(req.url);
  next();
});

app.use(express.static(path.join(__dirname, 'static')));

app.get('/host', function(req, res) {
  res.sendFile(path.join(__dirname, 'static/html/host.html'));
});

app.get('/slave/:id', function(req, res) {
  res.sendFile(path.join(__dirname, 'static/html/slave.html'));
});

proxy(http);
const host = ips[0].addr;

http.listen(port, host, function() {
  console.log(`listening on ${host}:${port}`);
});