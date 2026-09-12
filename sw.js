// Scramjet service worker.
// Loads the controller, which intercepts and routes proxied requests.
// This file MUST be served from your site root so its scope covers the whole app.
importScripts("/controller/controller.sw.js");

addEventListener("fetch", (e) => {
  if ($scramjetController.shouldRoute(e)) {
    e.respondWith($scramjetController.route(e));
  }
});
