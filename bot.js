const mineflayer = require("mineflayer");
const { pathfinder, Movements } = require("mineflayer-pathfinder");
//const mineflayerViewer = require("prismarine-viewer").mineflayer;
const v = require("vec3");
const readline = require("readline");
const chalk = require("chalk");
const log = console.log;
const { GoalBlock } = require("mineflayer-pathfinder").goals;
const { sleep } = require("mineflayer/lib/promise_utils");

const bot = mineflayer.createBot({
  host: "mc.mineturkmc.com",
  username: "GmodderTR",
  version: "1.16.4",
});

bot.loadPlugin(pathfinder);

function deg2rad(degrees) {
  var pi = Math.PI;
  return degrees * (pi / 180);
}

const positions = {
  cobbleStoneMining: v(7215, 72, 2399),
  cobbleStone: v(7216, 73, 2399),
  goodItemsChest: v(7212, 72, 2400), // bot will put good items (everything except cobblestones) and take pickaxes from this location
  cobbleStoneMarket: v(7199, 72, 2424), // I use this bot to fill a cobblestone selling market chests too so
  cobbleStoneDirection: { pitch: deg2rad(-90), yaw: deg2rad(0) },
};

/*
  //play.minertown.net
  positions.cobbleStoneMining = { x: -58798, y: 70, z: -1198 };
  positions.cobbleStone = { x: -58797, y: 71, z: -1198 };
  positions.goodItemsChest = { x: -58800, y: 72, z: -1199 };*/

const rl = readline.createInterface({
  input: process.stdin,
});

let shouldStop = false;

rl.on("line", (input) => {
  if (input.startsWith("-")) {
    input = input.substr(1);
    switch (input) {
      case "stop": {
        shouldStop = true;
        break;
      }
      case "items": {
        log(bot.inventory.items());
        break;
      }
      case "chests": {
        for (let block of Object.keys(bot._blockEntities)) {
          block = bot._blockEntities[block];
          if (block.id === "minecraft:chest") {
            log(block);
          }
        }

        break;
      }
      case "closechests": {
        log(
          bot
            .findBlocks({
              matching: ["chest", "trapped_chest"].map(
                (name) => mcData.blocksByName[name].id
              ),
              maxDistance: 4,
              count: 4,
            })
            .map((pos) => bot.blockAt(pos))
        );
        break;
      }
      case "entities": {
        log(bot.entities);
        break;
      }
      case "depositall": {
        let chestToOpen = bot.findBlock({
          matching: ["chest", "trapped_chest"].map(
            (name) => mcData.blocksByName[name].id
          ),
          maxDistance: 4,
        });

        if (!chestToOpen) {
          return;
        }

        let chest = bot.openChest(chestToOpen);

        const items = bot.inventory.items();

        chest.on("open", async () => {
          console.log("chest opened");

          await chest.deposit(14, null, 1);

          console.log("chest closed");
          chest.close();
        });
        break;
      }
      case "gotochest": {
        goToChest();
        break;
      }
    }
  } else {
    bot.chat(input);
  }
});

function goToPosition(positionName, position) {
  botTarget = positionName;
  bot.pathfinder.setMovements(defaultMove);
  bot.pathfinder.setGoal(new GoalBlock(position.x, position.y, position.z));
}

function goToCobble() {
  goToPosition("cobble", positions.cobbleStoneMining);
}

function goToChest() {
  goToPosition("chest", positions.goodItemsChest);
}

function goToCobblestoneMarket() {
  goToPosition("market", positions.cobbleStoneMarket);
}

