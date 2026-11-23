/* ==================================================
   LANGUAGE SWITCHER BEHAVIOUR
   Every entry switches the current page in place through
   the shared runtime. No language link points at a
   different page, and no stored choice ever redirects a
   visitor away from the English page they opened.
================================================== */
(function () {
    "use strict";

    var switcher = document.querySelector(".lang-switch");
    if (!switcher) {
        return;
    }

    var links = Array.prototype.slice.call(switcher.querySelectorAll(".lang-switch__menu a"));
    var busy = false;

    function currentLanguage() {
        if (window.MW_I18N && window.MW_I18N.language) {
            return window.MW_I18N.language;
        }
        return switcher.getAttribute("data-lang") || "en";
    }

    function close() {
        switcher.removeAttribute("open");
    }

    links.forEach(function (link) {
        link.addEventListener("click", function (event) {
            var code = link.getAttribute("hreflang");
            event.preventDefault();

            if (!code) {
                return;
            }

            if (!window.MW_I18N || typeof window.MW_I18N.switchTo !== "function") {
                close();
                return;
            }

            if (busy) {
                return;
            }

            if (code === currentLanguage()) {
                close();
                return;
            }

            busy = true;
            window.MW_I18N.switchTo(code)
                .catch(function () {
                    /* The page and calculator stay exactly as they were. */
                })
                .finally(function () {
                    busy = false;
                    close();
                });
        });
    });

    window.addEventListener("mw:languagechange", close);

    document.addEventListener("click", function (event) {
        if (!switcher.open) {
            return;
        }
        if (!switcher.contains(event.target)) {
            close();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            close();
        }
    });
})();
