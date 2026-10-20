// 乗り換えページを端末に保存し、通信が無くても開けるようにする
var CACHE = "bot-open-v1";
var FILES = ["./", "./index.html", "./sw.js"];

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

// 保存済みのページをすぐ返し、裏で新しい版を取りに行く（クエリは無視して同じページを返す）
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) c.put(new Request(new URL(e.request.url).pathname), res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