async function depositGoodItems() {
  if (shouldStop) {
    log(chalk.red("STOPPING THE BOT"));
    return;
  }
  await sleep(1000);

  log(chalk.blue("trying to deposit good items"));
  let chestToOpen = bot.findBlock({
    matching: ["chest", "trapped_chest"].map(
      (name) => mcData.blocksByName[name].id
    ),
    maxDistance: 4,
  });

  if (!chestToOpen) {
    log(chalk.redBright("chest couldn't be found"));
    goToChest();
    return;
  }

  const items = bot.inventory.items();

  if (items.length === 0) {
    log(chalk.redBright("bot already has no items on him"));
    return;
  }

  let chest = bot.openChest(chestToOpen);

  return new Promise((resolve) => {
    chest.once("open", async () => {
      log(chalk.green("chest is opened for good items"));
      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (item.name === "cobblestone") {
          continue;
        }
        log(chalk.grey("depositing x" + item.count + " of " + item.name));
        await chest.deposit(item.type, null, item.count);
      }
      chest.close();
      log(chalk.green("chest is closed"));
      resolve();
    });
  });
}

async function depositCobblestoneToMarket() {
  if (shouldStop) {
    log(chalk.red("STOPPING THE BOT"));
    return;
  }
  await sleep(1000);

  log(chalk.blue("trying to deposit cobblestone items"));

  let items = bot.inventory.items();

  if (items.length === 0) {
    log(chalk.redBright("bot already has no items on him"));
    return;
  }

  let chests = bot.findBlocks({
    matching: ["chest", "trapped_chest"].map(
      (name) => mcData.blocksByName[name].id
    ),
    maxDistance: 4,
    count: 4,
  });

  chests = chests.map((position) => bot.blockAt(position));

  if (chests.length == 0) {
    log(chalk.redBright("market chests couldn't be found"));
    goToCobblestoneMarket();
    return;
  }

  for (const chestToOpen of chests) {
    if (!chestToOpen) {
      continue;
    }

    let chest = bot.openChest(chestToOpen);

    await new Promise((resolve, reject) => {
      chest.once("open", async () => {
        log(chalk.green("chest is opened for cobblestone items"));

        if (chest.window.emptySlotCount() === 0) {
          chest.close();
          log(
            chalk.red("one of the market chests is already full so closed it")
          );
          resolve();
        }

        for (let i = 0; i < items.length; i++) {
          let item = items[i];
          if (item.name === "cobblestone") {
            log(chalk.grey("depositing x" + item.count + " of " + item.name));
            await chest.deposit(item.type, null, item.count);
          }
        }
        chest.close();
        log(chalk.green("chest is closed"));
        resolve();
      });
    });

    await sleep(500);
  }
}

async function takePickaxe() {
  await sleep(1000);

  log(chalk.blue("trying to withdraw a pick axe"));
  let chestToOpen = bot.findBlock({
    matching: ["chest", "trapped_chest"].map(
      (name) => mcData.blocksByName[name].id
    ),
    maxDistance: 4,
  });

  if (!chestToOpen) {
    return;
  }

  let chest = bot.openChest(chestToOpen);

  return new Promise((resolve) => {
    chest.once("open", async () => {
      log(chalk.green("chest is opened for picking a pickaxe"));
      const items = chest.items();

      let isTherePickaxe = false;

      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (item.name.includes("_pickaxe")) {
          log(chalk.grey("picking a " + item.name));
          isTherePickaxe = true;
          await chest.withdraw(item.type, null, 1);
          break;
        }
      }
      chest.close();
      log(chalk.green("chest is closed"));
      if (!isTherePickaxe) {
        reject("no pickaxe");
        return;
      }
      resolve();
    });
  });
}

let target;

async function equipPickaxe() {
  return new Promise((resolve, reject) => {
    let hasPickaxe = false;
    let pickaxe = null;

    for (const item of bot.inventory.items()) {
      if (item.name.includes("_pickaxe")) {
        hasPickaxe = true;
        pickaxe = item;
      }
    }

    if (!hasPickaxe) {
      reject("no pickaxe found");
    }

    bot.equip(pickaxe, "hand", (error) => {
      if (error) reject("couldnt equip pickaxe");
      else resolve();
    });
  });
}

