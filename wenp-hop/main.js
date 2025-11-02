const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;
const LANE_HEIGHT = 64;

// GLOBAL STATE
let score = 0;
let currentLevel = 1;

// we’ll do 1 coin per level now
let coinsNeededThisLevel = 1;
let coinsCollectedThisLevel = 0;

// sprite scales (tune here)
const PLAYER_SCALE = 0.16;
const BEAR_SCALE = 0.16;
const COIN_SCALE = 0.16;

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  backgroundColor: "#0f172a",
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  // use the transparent ones you uploaded
  this.load.image("frog", "assets/frog.png");
  this.load.image("bear", "assets/bear.png");
  this.load.image("coin", "assets/pcoin.png");
}

function create() {
  const scene = this;

  // background lanes
  for (let i = 0; i < GAME_HEIGHT / LANE_HEIGHT; i++) {
    const color = i % 2 === 0 ? 0x0f172a : 0x111827;
    const rect = this.add.rectangle(
      GAME_WIDTH / 2,
      i * LANE_HEIGHT + LANE_HEIGHT / 2,
      GAME_WIDTH,
      LANE_HEIGHT,
      color
    );
    rect.setDepth(-1);
  }

  // HUD
  this.scoreText = this.add.text(12, 12, "Score: 0", { fontSize: "18px", fill: "#fff" });
  this.levelText = this.add.text(180, 12, "Level: 1", { fontSize: "18px", fill: "#facc15" });
  this.coinsText = this.add.text(300, 12, "Coins: 0/1", { fontSize: "18px", fill: "#fff" });

  // 🐸 player
  this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - 80, "frog");
  this.player.setScale(PLAYER_SCALE);
  this.player.setCollideWorldBounds(true);
  this.player.setDepth(2);

  // shrink hitbox to match scaled sprite (and a bit tighter)
  this.player.body.setSize(
    this.player.displayWidth * 0.75,
    this.player.displayHeight * 0.75,
    true
  );

  // prevent repeated hits
  this.player.isHit = false;

  // controls
  this.cursors = this.input.keyboard.createCursorKeys();

  // 🐻 bears group
  this.bears = this.physics.add.group();

  this.bearTimer = this.time.addEvent({
    delay: getBearSpawnDelay(),
    loop: true,
    callback: () => spawnBear(scene)
  });

  // 🪙 coin / goal (a bit lower and smaller)
  his.goal = this.physics.add.sprite(GAME_WIDTH / 2, 95, "coin");
this.goal.setScale(COIN_SCALE);
this.goal.setImmovable(true);
this.goal.setDepth(1);
this.goal.body.setSize(
  this.goal.displayWidth * 1.05,
  this.goal.displayHeight * 1.05,
  true
  );

  // collisions
  this.physics.add.overlap(this.player, this.bears, () => {
    handlePlayerHit(scene);
  });

  this.physics.add.overlap(this.player, this.goal, () => {
    handleCoinCollected(scene);
  });
}

function update() {
  if (!this.cursors || this.player.isHit) return;

  const hop = LANE_HEIGHT / 2; // 32px

  if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
    this.player.y -= hop;
  } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
    this.player.y += hop;
  } else if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
    this.player.x -= hop;
  } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
    this.player.x += hop;
  }

  // cleanup bears
  this.bears.children.iterate((bear) => {
    if (bear && bear.x > GAME_WIDTH + 140) {
      bear.destroy();
    }
  });
}

/* ---------------- helpers ---------------- */

function spawnBear(scene) {
  const laneMin = 3;
  const laneMax = 9;
  const laneY = Phaser.Math.Between(laneMin, laneMax) * (LANE_HEIGHT / 1.0);

  const startOffset = Phaser.Math.Between(0, 140);

  const bear = scene.bears.create(-140 - startOffset, laneY, "bear");
  bear.setScale(BEAR_SCALE);
  bear.setDepth(1);
  bear.body.setSize(bear.displayWidth * 0.75, bear.displayHeight * 0.75, true);

  const baseSpeed = 140;
  const speed = baseSpeed + (currentLevel - 1) * 25;
  bear.setVelocityX(speed);
  bear.setImmovable(true);
}

function resetPlayer(scene) {
  scene.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 80);
}

function handlePlayerHit(scene) {
  if (scene.player.isHit) return;
  scene.player.isHit = true;

  // little flash
  scene.tweens.add({
    targets: scene.player,
    alpha: 0.25,
    yoyo: true,
    repeat: 3,
    duration: 100
  });

  scene.time.delayedCall(450, () => {
    resetPlayer(scene);
    scene.player.isHit = false;
    scene.player.setAlpha(1);
  });
}

function handleCoinCollected(scene) {
  // +10 pts per coin
  score += 10;
  coinsCollectedThisLevel += 1;

  scene.scoreText.setText("Score: " + score);
  scene.coinsText.setText("Coins: " + coinsCollectedThisLevel + "/" + coinsNeededThisLevel);

  resetPlayer(scene);

  // ✅ now we level up every single coin
  if (coinsCollectedThisLevel >= coinsNeededThisLevel) {
    levelUp(scene);
  }
}

function levelUp(scene) {
  currentLevel += 1;
  coinsCollectedThisLevel = 0;

  // keep it 1 coin per level
  coinsNeededThisLevel = 1;

  scene.levelText.setText("Level: " + currentLevel);
  scene.coinsText.setText("Coins: 0/1");

  // faster bears as we level
  if (scene.bearTimer) scene.bearTimer.remove(false);
  scene.bearTimer = scene.time.addEvent({
    delay: getBearSpawnDelay(),
    loop: true,
    callback: () => spawnBear(scene)
  });

  // popup
  const msg = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "LEVEL UP!", {
    fontSize: "26px",
    fill: "#22c55e"
  }).setOrigin(0.5).setDepth(10).setStroke("#000", 4);

  scene.tweens.add({
    targets: msg,
    alpha: 0,
    duration: 1100,
    onComplete: () => msg.destroy()
  });

  // later:
  // const wallet = window.currentWallet || "PEP_DEMO_WALLET_ADDRESS";
  // sendWENPReward(wallet, 1);
}

function getBearSpawnDelay() {
  const base = 1600;
  const faster = (currentLevel - 1) * 70;
  return Math.max(700, base - faster);
}

// kept for future API
async function sendWENPReward(wallet, amount) {
  try {
    await fetch("/api/wenp/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, level: amount })
    });
  } catch (err) {
    console.error(err);
  }
}




 
