(function () {
  "use strict";

  const DEFAULT_LANG = "fr";
  const KEY = "vortex_lang";
  let lang = localStorage.getItem(KEY) || DEFAULT_LANG;
  let dict = {};

  async function load(nextLang) {
    lang = nextLang || lang || DEFAULT_LANG;

    try {
      const res = await fetch("i18n/" + lang + ".json", { cache: "no-store" });
      dict = await res.json();
      localStorage.setItem(KEY, lang);
      document.documentElement.lang = lang;
      apply();
    } catch (e) {
      console.warn("[i18n] load failed", e);
    }
  }

  function t(key) {
    return dict[key] || key;
  }

  function apply() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });
  }

  window.VRI18N = {
    load: load,
    t: t,
    apply: apply,
    getLang: function () {
      return lang;
    }
  };
})();
