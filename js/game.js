(function () {
  "use strict";

  class VortexGame {
    constructor(canvas, callbacks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      this.callbacks = callbacks || {};

      this.dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
      this.running = false;
      this.paused = false;
      this.rafId = null;
      this.loopBound = this.loop.bind(this);
      this.lastTime = 0;

      this.level = window.VRLevels[0];
      this.score = 0;
      this.coins = 0;
      this.speed = 1;
      this.distance = 0;

      this.ship = { x: 0, y: 0, r: 18, tilt: 0, shield: 0 };
      this.target = { x: 0, y: 0 };
      this.pointerDown = false;

      this.rings = [];
      this.obstacles = [];
      this.pickups = [];
      this.stars = [];

      this.spawnTimer = 0;
      this.coinTimer = 0;

      window.addEventListener("resize", this.resize.bind(this));
      this.bindInput();
      this.resize();
      this.reset();
      this.draw();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, Math.floor(rect.width));
      this.h = Math.max(1, Math.floor(rect.height));

      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.cx = this.w / 2;
      this.cy = this.h / 2;
      this.ship.x = this.cx;
      this.ship.y = this.h * 0.72;
      this.target.x = this.ship.x;
      this.target.y = this.ship.y;
    }

    bindInput() {
      const start = (event) => {
        if (!this.running || this.paused) return;
        this.pointerDown = true;
        this.setTarget(event);
      };

      const move = (event) => {
        if (!this.running || this.paused || !this.pointerDown) return;
        this.setTarget(event);
        event.preventDefault();
      };

      const end = () => {
        this.pointerDown = false;
      };

      this.canvas.addEventListener("pointerdown", start);
      this.canvas.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
    }

    setTarget(event) {
      this.target.x = event.clientX;
      this.target.y = event.clientY;
    }

    setLevel(id) {
      this.level = VRLevelTools.get(id);
      this.reset();
      this.draw();
    }

    cancelLoop() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    reset() {
      this.score = 0;
      this.coins = 0;
      this.speed = this.level.gameplay.startSpeed;
      this.distance = 0;
      this.spawnTimer = 0;
      this.coinTimer = 0.8;
      this.obstacles = [];
      this.pickups = [];
      this.rings = [];
      this.stars = [];
      this.ship.shield = 0;

      for (let i = 0; i < 32; i++) {
        this.rings.push({ z: i / 32, twist: Math.random() * Math.PI * 2 });
      }

      for (let i = 0; i < 48; i++) {
        this.stars.push({
          a: Math.random() * Math.PI * 2,
          z: Math.random(),
          s: .4 + Math.random() * 1.4
        });
      }
    }

    start() {
      this.cancelLoop();
      this.reset();

      this.running = true;
      this.paused = false;
      this.lastTime = performance.now();

      this.rafId = requestAnimationFrame(this.loopBound);
    }

    pause() {
      if (!this.running || this.paused) return;
      this.paused = true;
      this.cancelLoop();
    }

    resume() {
      if (!this.running || !this.paused) return;

      this.paused = false;
      this.lastTime = performance.now();
      this.cancelLoop();
      this.rafId = requestAnimationFrame(this.loopBound);
    }

    stop() {
      this.running = false;
      this.paused = false;
      this.cancelLoop();
      this.draw();
    }

    revive() {
      if (this.running) return;

      this.cancelLoop();
      this.obstacles = [];
      this.ship.shield = 2.5;
      this.running = true;
      this.paused = false;
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.loopBound);
    }

    loop(now) {
      this.rafId = null;

      if (!this.running || this.paused) return;

      const dt = Math.min(0.033, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.update(dt);
      this.draw();

      if (this.running && !this.paused) {
        this.rafId = requestAnimationFrame(this.loopBound);
      }
    }

    update(dt) {
      const g = this.level.gameplay;

      this.distance += dt * 420 * this.speed;
      this.speed = Math.min(g.maxSpeed, g.startSpeed + this.distance / g.speedGain);
      this.score = Math.floor(this.distance / 10);

      if (this.ship.shield > 0) this.ship.shield -= dt;

      const minX = this.w * .12;
      const maxX = this.w * .88;
      const minY = this.h * .34;
      const maxY = this.h * .86;

      const tx = Math.max(minX, Math.min(maxX, this.target.x));
      const ty = Math.max(minY, Math.min(maxY, this.target.y));

      const oldX = this.ship.x;
      this.ship.x += (tx - this.ship.x) * Math.min(1, dt * 12);
      this.ship.y += (ty - this.ship.y) * Math.min(1, dt * 12);
      this.ship.tilt += ((this.ship.x - oldX) * .04 - this.ship.tilt) * Math.min(1, dt * 10);

      for (const ring of this.rings) {
        ring.z += dt * .34 * this.speed;
        ring.twist += dt * .35;
        if (ring.z > 1) {
          ring.z -= 1;
          ring.twist = Math.random() * Math.PI * 2;
        }
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle();
        this.spawnTimer = Math.max(g.spawnMin, g.spawnBase - this.speed * .075);
      }

      this.coinTimer -= dt;
      if (this.coinTimer <= 0) {
        this.spawnCoin();
        this.coinTimer = Math.max(.42, 1.05 - this.speed * .08);
      }

      for (const o of this.obstacles) {
        o.z += dt * .72 * this.speed;
        o.rot += dt * o.spin;
      }

      for (const c of this.pickups) {
        c.z += dt * .68 * this.speed;
        c.rot += dt * 5;
      }

      this.obstacles = this.obstacles.filter(o => o.z < 1.18);
      this.pickups = this.pickups.filter(c => c.z < 1.18 && !c.taken);

      for (const c of this.pickups) {
        if (c.z > .78 && c.z < 1.06) {
          const p = this.project(c.x, c.y, c.z);
          const d = Math.hypot(p.x - this.ship.x, p.y - this.ship.y);
          if (d < 18 * p.scale + this.ship.r) {
            c.taken = true;
            this.coins += 1;
          }
        }
      }

      for (const o of this.obstacles) {
        if (o.z > .78 && o.z < 1.05) {
          const p = this.project(o.x, o.y, o.z);
          const d = Math.hypot(p.x - this.ship.x, p.y - this.ship.y);
          if (d < o.size * p.scale * 1.05 + this.ship.r * 0.78) {
            if (this.ship.shield > 0) {
              o.z = 1.2;
              this.ship.shield = 0;
            } else {
              this.crash();
              return;
            }
          }
        }
      }

      if (this.callbacks.update) {
        this.callbacks.update({
          score: this.score,
          coins: this.coins,
          speed: this.speed
        });
      }
    }

    spawnObstacle() {
      const a = Math.random() * Math.PI * 2;
      const r = .18 + Math.random() * .72;
      const count = Math.random() > .78 ? 2 : 1;

      for (let i = 0; i < count; i++) {
        const aa = a + i * .72;
        this.obstacles.push({
          x: Math.cos(aa) * r,
          y: Math.sin(aa) * r,
          z: -.08 - i * .06,
          size: 18 + Math.random() * 18,
          rot: Math.random() * Math.PI,
          spin: -3 + Math.random() * 6
        });
      }
    }

    spawnCoin() {
      const a = Math.random() * Math.PI * 2;
      const r = .12 + Math.random() * .62;

      this.pickups.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        z: -.04,
        rot: 0,
        taken: false
      });
    }

    project(nx, ny, z) {
      const depth = Math.max(0.001, z);

      /*
        z proche de 0 = loin dans le tunnel
        z proche de 1 = très proche de l'écran
      */
      const curve = depth * depth;
      const screenPower = 0.08 + curve * 1.35;

      const baseRadius = Math.min(this.w, this.h) * 0.52;
      const radius = baseRadius * screenPower;

      /*
        Le tunnel bouge légèrement, mais reste lisible.
        Ça donne une vraie impression de vitesse sans rendre le jeu injouable.
      */
      const tunnelBendX = Math.sin(this.distance * 0.0022 + depth * 7) * this.w * 0.035 * depth;
      const tunnelBendY = Math.cos(this.distance * 0.0018 + depth * 5) * this.h * 0.025 * depth;

      const centerX = this.cx + tunnelBendX;
      const centerY = this.cy + tunnelBendY;

      return {
        x: centerX + nx * radius,
        y: centerY + ny * radius,
        scale: 0.18 + curve * 1.75,
        radius: radius,
        centerX: centerX,
        centerY: centerY
      };
    }

    crash() {
      this.running = false;
      this.cancelLoop();

      const result = VRStore.saveRun(this.level, this.score, this.coins);

      if (this.callbacks.gameOver) {
        this.callbacks.gameOver({
          score: this.score,
          coins: this.coins,
          stars: result.stars,
          level: this.level
        });
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.drawBg(ctx);
      this.drawTunnel(ctx);
      this.drawCoins(ctx);
      this.drawObstacles(ctx);
      this.drawShip(ctx);
      this.drawVignette(ctx);
    }

    drawBg(ctx) {
      const t = this.level.theme;
      const bg = ctx.createRadialGradient(this.cx, this.h * .22, 20, this.cx, this.cy, Math.max(this.w, this.h));
      bg.addColorStop(0, t[1]);
      bg.addColorStop(.5, t[0]);
      bg.addColorStop(1, "#02030a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.w, this.h);

      ctx.save();
      ctx.globalAlpha = .75;

      for (const s of this.stars) {
        s.z += .0018 * this.speed;
        if (s.z > 1) s.z = 0;

        const rr = Math.min(this.w, this.h) * (.08 + s.z * .74);
        ctx.fillStyle = "rgba(210,245,255,.75)";
        ctx.beginPath();
        ctx.arc(this.cx + Math.cos(s.a) * rr, this.cy + Math.sin(s.a) * rr, s.s * (.5 + s.z), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    drawTunnel(ctx) {
      const t = this.level.theme;

      /*
        Fond du tube : on dessine des anneaux pleins en perspective,
        du fond du tunnel vers l'écran.
      */
      const ordered = [...this.rings].sort((a, b) => a.z - b.z);

      for (const ring of ordered) {
        const p = this.project(0, 0, ring.z);
        const nextZ = Math.min(1, ring.z + 0.045);
        const p2 = this.project(0, 0, nextZ);

        const alpha = 0.06 + ring.z * 0.32;
        const twist = ring.twist + this.distance * 0.0012;
        const sides = 32;

        ctx.save();

        /*
          Paroi du tunnel : segments colorés entre deux anneaux.
          C'est ça qui donne le vrai effet "je suis dedans".
        */
        for (let i = 0; i < sides; i++) {
          const a1 = (i / sides) * Math.PI * 2 + twist;
          const a2 = ((i + 1) / sides) * Math.PI * 2 + twist;

          const pulse1 = 1 + Math.sin(a1 * 4 + this.distance * 0.006) * 0.035;
          const pulse2 = 1 + Math.sin(a2 * 4 + this.distance * 0.006) * 0.035;

          const x1 = p.centerX + Math.cos(a1) * p.radius * pulse1;
          const y1 = p.centerY + Math.sin(a1) * p.radius * pulse1;

          const x2 = p.centerX + Math.cos(a2) * p.radius * pulse2;
          const y2 = p.centerY + Math.sin(a2) * p.radius * pulse2;

          const x3 = p2.centerX + Math.cos(a2) * p2.radius * pulse2;
          const y3 = p2.centerY + Math.sin(a2) * p2.radius * pulse2;

          const x4 = p2.centerX + Math.cos(a1) * p2.radius * pulse1;
          const y4 = p2.centerY + Math.sin(a1) * p2.radius * pulse1;

          const isBright = i % 2 === 0;

          ctx.fillStyle = isBright
            ? `${t[2]}${alpha})`
            : `${t[3]}${alpha * 0.72})`;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineTo(x3, y3);
          ctx.lineTo(x4, y4);
          ctx.closePath();
          ctx.fill();
        }

        /*
          Anneau lumineux.
        */
        ctx.strokeStyle = `${t[2]}${0.12 + ring.z * 0.45})`;
        ctx.lineWidth = 1 + ring.z * 5;
        ctx.beginPath();

        for (let i = 0; i <= sides; i++) {
          const a = (i / sides) * Math.PI * 2 + twist;
          const pulse = 1 + Math.sin(a * 4 + this.distance * 0.006) * 0.035;
          const x = p.centerX + Math.cos(a) * p.radius * pulse;
          const y = p.centerY + Math.sin(a) * p.radius * pulse;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();

        ctx.restore();
      }

      /*
        Lignes de profondeur depuis le centre vers l'écran.
        Elles renforcent l'impression de tunnel.
      */
      const far = this.project(0, 0, 0.08);
      const near = this.project(0, 0, 1);

      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;

      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + this.distance * 0.0015;

        const x1 = far.centerX + Math.cos(a) * far.radius * 0.35;
        const y1 = far.centerY + Math.sin(a) * far.radius * 0.35;

        const x2 = near.centerX + Math.cos(a) * near.radius * 1.25;
        const y2 = near.centerY + Math.sin(a) * near.radius * 1.25;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.45, `${t[2]}0.22)`);
        grad.addColorStop(1, "rgba(255,255,255,0)");

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();

      /*
        Centre très lumineux : donne le point de fuite.
      */
      const core = ctx.createRadialGradient(
        far.centerX,
        far.centerY,
        2,
        far.centerX,
        far.centerY,
        Math.min(this.w, this.h) * 0.22
      );

      core.addColorStop(0, "rgba(255,255,255,0.95)");
      core.addColorStop(0.16, "rgba(105,243,255,0.42)");
      core.addColorStop(0.55, "rgba(166,108,255,0.12)");
      core.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = core;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    drawCoins(ctx) {
      for (const c of this.pickups) {
        const p = this.project(c.x, c.y, c.z);
        const size = 9 * p.scale;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(c.rot);
        ctx.globalAlpha = Math.min(1, .2 + c.z * 1.2);

        const g = ctx.createRadialGradient(-size * .3, -size * .3, 2, 0, 0, size * 1.2);
        g.addColorStop(0, "#fff9c7");
        g.addColorStop(.45, "#ffd86b");
        g.addColorStop(1, "#69f3ff");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * .82, size, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    drawObstacles(ctx) {
      const ordered = [...this.obstacles].sort((a, b) => a.z - b.z);

      for (const o of ordered) {
        const p = this.project(o.x, o.y, o.z);

        /*
          Taille volontairement plus grosse :
          sur mobile, l'objet doit être lisible immédiatement.
        */
        const size = o.size * p.scale * 1.18;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(o.rot);
        ctx.globalAlpha = Math.min(1, 0.16 + o.z * 1.25);

        /*
          Ombre lumineuse derrière l'obstacle.
        */
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, size * 2.2);
        glow.addColorStop(0, "rgba(255,93,134,0.42)");
        glow.addColorStop(0.45, "rgba(166,108,255,0.18)");
        glow.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 2.2, 0, Math.PI * 2);
        ctx.fill();

        /*
          Cristal dangereux, bien pointu, bien visible.
        */
        const g = ctx.createRadialGradient(-size * 0.35, -size * 0.35, 2, 0, 0, size * 1.35);
        g.addColorStop(0, "#fff0b5");
        g.addColorStop(0.28, "#ff7aa2");
        g.addColorStop(0.58, "#ff2d73");
        g.addColorStop(1, "#4c1234");

        ctx.fillStyle = g;
        ctx.strokeStyle = "rgba(255,255,255,0.34)";
        ctx.lineWidth = Math.max(1.5, size * 0.07);

        ctx.beginPath();
        ctx.moveTo(0, -size * 1.45);
        ctx.lineTo(size * 0.72, -size * 0.36);
        ctx.lineTo(size * 1.18, size * 0.24);
        ctx.lineTo(size * 0.28, size * 1.28);
        ctx.lineTo(-size * 0.36, size * 1.05);
        ctx.lineTo(-size * 1.12, size * 0.34);
        ctx.lineTo(-size * 0.62, -size * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        /*
          Reflet interne pour effet plus premium.
        */
        ctx.globalAlpha *= 0.72;
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.beginPath();
        ctx.moveTo(-size * 0.18, -size * 1.05);
        ctx.lineTo(size * 0.22, -size * 0.28);
        ctx.lineTo(-size * 0.08, size * 0.42);
        ctx.lineTo(-size * 0.38, -size * 0.18);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    drawShip(ctx) {
      const x = this.ship.x;
      const y = this.ship.y;
      const r = this.ship.r;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.ship.tilt);

      const flame = 16 + Math.sin(performance.now() * .018) * 4;
      const fg = ctx.createLinearGradient(0, r, 0, r + flame);
      fg.addColorStop(0, "rgba(255,255,255,.92)");
      fg.addColorStop(.35, "rgba(105,243,255,.7)");
      fg.addColorStop(1, "rgba(166,108,255,0)");

      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-8, r * .55);
      ctx.quadraticCurveTo(0, r + flame, 8, r * .55);
      ctx.closePath();
      ctx.fill();

      const bg = ctx.createLinearGradient(0, -r * 1.4, 0, r * 1.2);
      bg.addColorStop(0, "#f8fbff");
      bg.addColorStop(.4, "#69f3ff");
      bg.addColorStop(1, "#645cff");

      ctx.fillStyle = bg;
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, -r * 1.45);
      ctx.lineTo(r * .92, r * .86);
      ctx.lineTo(r * .22, r * .52);
      ctx.lineTo(0, r * 1.25);
      ctx.lineTo(-r * .22, r * .52);
      ctx.lineTo(-r * .92, r * .86);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (this.ship.shield > 0) {
        ctx.strokeStyle = "rgba(123,255,178,.75)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawVignette(ctx) {
      const g = ctx.createRadialGradient(this.cx, this.cy, Math.min(this.w, this.h) * .2, this.cx, this.cy, Math.max(this.w, this.h) * .72);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,.58)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  window.VortexGame = VortexGame;
})();
