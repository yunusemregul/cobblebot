const mineflayer = require("mineflayer");
const { pathfinder, Movements } = require("mineflayer-pathfinder");
//const mineflayerViewer = require("prismarine-viewer").mineflayer;
const v = require("vec3");
const readline = require("readline");
const chalk = require("chalk");
const log = console.log;

const rl = readline.createInterface({
    input: process.stdin,
});

rl.on("line", (input) => {
    if (input.startsWith("-")) {
        input = input.substr(1);
        switch (input) {
            case "items": {
                log(bot.inventory.items());
                break;
            }
            case "entities": {
                log(bot.entities);
                break;
            }
            case "depositall": {
                let chestToOpen = bot.findBlock({
                    matching: ["chest", "trapped_chest"].map((name) => mcData.blocksByName[name].id),
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

const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow } = require("mineflayer-pathfinder").goals;
const { sleep } = require("mineflayer/lib/promise_utils");
const { promisify } = require("util");
const { rejects } = require("assert");

const bot = mineflayer.createBot({
    host: "mc.mineturkmc.com", // optional
    username: "GmodderTR", // email and password are required only for
    version: "1.16.4", // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
});

bot.loadPlugin(pathfinder);

const miningPosVector = v(7215, 72, 2399);
const cobbleStoneVector = v(7216, 73, 2399);
const chestVector = v(7212, 72, 2400);
const cobbleStoneMarketVector = v(7199, 72, 2424);

/*
//play.minertown.net
let miningPosVector = { x: -58798, y: 70, z: -1198 };
let cobbleStoneVector = { x: -58797, y: 71, z: -1198 };
let chestVector = { x: -58800, y: 72, z: -1199 };*/

function goToCobble() {
    botTarget = "cobble";
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new GoalBlock(miningPosVector.x, miningPosVector.y, miningPosVector.z));
}

function goToChest() {
    botTarget = "chest";
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new GoalBlock(chestVector.x, chestVector.y, chestVector.z));
}

function goToCobblestoneMarket() {
    botTarget = "market";
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(new GoalBlock(cobbleStoneMarketVector.x, cobbleStoneMarketVector.y, cobbleStoneMarketVector.z));
}

async function depositGoodItems() {
    await sleep(1000);

    log(chalk.blue("trying to deposit good items"));
    let chestToOpen = bot.findBlock({
        matching: ["chest", "trapped_chest"].map((name) => mcData.blocksByName[name].id),
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
    await sleep(1000);

    log(chalk.blue("trying to deposit cobblestone items"));
    
    const items = bot.inventory.items();
    
    if (items.length === 0) {
        log(chalk.redBright("bot already has no items on him"));
        return;
    }

    let chests = bot.findBlocks({
        matching: ["chest", "trapped_chest"].map((name) => mcData.blocksByName[name].id),
        maxDistance: 4,
        count: 4,
    });

    if (chests.length == 0)
    {
        log(chalk.redBright("market chests couldn't be found"));
        goToCobblestoneMarket();
        return;
    }

    for (const chestToOpen of chests) {
        if (!chestToOpen)
        {
            continue;
        }
    
        let chest = bot.openChest(chestToOpen);
    
        chest.once("open", async () => {
            log(chalk.green("chest is opened for cobblestone items"));
            
            if (chest.window.emptySlotCount() === 0)
            {
                chest.close();
                log(chalk.red("one of the market chests is already full so closed it"));
                continue;
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
    }
}

async function takePickaxe() {
    await sleep(1000);

    log(chalk.blue("trying to withdraw a pick axe"));
    let chestToOpen = bot.findBlock({
        matching: ["chest", "trapped_chest"].map((name) => mcData.blocksByName[name].id),
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
    await sleep(250);

    log(chalk.blue("trying to dig"));

    if (bot.inventory.emptySlotCount() <= 2) {
        goToCobblestoneMarket();
        return;
    }

    if (bot.heldItem && bot.heldItem.name.includes("pickaxe")) {
        await bot.lookAt(v(7220, 73, 2399), true);
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
                log("cannot dig");
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
        console.log("I reached my " + botTarget + " target!");

        switch (botTarget) {
            case "cobble": {
                if (bot.entity.position.distanceTo(miningPosVector) > 1) {
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
                await depositGoodItems();
                return;
            }
        }
    });

    bot.on("path_update", (r) => {
        const nodesPerTick = ((r.visitedNodes * 50) / r.time).toFixed(2);
        console.log(`I can get there in ${r.path.length} moves. Computation took ${r.time.toFixed(2)} ms (${r.visitedNodes} nodes, ${nodesPerTick} nodes/tick)`);
    });

    const blocks = ["stone", "ore"];

    bot.on("blockUpdate", function (oldBlock, newBlock) {
        if (!bot.targetDigBlock) {
            if (newBlock.name.includes("stone") || newBlock.name.includes("ore")) {
                if (newBlock.position.distanceTo(cobbleStoneVector) < 5) {
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
                    if (bot.entity.position.distanceTo(miningPosVector) > 25) {
                        bot.chat("/is go");
                    } else {
                        goToCobblestoneMarket();
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
