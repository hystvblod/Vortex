(function () {
  "use strict";

  window.VRLevels = [
    {
      id: "level_01",
      titleKey: "level_01_title",
      descKey: "level_01_desc",
      requiredStars: 0,
      theme: ["#07102a", "#152460", "rgba(105,243,255,", "rgba(166,108,255,"],
      gameplay: {
        startSpeed: 1.0,
        maxSpeed: 4.2,
        speedGain: 5200,
        spawnBase: 0.82,
        spawnMin: 0.34,
        target1: 350,
        target2: 700,
        target3: 1100
      }
    },
    {
      id: "level_02",
      titleKey: "level_02_title",
      descKey: "level_02_desc",
      requiredStars: 2,
      theme: ["#090b14", "#1d2140", "rgba(155,190,255,", "rgba(255,160,95,"],
      gameplay: {
        startSpeed: 1.12,
        maxSpeed: 4.8,
        speedGain: 4700,
        spawnBase: 0.76,
        spawnMin: 0.3,
        target1: 500,
        target2: 950,
        target3: 1450
      }
    },
    {
      id: "level_03",
      titleKey: "level_03_title",
      descKey: "level_03_desc",
      requiredStars: 5,
      theme: ["#190515", "#451334", "rgba(255,95,190,", "rgba(255,190,90,"],
      gameplay: {
        startSpeed: 1.22,
        maxSpeed: 5.3,
        speedGain: 4200,
        spawnBase: 0.72,
        spawnMin: 0.27,
        target1: 650,
        target2: 1150,
        target3: 1800
      }
    },
    {
      id: "level_04",
      titleKey: "level_04_title",
      descKey: "level_04_desc",
      requiredStars: 8,
      theme: ["#03040a", "#160d35", "rgba(128,96,255,", "rgba(80,220,255,"],
      gameplay: {
        startSpeed: 1.32,
        maxSpeed: 5.8,
        speedGain: 3900,
        spawnBase: 0.68,
        spawnMin: 0.25,
        target1: 800,
        target2: 1400,
        target3: 2200
      }
    },
    {
      id: "level_05",
      titleKey: "level_05_title",
      descKey: "level_05_desc",
      requiredStars: 12,
      theme: ["#061525", "#2b0f55", "rgba(90,230,255,", "rgba(255,90,210,"],
      gameplay: {
        startSpeed: 1.45,
        maxSpeed: 6.4,
        speedGain: 3500,
        spawnBase: 0.62,
        spawnMin: 0.22,
        target1: 1000,
        target2: 1700,
        target3: 2600
      }
    }
  ];

  window.VRLevelTools = {
    get: function (id) {
      return window.VRLevels.find(function (level) {
        return level.id === id;
      }) || window.VRLevels[0];
    },
    unlocked: function (level) {
      return VRStore.totalStars() >= (level.requiredStars || 0);
    }
  };
})();
