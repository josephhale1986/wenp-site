function levelUp(scene) {
  currentLevel += 1;
  coinsCollectedThisLevel = 0;
  coinsNeededThisLevel = Math.min(6, 3 + currentLevel - 1);

  // update HUD
  scene.levelText.setText("Level: " + currentLevel);
  scene.coinsText.setText("Coins: 0/" + coinsNeededThisLevel);

  // adjust bear difficulty
  if (scene.bearTimer) scene.bearTimer.remove(false);
  scene.bearTimer = scene.time.addEvent({
    delay: getBearSpawnDelay(),
    loop: true,
    callback: () => spawnBear(scene)
  });

  // flashy level-up text
  const msg = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "LEVEL UP!", {
    fontSize: "32px",
    fill: "#22c55e"
  }).setOrigin(0.5).setDepth(10).setAlpha(1)
    .setStroke("#000", 4)
    .setShadow(2, 2, "#000", 2, true, true);

  // fade out the message
  scene.tweens.add({
    targets: msg,
    alpha: 0,
    duration: 1200,
    onComplete: () => msg.destroy()
  });

  
