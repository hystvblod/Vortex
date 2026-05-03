(function () {
  "use strict";

  const PRODUCTS = {
    no_ads: { id: "vortex_no_ads" },
    starter_pack: { id: "vortex_starter_pack", coins: 1200, revives: 3 },
    coin_pack_small: { id: "vortex_coins_1200", coins: 1200 },
    revive_pack: { id: "vortex_revives_10", revives: 10 }
  };

  async function init() {
    console.log("[purchase] Ready. Browser test mode = no real purchases.");
    return false;
  }

  async function buy(key) {
    console.log("[purchase] Browser placeholder:", key);
    window.dispatchEvent(new CustomEvent("vortex_purchase_unavailable", { detail: { key: key } }));
    return false;
  }

  function creditForTest(key) {
    const p = PRODUCTS[key];
    if (!p) return false;

    const w = VRStore.wallet();

    if (p.coins) w.coins += p.coins;
    if (p.revives) w.revives += p.revives;
    if (key === "no_ads") w.noAds = true;

    VRStore.saveWallet(w);
    return true;
  }

  window.VRPurchase = {
    init: init,
    buy: buy,
    creditForTest: creditForTest,
    products: PRODUCTS
  };
})();
