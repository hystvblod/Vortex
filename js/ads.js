(function () {
  "use strict";

  let gameOvers = 0;
  let lastInterstitial = 0;

  async function init() {
    console.log("[ads] Ready. Browser test mode = no real ads.");
    return false;
  }

  async function showInterstitialIfAllowed() {
    const w = VRStore.wallet();
    if (w.noAds) return false;

    gameOvers += 1;

    const now = Date.now();
    if (gameOvers % 3 !== 0) return false;
    if (now - lastInterstitial < 75000) return false;

    lastInterstitial = now;
    console.log("[ads] Interstitial placeholder.");
    return false;
  }

  async function showRewarded(reason) {
    console.log("[ads] Rewarded placeholder:", reason);
    return {
      rewarded: false,
      reason: "browser_test"
    };
  }

  window.VRAds = {
    init: init,
    showInterstitialIfAllowed: showInterstitialIfAllowed,
    showRewarded: showRewarded
  };
})();
