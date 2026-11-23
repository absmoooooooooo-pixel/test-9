/*
 * Request handler: the calculation API under /api.
 *
 * The website itself is static files (index.html at the repository root and
 * the pages under frontend/), hosted by a static host such as GitHub Pages.
 * This process serves the API only; it never serves site files.
 */
"use strict";

const { securityHeaders, sendJson, sendText } = require("./middleware/http");
const routes = require("./routes");

async function handler(req, res) {
    securityHeaders(res);

    let url;

    try {
        url = new URL(req.url, "http://localhost");
    } catch (error) {
        sendText(res, 400, "Bad request");
        return;
    }

    const pathname = url.pathname;

    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "POST" && req.method !== "OPTIONS") {
        res.setHeader("Allow", "GET, HEAD, POST, OPTIONS");
        sendText(res, 405, "Method not allowed");
        return;
    }

    if (routes.isApi(pathname)) {
        await routes.handle(req, res, pathname, url.search);
        return;
    }

    /* Nothing outside /api is served: page files belong to the static host. */
    sendJson(res, 404, {
        ok: false,
        error: { message: "Not found. This host serves the API only: use /api/…" }
    });
}

function attach(server) {
    server.on("request", (req, res) => {
        Promise.resolve(handler(req, res)).catch((error) => {
            const status = error && error.status ? error.status : 500;

            if (!res.headersSent) {
                sendJson(res, status, {
                    ok: false,
                    error: {
                        message: status === 500
                            ? "The calculation service hit an unexpected error."
                            : error.message
                    }
                });
            } else {
                res.end();
            }

            if (status >= 500) {
                console.error("[api]", error);
            }
        });
    });

    return server;
}

module.exports = { handler, attach };
