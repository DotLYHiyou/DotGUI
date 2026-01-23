export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).send("Method not allowed");
  }

  let target = req.query.url;

  // Support /?https://example.com shorthand
  if (!target) {
    const keys = Object.keys(req.query || {});
    if (keys.length === 1 && keys[0].startsWith("http")) {
      target = keys[0];
    }
  }

  if (!target) {
    return res.status(400).send("Missing ?url= parameter");
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent":
          req.headers["user-agent"] ||
          "Mozilla/5.0 (Vercel-CORS-Proxy)",
        Accept: req.headers["accept"] || "*/*",
        "Accept-Encoding": "identity" // 🚀 force plain response
      }
    });

    res.status(upstream.status);

    // Mirror headers (but drop encoding-related ones)
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (["content-encoding", "content-length"].includes(lower)) return;
      res.setHeader(key, value);
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Length", buf.length); // ✅ fix size
    res.end(buf);
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
}
