if (navigator.userAgent.includes("Firefox")) {
  Object.defineProperty(globalThis, "crossOriginIsolated", {
    value: true,
    writable: false,
  });
}

// blocklist by s16 and swium - blocklist by s16 and swium - blocklist by s16 and swium - blocklist by s16 and swium - blocklist by s16 and swium

importScripts("https://dotgui-cdn.vercel.app/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

const CONFIG = {
  blocked: [
    "youtube.com/get_video_info?*adformat=*",
    "youtube.com/api/stats/ads/*",
    "youtube.com/pagead/*",
    ".facebook.com/ads/*",
    ".facebook.com/tr/*",
    ".fbcdn.net/ads/*",
    "graph.facebook.com/ads/*",
    "ads-api.twitter.com/*",
    "analytics.twitter.com/*",
    ".twitter.com/i/ads/*",
    ".ads.yahoo.com",
    ".advertising.com",
    ".adtechus.com",
    ".oath.com",
    ".verizonmedia.com",
    ".amazon-adsystem.com",
    "aax.amazon-adsystem.com/*",
    "c.amazon-adsystem.com/*",
    ".adnxs.com",
    ".adnxs-simple.com",
    "ab.adnxs.com/*",
    ".rubiconproject.com",
    ".magnite.com",
    ".pubmatic.com",
    "ads.pubmatic.com/*",
    ".criteo.com",
    "bidder.criteo.com/*",
    "static.criteo.net/*",
    ".openx.net",
    ".openx.com",
    ".indexexchange.com",
    ".casalemedia.com",
    ".adcolony.com",
    ".chartboost.com",
    ".unityads.unity3d.com",
    ".inmobiweb.com",
    ".tapjoy.com",
    ".applovin.com",
    ".vungle.com",
    ".ironsrc.com",
    ".fyber.com",
    ".smaato.net",
    ".supersoniads.com",
    ".startappservice.com",
    ".airpush.com",
    ".outbrain.com",
    ".taboola.com",
    ".revcontent.com",
    ".zedo.com",
    ".mgid.com",
    "*/ads/*",
    "*/adserver/*",
    "*/adclick/*",
    "*/banner_ads/*",
    "*/sponsored/*",
    "*/promotions/*",
    "*/tracking/ads/*",
    "*/promo/*",
    "*/affiliates/*",
    "*/partnerads/*",
  ]
};

/** @type {{ origin: string, html: string, css: string, js: string } | undefined} */
let playgroundData;

/**
 * @param {string} pattern
 * @returns {RegExp}
 */
function toRegex(pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{DOUBLE_STAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLE_STAR}}/g, ".*");
  return new RegExp(`^${escaped}$`);
}

/**
 * @param {string} hostname
 * @param {string} pathname
 * @returns {boolean}
 */
function isBlocked(hostname, pathname) {
  return CONFIG.blocked.some((pattern) => {
    if (pattern.startsWith("#")) {
      pattern = pattern.substring(1);
    }
    if (pattern.startsWith("*")) {
      pattern = pattern.substring(1);
    }

    if (pattern.includes("/")) {
      const [hostPattern, ...pathParts] = pattern.split("/");
      const pathPattern = pathParts.join("/");
      const hostRegex = toRegex(hostPattern);
      const pathRegex = toRegex(`/${pathPattern}`);
      return hostRegex.test(hostname) && pathRegex.test(pathname);
    }
    const hostRegex = toRegex(pattern);
    return hostRegex.test(hostname);
  });
}


/**
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function handleRequest(event) {
  await scramjet.loadConfig();

  if (scramjet.route(event)) {
    const response = await scramjet.fetch(event);
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      const originalText = await response.text();
      const encoder = new TextEncoder();
      const byteLength = encoder.encode(originalText).length;
      const newHeaders = new Headers(response.headers);
      newHeaders.set("content-length", byteLength.toString());

      return new Response(originalText, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  }

  return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (url.includes("supabase.co")) {
    return;
  }

  event.respondWith(handleRequest(event));
});

self.addEventListener("message", ({ data }) => {
  if (data.type === "playgroundData") {
    playgroundData = data;
  }
});

scramjet.addEventListener("request", (e) => {
  if (isBlocked(e.url.hostname, e.url.pathname)) {
    e.response = new Response("Site Blocked", { status: 403 });
    return;
  }

  if (playgroundData && e.url.href.startsWith(playgroundData.origin)) {
    const routes = {
      "/": { content: playgroundData.html, type: "text/html" },
      "/style.css": { content: playgroundData.css, type: "text/css" },
      "/script.js": {
        content: playgroundData.js,
        type: "application/javascript",
      },
    };

    const route = routes[e.url.pathname];

    if (route) {
      let content = route.content;

      const headers = { "content-type": route.type };
      e.response = new Response(content, { headers });
      e.response.rawHeaders = headers;
      e.response.rawResponse = {
        body: e.response.body,
        headers: headers,
        status: e.response.status,
        statusText: e.response.statusText,
      };
      e.response.finalURL = e.url.toString();
    } else {
      e.response = new Response("empty response", { headers: {} });
    }
  }
});