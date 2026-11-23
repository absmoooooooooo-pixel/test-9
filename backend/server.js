/*
 * Metal Weight Calculator — calculation API.
 *
 * This process serves the calculation API only. The website is static:
 * index.html at the repository root and the pages under frontend/, hosted by a
 * static host (GitHub Pages) that calls this API through the URL configured in
 * frontend/assets/js/api-config.js.
 *
 *   npm start          start the API
 *   npm run dev        restart on file change
 *   npm test           parity test (starts its own temporary server)
 *
 * Environment (see .env.example): PORT, HOST, PUBLIC_API_BASE,
 * ALLOWED_ORIGINS, API_KEY, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS.
 */
"use strict";

const http = require("http");
const { attach } = require("./app");
const { PORT, HOST, NODE_ENV } = require("./config");

function main() {
    const server = attach(http.createServer());

    server.listen(PORT, HOST, () => {
        const base = "http://" + (HOST === "0.0.0.0" ? "localhost" : HOST) + ":" + PORT;

        console.log("Metal Weight Calculator API running (" + NODE_ENV + ")");
        console.log("  api    " + base + "/api/health");
    });

    const shutdown = (signal) => {
        console.log("\n[stop] " + signal + " received, closing server");
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 3000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
