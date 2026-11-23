/* ==================================================
   API CONFIGURATION START
   The website is plain static files, so the calculation API runs on its own
   host. Put that host's URL here, once, and every calculator page uses it.

   Examples:
     window.MW_API_BASE = "";                        // same origin
     window.MW_API_BASE = "https://api.example.com"; // separately deployed API

   This value is optional. Every weight is deterministic and the site ships
   the same verified formulas (assets/js/calc-engine.js), so a missing, slow
   or unreachable API never blocks a calculation: the API is used when it
   answers, the local engine answers otherwise. Set this only if you want the
   API to be the first answer source for your own analytics/logging.

   No API key or secret belongs in this file: it is downloaded by the browser.
================================================== */
"use strict";

window.MW_API_BASE = "";

/* ==================================================
   API CONFIGURATION END
   This file ends here.
================================================== */
