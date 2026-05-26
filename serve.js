#!/usr/bin/env node
/**
 * serve.js — 本地开发静态服务器
 * 支持 SPA fallback：/products/detail/DLB-TBS30/ → /products/detail/index.html
 */

var fs = require("fs");
var path = require("path");
var https = require("https");
var http = require("http");

var DIST = path.join(__dirname, "dist");
var PORT = 3000;
var HOST = "0.0.0.0";

// SSL certs
var certPath = "/Users/chee/certs/192.168.3.180.pem";
var keyPath = "/Users/chee/certs/192.168.3.180-key.pem";

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

// SPA fallback rules: paths matching these patterns serve a specific index.html
// (product detail pages all share the same template at /products/detail/index.html)
var SPA_FALLBACKS = [
  { pattern: /^\/products\/detail\/[^/]+\/?$/, target: "products/detail/index.html" },
  { pattern: /^\/products\/[^/]+\/[^/]+\/?$/, target: "products/detail/index.html" },
  { pattern: /^\/products\/[^/]+\/?$/, target: "products/detail/index.html" },
  { pattern: /^\/products\/[^/]+\/[^/]+\/index-(pc|mobile|tablet)\.html$/, target: "products/detail/index.html" },
];

function resolve(urlPath) {
  var clean = urlPath.split("?")[0].split("#")[0];
  // Try exact file
  var fp = path.join(DIST, clean);
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
  // Try directory + index.html
  if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
    var idx = path.join(fp, "index.html");
    if (fs.existsSync(idx)) return idx;
  }
  // SPA fallback
  for (var i = 0; i < SPA_FALLBACKS.length; i++) {
    if (SPA_FALLBACKS[i].pattern.test(clean)) {
      var fp3 = path.join(DIST, SPA_FALLBACKS[i].target);
      if (fs.existsSync(fp3)) return fp3;
    }
  }
  // 404
  var notFound = path.join(DIST, "404.html");
  if (fs.existsSync(notFound)) return notFound;
  return null;
}

function handler(req, res) {
  var fp = resolve(req.url);
  if (!fp) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }
  var ext = path.extname(fp);
  var mime = MIME[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  fs.createReadStream(fp).pipe(res);
}

// Try HTTPS, fallback to HTTP
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  var options = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
  https.createServer(options, handler).listen(PORT, HOST, function () {
    console.log("✅ HTTPS server running on https://" + HOST + ":" + PORT);
    console.log("   SPA fallback: /products/detail/* → /products/detail/index.html");
  });
} else {
  http.createServer(handler).listen(PORT, HOST, function () {
    console.log("✅ HTTP server running on http://" + HOST + ":" + PORT);
  });
}
