// 乗り換えページを端末に保存し、通信が無くても開けるようにする
// 通信があれば新しい版を使う。1.5秒で返ってこない（電波が悪い）・失敗・正しくない応答のときは保存済みの版を使う
var PREFIX = "bot-open-";
var CACHE = PREFIX + "v3";
var FILES = ["./", "./index.html", "./sw.js"];
var WAIT_MS = 1500;
var MARK = "bot-open-relay";  // index.html に入っている目印。認証ページ（Wi-Fi のログイン画面など）を保存しないため

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  // 同じ github.io の他のページの保存分は消さない（自分の接頭辞のものだけ）
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function good(res, path) {
  if (!res || !res.ok || res.redirected || res.type === "opaqueredirect") return Promise.resolve(false);
  if (/\.js$/.test(path)) return Promise.resolve(true);
  return res.clone().text().then(function (t) { return t.indexOf(MARK) >= 0; }).catch(function () { return false; });
}

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  var path = url.pathname;
  var key = new Request(path);
  var cacheP = caches.open(CACHE).catch(function () { return null; });
  var cached = cacheP.then(function (c) { return c ? c.match(e.request, { ignoreSearch: true }) : undefined; })
    .catch(function () { return undefined; });
  var net = fetch(e.request, { cache: "no-cache" }).then(function (res) {
    return good(res, path).then(function (ok) {
      if (!ok) throw new Error("bad response");
      e.waitUntil(cacheP.then(function (c) { return c && c.put(key, res.clone()); }).catch(function () {}));
      return res;
    });
  });
  var viaNet = net.catch(function () { return cached.then(function (hit) { return hit || Response.error(); }); });
  var late = new Promise(function (resolve) {
    setTimeout(function () { cached.then(function (hit) { if (hit) resolve(hit); }); }, WAIT_MS);
  });
  e.respondWith(Promise.race([viaNet, late]));
});
