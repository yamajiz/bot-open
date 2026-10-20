// 乗り換えページを端末に保存し、通信が無くても開けるようにする
// 通信があれば新しい版を使う。1.5秒で返ってこない（電波が悪い）・通信が無いときは保存済みの版を使う
var CACHE = "bot-open-v2";
var FILES = ["./", "./index.html", "./sw.js"];
var WAIT_MS = 1500;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    var key = new Request(new URL(e.request.url).pathname);
    var net = fetch(e.request).then(function (res) {
      if (res && res.ok) c.put(key, res.clone());
      return res;
    });
    var cached = c.match(e.request, { ignoreSearch: true });
    var late = new Promise(function (resolve) {
      setTimeout(function () { cached.then(function (hit) { resolve(hit || net); }); }, WAIT_MS);
    });
    var fallback = net.catch(function () { return cached.then(function (hit) { return hit || Response.error(); }); });
    return Promise.race([fallback, late]);
  }));
});
