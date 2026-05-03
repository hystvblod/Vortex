(function () {
  "use strict";

  const WALLET_KEY = "vortex_wallet";
  const PROGRESS_KEY = "vortex_progress";
  const SETTINGS_KEY = "vortex_settings";

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function wallet() {
    return read(WALLET_KEY, {
      coins: 0,
      revives: 0,
      noAds: false
    });
  }

  function saveWallet(w) {
    write(WALLET_KEY, w);
    window.dispatchEvent(new CustomEvent("vortex_wallet_update", { detail: w }));
    return w;
  }

  function addCoins(n) {
    const w = wallet();
    w.coins = Math.max(0, (w.coins || 0) + n);
    return saveWallet(w);
  }

  function addRevives(n) {
    const w = wallet();
    w.revives = Math.max(0, (w.revives || 0) + n);
    return saveWallet(w);
  }

  function progress() {
    return read(PROGRESS_KEY, {});
  }

  function saveProgress(p) {
    return write(PROGRESS_KEY, p);
  }

  function starsFor(level, score) {
    const g = level.gameplay;
    if (score >= g.target3) return 3;
    if (score >= g.target2) return 2;
    if (score >= g.target1) return 1;
    return 0;
  }

  function totalStars() {
    const p = progress();
    return Object.values(p).reduce(function (sum, item) {
      return sum + (item.stars || 0);
    }, 0);
  }

  function saveRun(level, score, coins) {
    const p = progress();
    const stars = starsFor(level, score);
    const old = p[level.id] || { best: 0, stars: 0 };

    p[level.id] = {
      best: Math.max(old.best || 0, score),
      stars: Math.max(old.stars || 0, stars)
    };

    saveProgress(p);
    addCoins(coins);

    return {
      stars: stars,
      saved: p[level.id]
    };
  }

  function settings() {
    return read(SETTINGS_KEY, {
      sound: true
    });
  }

  function saveSettings(s) {
    return write(SETTINGS_KEY, Object.assign(settings(), s));
  }

  window.VRStore = {
    wallet: wallet,
    saveWallet: saveWallet,
    addCoins: addCoins,
    addRevives: addRevives,
    progress: progress,
    saveProgress: saveProgress,
    starsFor: starsFor,
    totalStars: totalStars,
    saveRun: saveRun,
    settings: settings,
    saveSettings: saveSettings
  };
})();
