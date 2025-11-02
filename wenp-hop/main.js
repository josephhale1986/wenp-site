const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;
const LANE_HEIGHT = 64;

let score = 0;
let currentLevel = 1;
let coinsNeededThisLevel = 3;
let coinsCollectedThisLevel = 0;

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
  this.load.image("frog", "assets/frog.png");
  this.load.image("bear", "assets/bear.png");
  this.load.image("coin", "assets/pcoin.png");
}

function create() {
  const scene = this;

  // background stripes
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
  this.coinsText = this.add.text(300, 12, "Coins: 0/3", { fontSize: "18px", fill: "#fff" });

  // 🐸 player (smaller + slightly higher)
  this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - 80, "frog");
  this.player.setCollideWorldBounds(true);
  this.player.setScale(0.25);            // 25% of original
  this.player.setDepth(2);

  // controls
  this.cursors = this.input.keyboard.createCursorKeys();

  // 🐻 bears group
  this.bears = this.physics.add.group();

  // spawn bears on timer
  this.bearTimer = this.time.addEvent({
    delay: getBearSpawnDelay(),
    loop: true,
    callback: () => spawnBear(scene)
  });

  // 🪙 coin / goal (smaller + lower)
  this.goal = this.physics.add.sprite(GAME_WIDTH / 2, 90, "coin");
  this.goal.setScale(0.25);
  this.goal.setImmovable(true);
  this.goal.setDepth(1);

  // collisions
  this.physics.add.overlap(this.player, this.bears, () => {
    resetPlayer(scene);
  });

  this.physics.add.overlap(this.player, this.goal, () => {
    handleCoinCollected(scene);
  });
}

function update() {
  if (!this.cursors) return;

  // movement is in "hops"
  const hop = LANE_HEIGHT / 2;

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

/* ----------------- helpers ----------------- */

function spawnBear(scene) {
  // avoid top (where coin is) and bottom (where frog spawns)
  const laneMin = 3;  // skip lanes 0,1,2 (top area)
  const laneMax = 8;
  const laneY = Phaser.Math.Between(laneMin, laneMax) * (LANE_HEIGHT / 1.0);

  const bear = scene.bears.create(-140, laneY, "bear");
  bear.setScale(0.25);
  bear.setDepth(1);

  const baseSpeed = 140;
  const speed = baseSpeed + (currentLevel - 1) * 25;
  bear.setVelocityX(speed);
  bear.setImmovable(true);
}

function resetPlayer(scene) {
  scene.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 80);
}

function handleCoinCollected(scene) {
  score += 10;
  coinsCollectedThisLevel += 1;

  scene.scoreText.setText("Score: " + score);
  scene.coinsText.setText("Coins: " + coinsCollectedThisLevel + "/" + coinsNeededThisLevel);

  resetPlayer(scene);

  if (coinsCollectedThisLevel >= coinsNeededThisLevel) {
    levelUp(scene);
  }
}

function levelUp(scene) {
  currentLevel += 1;
  coinsCollectedThisLevel = 0;
  coinsNeededThisLevel = Math.min(6, 3 + currentLevel - 1);

  scene.levelText.setText("Level: " + currentLevel);
  scene.coinsText.setText("Coins: 0/" + coinsNeededThisLevel);

  // tighter spawns
  if (scene.bearTimer) scene.bearTimer.remove(false);
  scene.bearTimer = scene.time.addEvent({
    delay: getBearSpawnDelay(),
    loop: true,
    callback: () => spawnBear(scene)
  });

  // popup
  const msg = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "LEVEL UP!", {
    fontSize: "28px",
    fill: "#22c55e"
  }).setOrigin(0.5).setDepth(10).setStroke("#000", 4);

  scene.tweens.add({
    targets: msg,
    alpha: 0,
    duration: 1200,
    onComplete: () => msg.destroy()
  });

  // call backend later if needed:
  // const walletAddress = window.currentWallet || "PEP_DEMO_WALLET_ADDRESS";
  // sendWENPReward(walletAddress, 1);
}

function getBearSpawnDelay() {
  const base = 1200;
  const faster = (currentLevel - 1) * 90;
  return Math.max(450, base - faster);
}

// backend reward (kept for later)
async function sendWENPReward(wallet, amount) {
  try {
    const res = await fetch("/api/wenp/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, level: amount })
    });
    const data = await res.json();
    console.log("Reward response:", data);
  } catch (err) {
    console.error("Reward error:", err);
  }
}
