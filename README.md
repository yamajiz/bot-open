# bot-open

A tiny redirect page. It turns an https link into a `scriptable://` link so that a chat app that only opens https links can launch a local Scriptable script.

- Contains no content. The documents themselves stay on the owner's device.
- A service worker caches this page so it also works offline after the first visit.