async function dig() {
  if (shouldStop) {
    log(chalk.red("STOPPING THE BOT"));
    return;
  }

  await sleep(250);

  log(chalk.blue("trying to dig"));

  if (bot.inventory.emptySlotCount() <= 2) {
    goToCobblestoneMarket();
    return;
  }

  if (bot.heldItem && bot.heldItem.name.includes("pickaxe")) {
    await bot.look(
      positions.cobbleStoneDirection.yaw,
      positions.cobbleStoneDirection.pitch
    );
    if (bot.targetDigBlock) {
      log(chalk.redBright("already digging!"));
    } else {
      target = bot.blockAtCursor(4);

      if (target && bot.canDigBlock(target)) {
        log(chalk.gray(`starting to dig ${target.name}`));
        bot.dig(target, () => {
          log(chalk.gray(`end digging ${target.name}`));
          dig();
        });
      } else {
        log(chalk.red("cannot dig, trying again"));
        await bot.look(
          positions.cobbleStoneDirection.yaw,
          positions.cobbleStoneDirection.pitch
        );
        dig();
      }
    }
  } else {
    await equipPickaxe()
      .then(async () => {
        log(chalk.greenBright("equiped a pickaxe"));
        dig();
      })
      .catch((reason) => {
        log(chalk.red(reason));
        goToChest();
      });
  }
}

let mcData;
let defaultMove;
let botTarget;

bot.once("spawn", () => {
  //  mineflayerViewer(bot, { port: 3007, firstPerson: false });
  mcData = require("minecraft-data")(bot.version);
  defaultMove = new Movements(bot, mcData);

  setTimeout(() => {
    bot.chat("/login yunus");
    setTimeout(() => {
      bot.chat("/skyblock");
    }, 2000);
  }, 2000);

  bot.on("goal_reached", async () => {
    if (shouldStop) {
      log(chalk.red("STOPPING THE BOT"));
      return;
    }

    log(chalk.green("I reached my " + botTarget + " target!"));

    switch (botTarget) {
      case "cobble": {
        if (bot.entity.position.distanceTo(positions.cobbleStoneMining) > 1) {
          goToCobble();
          return;
        }

        dig();
        break;
      }
      case "chest": {
        await depositGoodItems();
        await takePickaxe()
          .then(() => {
            goToCobble();
          })
          .catch((error) => {
            log(chalk.redBright(error));
          });

        break;
      }
      case "market": {
        await depositCobblestoneToMarket();
        goToChest();
        return;
      }
    }
  });

  bot.on("path_update", (r) => {
    const nodesPerTick = ((r.visitedNodes * 50) / r.time).toFixed(2);
    console.log(
      `I can get there in ${
        r.path.length
      } moves. Computation took ${r.time.toFixed(2)} ms (${
        r.visitedNodes
      } nodes, ${nodesPerTick} nodes/tick)`
    );
  });

  bot.on("blockUpdate", function (oldBlock, newBlock) {
    if (!bot.targetDigBlock && target === "cobble") {
      if (newBlock.name.includes("stone") || newBlock.name.includes("ore")) {
        if (newBlock.position.distanceTo(positions.cobbleStone) < 5) {
          if (bot.blockAtCursor() != bot.targetDigBlock) {
            bot.stopDigging();
            dig();
          }
        }
      }
    }
  });

  bot.on(
    "chat",
    /**
     * @param {string} username
     * @param {string} message
     */
    function (username, message) {
      log(chalk.red(username + ": " + chalk.white(message)));
      if (username === bot.username) return;

      if (message.toLowerCase().includes("başarıyla giriş yaptın")) {
        setTimeout(() => {
          if (
            bot.entity.position.distanceTo(positions.cobbleStoneMining) > 100
          ) {
            bot.chat("/is go");
          } else {
          }
        }, 2000);
      }
      if (message.toLowerCase().includes("adana ışınlandın")) {
        setTimeout(() => {
          goToCobblestoneMarket();
        }, 2000);
      }
    }
  );
});

bot.on("kicked", (reason, loggedIn) => console.log(reason, loggedIn));
bot.on("error", (err) => console.log(err));
