(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const homeScreen = $("#homeScreen");
  const levelsScreen = $("#levelsScreen");
  const gameOverScreen = $("#gameOverScreen");
  const pauseScreen = $("#pauseScreen");
  const hud = $("#hud");
  const toast = $("#toast");

  let game;
  let currentLevelId = "level_01";
  let lastRun = null;
  let toastTimer = null;

  function showOnly(screen) {
    [homeScreen, levelsScreen].forEach(function (s) {
      s.classList.remove("active");
    });

    [gameOverScreen, pauseScreen].forEach(function (s) {
      s.classList.remove("active");
    });

    if (screen) screen.classList.add("active");
  }

  function showToast(key) {
    clearTimeout(toastTimer);
    toast.textContent = VRI18N.t(key);
    toast.hidden = false;

    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 1800);
  }

  function updateWallet() {
    const w = VRStore.wallet();
    $("#walletCoins").textContent = String(w.coins || 0);
    $("#walletRevives").textContent = String(w.revives || 0);
  }

  function renderLevels() {
    const p = VRStore.progress();
    const total = VRStore.totalStars();
    const box = $("#levelsList");

    box.innerHTML = "";

    VRLevels.forEach(function (level) {
      const unlocked = VRLevelTools.unlocked(level);
      const saved = p[level.id] || { best: 0, stars: 0 };

      const btn = document.createElement("button");
      btn.className = "levelCard" + (unlocked ? "" : " locked");

      const info = document.createElement("div");
      const title = document.createElement("h3");
      const desc = document.createElement("p");
      const meta = document.createElement("p");

      title.textContent = VRI18N.t(level.titleKey);
      desc.textContent = VRI18N.t(level.descKey);

      meta.textContent = unlocked
        ? VRI18N.t("best_score") + " " + (saved.best || 0)
        : VRI18N.t("stars_required") + " " + level.requiredStars + " / " + total;

      info.appendChild(title);
      info.appendChild(desc);
      info.appendChild(meta);

      const stars = document.createElement("div");
      stars.className = "levelStars";
      stars.textContent = "★".repeat(saved.stars || 0) + "☆".repeat(3 - (saved.stars || 0));

      btn.appendChild(info);
      btn.appendChild(stars);

      btn.addEventListener("click", function () {
        if (!unlocked) {
          showToast("toast_locked");
          return;
        }

        currentLevelId = level.id;
        startGame();
      });

      box.appendChild(btn);
    });
  }

  function startGame() {
    closePanels();
    showOnly(null);
    hud.hidden = false;
    game.setLevel(currentLevelId);
    game.start();
  }

  function goHome() {
    game.stop();
    hud.hidden = true;
    showOnly(homeScreen);
  }

  function onGameOver(result) {
    lastRun = result;

    $("#finalScore").textContent = String(result.score);
    $("#finalCoins").textContent = String(result.coins);
    $("#finalStars").textContent = String(result.stars);

    hud.hidden = true;
    gameOverScreen.classList.add("active");

    renderLevels();
    updateWallet();

    VRAds.showInterstitialIfAllowed();
  }

  function openPanel(name) {
    closePanels();
    $("#" + name + "Panel").classList.add("active");
    updateWallet();
  }

  function closePanels() {
    $$(".panel").forEach(function (panel) {
      panel.classList.remove("active");
    });
  }

  function bindUi() {
    $("#playBtn").addEventListener("click", function () {
      currentLevelId = "level_01";
      startGame();
    });

    $("#levelsBtn").addEventListener("click", function () {
      renderLevels();
      showOnly(levelsScreen);
    });

    $("#backHomeBtn").addEventListener("click", goHome);
    $("#pauseBtn").addEventListener("click", function () {
      game.pause();
      hud.hidden = true;
      pauseScreen.classList.add("active");
    });

    $("#resumeBtn").addEventListener("click", function () {
      pauseScreen.classList.remove("active");
      hud.hidden = false;
      game.resume();
    });

    $("#quitBtn").addEventListener("click", goHome);
    $("#retryBtn").addEventListener("click", startGame);
    $("#gameHomeBtn").addEventListener("click", goHome);

    $("#reviveBtn").addEventListener("click", async function () {
      const res = await VRAds.showRewarded("revive");

      if (!res.rewarded) {
        showToast("toast_ads_unavailable");
        return;
      }

      gameOverScreen.classList.remove("active");
      hud.hidden = false;
      game.revive();
    });

    $("#doubleCoinsBtn").addEventListener("click", async function () {
      if (!lastRun || lastRun.coins <= 0) return;

      const res = await VRAds.showRewarded("double_coins");

      if (!res.rewarded) {
        showToast("toast_ads_unavailable");
        return;
      }

      VRStore.addCoins(lastRun.coins);
      updateWallet();
      showToast("toast_reward_done");
    });

    $$("[data-panel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openPanel(btn.dataset.panel);
      });
    });

    $$(".closePanel").forEach(function (btn) {
      btn.addEventListener("click", closePanels);
    });

    $$(".panel").forEach(function (panel) {
      panel.addEventListener("click", function (event) {
        if (event.target === panel) closePanels();
      });
    });

    $$("[data-buy]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const ok = await VRPurchase.buy(btn.dataset.buy);
        if (!ok) showToast("toast_purchase_unavailable");
      });
    });

    $("#langSelect").value = VRI18N.getLang();
    $("#langSelect").addEventListener("change", async function (e) {
      await VRI18N.load(e.target.value);
      renderLevels();
    });

    $("#soundToggle").checked = !!VRStore.settings().sound;
    $("#soundToggle").addEventListener("change", function (e) {
      VRStore.saveSettings({ sound: e.target.checked });
    });

    window.addEventListener("vortex_wallet_update", updateWallet);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && game && game.running && !game.paused) {
        game.pause();
        hud.hidden = true;
        pauseScreen.classList.add("active");
      }
    });
  }

  async function init() {
    await VRI18N.load(localStorage.getItem("vortex_lang") || "fr");

    game = new VortexGame($("#gameCanvas"), {
      update: function (state) {
        $("#scoreValue").textContent = String(state.score);
        $("#coinsValue").textContent = String(state.coins);
        $("#speedValue").textContent = state.speed.toFixed(1) + "x";
      },
      gameOver: onGameOver
    });

    bindUi();
    renderLevels();
    updateWallet();
    VRAds.init();
    VRPurchase.init();
  }

  init();
})();
