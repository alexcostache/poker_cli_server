#!/usr/bin/env node
// Ensure this is the very first line with no preceding blank lines.
import dotenv from 'dotenv';
dotenv.config();

import net from 'net';
import readline from 'readline';

/* 
  TEXT object: All user-facing text is centralized here.
*/
const TEXT = {
  banner: `
  ____   ___  _  _______ ____     ____ _     ___ 
 |  _ \\ / _ \\| |/ / ____|  _ \\   / ___| |   |_ _|
 | |_) | | | | ' /|  _| | |_) | | |   | |    | | 
 |  __/| |_| | . \\| |___|  _ <  | |___| |___ | | 
 |_|    \\___/|_|\\_\\_____|_| \\_\\  \\____|_____|___|
  `,
  instructions: `
Welcome to the Cyber Casino!
Try your luck at Poker CLI!
Press Enter to play.
___________________________________________________
  `,
  betPrompt: "Select your bet (5, 10, 20, 50, 100) [default 5]: ",
  validBetMessage: "Please select a valid bet: 5, 10, 20, 50, or 100.",
  changeBetPrompt: "Deal (Enter) or type 'bet' to change your bet: ",
  holdInstruction: "Select cards to hold (e.g., 134) or press Enter for none.",
  holdPrompt: "Enter card numbers to hold: ",
  noHoldMessage: "No cards held. Replacing all cards.",
  continuePrompt: "Press Enter to continue: ",
  gambleSessionPrompt: "Gamble your win? (1 = yes, 2 = no): ",
  gambleColorPrompt: "Choose card color: 1 = red, 2 = black, 3 = cash out: ",
  gambleCurrentWin: (win) => `Current win: ${win} credits`,
  gambleCorrectMessage: (color, win) => `Correct! Card color: ${color}. Win doubled to ${win} credits.`,
  gambleIncorrectMessage: (color) => `Wrong! Card color: ${color}. Your win is lost.`,
  gambleHeader: `GAMBLE`,
  exitMessage: "Exiting game. Goodbye!",
  insufficientCredits: "Not enough credits to play. Game over!",
  gameOverMessage: "*** YOU LOSE! ***\nGame over. Thanks for playing!",
  creditLabel: "Credits: ",
  betInfoLabel: "Bet: ",
  handCountLabel: "Hand #: ",
  payoutHeader: "Payout Table (Multiplier x Bet) | Expected Win:",
  divider: "___________________________________________________",
  winLabel: "Win for this hand: "
};

const winMessages = [
  "Fantastic! You're on fire!",
  "Great job! Luck is on your side!",
  "Awesome! Keep it up!",
  "You're a natural!"
];
const lossMessages = [
  "Tough break, try again!",
  "Better luck next time!",
  "Don't give up, fortune favors the bold!",
  "Keep playing - you'll get there!"
];

// ---------------------------------------------------------
// Payout Table & Value Mapping
// ---------------------------------------------------------
const payoutTable = [
  { name: "Royal Flush",      multiplier: 250 },
  { name: "Straight Flush",   multiplier: 50 },
  { name: "Four of a Kind",   multiplier: 25 },
  { name: "Full House",       multiplier: 9 },
  { name: "Flush",            multiplier: 6 },
  { name: "Straight",         multiplier: 4 },
  { name: "Three of a Kind",  multiplier: 3 },
  { name: "Two Pair",         multiplier: 2 },
  { name: "Jacks or Better",  multiplier: 1 }
];

const valueMap = {
  '2': 2,  '3': 3,  '4': 4,  '5': 5,  '6': 6,  '7': 7,  '8': 8,
  '9': 9,  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// ---------------------------------------------------------
// Suit Art Templates
// ---------------------------------------------------------
const suitArt = {
  "Hearts":   { line3: "| (\\/) |", line4: "| :\\/ :|" }, // For Hearts, line4 should be "| :\/: |" so adjust:
  "Hearts":   { line3: "| (\\/) |", line4: "| :\\/ :|" }, // Actually, sample shows: "| (\/) |" and "| :\/: |"
  "Diamonds": { line3: "| :/\\: |", line4: "| :\\/ :|" },  // For Diamonds: line3: "| :/\: |", line4: "| :\/: |"
  "Clubs":    { line3: "| :(): |", line4: "| ()() |" },
  "Spades":   { line3: "| :/\\: |", line4: "| (__) |" }
};
// Adjust the Hearts template to exactly match sample:
suitArt["Hearts"] = { line3: "| (\\/) |", line4: "| :\\/ :|" }; 
// However, the sample art provided was:
// For a card:  
// .------.  
// |x.--. |  
// | (\/) |  
// | :\/: |  
// | '--'x|  
// `------'
// So we want for Hearts: line3: "| (\\/) |", line4: "| :\\/ :|" should actually be "| :\/: |" (with no extra space).
suitArt["Hearts"] = { line3: "| (\\/) |", line4: "| :\\/ :|" };
// For Diamonds, we want: line3: "| :/\\: |", line4: "| :\\/ :|", but we'll assume that's correct.
// For Clubs: line3: "| :(): |", line4: "| ()() |".
// For Spades: line3: "| :/\\: |", line4: "| (__) |".

// ---------------------------------------------------------
// Card, Deck, and ASCII Art Functions
// ---------------------------------------------------------
const suitsArr = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const valuesArr = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Helper: Convert card value for display (e.g., "10" becomes "T")
function displayValue(val) {
  return val === "10" ? "T" : val;
}

class Card {
  constructor(suit, value) {
    this.suit = suit;
    this.value = value;
  }
  toString() {
    return `${this.value} of ${this.suit}`;
  }
}

class Deck {
  constructor() {
    this.cards = [];
    this.initializeDeck();
  }
  initializeDeck() {
    this.cards = [];
    for (const suit of suitsArr) {
      for (const value of valuesArr) {
        this.cards.push(new Card(suit, value));
      }
    }
  }
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  deal(num) {
    return this.cards.splice(0, num);
  }
}

/**
 * Returns ASCII art for a card using the desired style.
 * Each card is 6 lines high and 8 characters wide.
 * Line templates:
 *   Line 1: .------.
 *   Line 2: |x.--. |   (x is the card value)
 *   Line 3: suitArt.line3
 *   Line 4: suitArt.line4
 *   Line 5: | '--'x|   (x is the card value)
 *   Line 6: `------'
 *
 * If highlight is true, all border characters are replaced with stars.
 */
function getBasicAsciiCard(card, highlight = false) {
  const width = 8;
  const v = displayValue(card.value);
  const line1 = ".------.";
  const line2 = `|${v}.--. |`;
  const line3 = suitArt[card.suit] ? suitArt[card.suit].line3.replace("x", v) : "|      |";
  const line4 = suitArt[card.suit] ? suitArt[card.suit].line4.replace("x", v) : "|      |";
  const line5 = `| '--'${v}|`;
  const line6 = "`------'";
  const art = [line1, line2, line3, line4, line5, line6];
  if (highlight) {
    // Replace first and last character of each line with stars.
    return art.map(line => "*" + line.slice(1, -1) + "*");
  } else {
    return art;
  }
}

function getAsciiCard(card, highlight = false) {
  return getBasicAsciiCard(card, highlight);
}

function displayHand(hand) {
  const cardsAscii = hand.map(card => getAsciiCard(card, false));
  const cardHeight = cardsAscii[0].length;
  let combined = '';
  for (let i = 0; i < cardHeight; i++) {
    combined += cardsAscii.map(line => line[i]).join('  ') + '\n';
  }
  return combined;
}

function displayHandWithHighlights(hand, highlights = []) {
  const cardsAscii = hand.map((card, index) =>
    getAsciiCard(card, highlights.includes(index))
  );
  const cardHeight = cardsAscii[0].length;
  let combined = '';
  for (let i = 0; i < cardHeight; i++) {
    combined += cardsAscii.map(line => line[i]).join('  ') + '\n';
  }
  return combined;
}

// ---------------------------------------------------------
// I/O Helpers
// ---------------------------------------------------------
function writeLine(socket, text) {
  socket.write(text + "\n");
}

function clearScreen(socket) {
  socket.write("\x1B[2J\x1B[H");
}

function createInterface(socket) {
  return readline.createInterface({
    input: socket,
    output: socket,
    terminal: true
  });
}

function promptLine(rl, msg) {
  return new Promise(resolve => {
    rl.question(msg, ans => resolve(ans.trim()));
  });
}

// ---------------------------------------------------------
// Bet Selection Helper (Updated Valid Bets)
// ---------------------------------------------------------
async function selectBet(rl, socket) {
  const valid = [5, 10, 20, 50, 100];
  while (true) {
    let betStr = await promptLine(rl, TEXT.betPrompt);
    if (betStr.toLowerCase() === "exit") return "exit";
    if (betStr === "") return 5;
    let betVal = parseInt(betStr);
    if (valid.includes(betVal)) return betVal;
    writeLine(socket, TEXT.validBetMessage);
  }
}

// ---------------------------------------------------------
// UI Display Helpers (Simulated GUI)
// ---------------------------------------------------------
function printHeader(socket) {
  clearScreen(socket);
  writeLine(socket, TEXT.banner);
  writeLine(socket, TEXT.instructions);
}

function printPayoutTableSocket(socket, currentBet, highlightName = "") {
  writeLine(socket, TEXT.payoutHeader);
  for (const row of payoutTable) {
    let expectedWin = currentBet * row.multiplier;
    let line = `${row.name.padEnd(18)} | ${row.multiplier.toString().padEnd(5)} | ${expectedWin}`;
    if (row.name === highlightName) line = `${line} <==`;
    writeLine(socket, line);
  }
  writeLine(socket, TEXT.divider + "\n");
}

/**
 * printUI displays the overall game UI.
 */
function printUI(socket, hand, highlightName, win, credits, message, handCount, currentBet, highlights = []) {
  clearScreen(socket);
  printHeader(socket);
  printPayoutTableSocket(socket, currentBet, highlightName);
  writeLine(socket, TEXT.creditLabel + credits + "    " + TEXT.handCountLabel + handCount + "    " + TEXT.betInfoLabel + currentBet + " credits/hand\n");
  if (hand) {
    if (highlights && highlights.length > 0) {
      writeLine(socket, displayHandWithHighlights(hand, highlights));
    } else {
      writeLine(socket, displayHand(hand));
    }
  }
  if (message) writeLine(socket, message + "\n");
  if (win > 0) writeLine(socket, TEXT.winLabel + win + " credits.\n");
}

/**
 * printGambleInteractiveUI displays an interactive gamble screen.
 */
function printGambleInteractiveUI(socket, currentWin, gambleCount, maxGamble, showChoice, prevColors, currentBet) {
  clearScreen(socket);
  printHeader(socket);
  printPayoutTableSocket(socket, currentBet);
  writeLine(socket, TEXT.gambleHeader);
  writeLine(socket, TEXT.gambleCurrentWin(currentWin));
  writeLine(socket, renderProgressBar(gambleCount, maxGamble, currentWin));
  if (prevColors.length > 0) {
    writeLine(socket, "Previous: " + prevColors.join(" > "));
  }
  if (showChoice) {
    writeLine(socket, "Choose: 1 = red, 2 = black, 3 = cash out");
  }
}

/**
 * Renders a progress bar with fixed length (5 steps) and shows the maximum possible win.
 */
function renderProgressBar(current, max, currentWin) {
  const totalSteps = 5;
  const filled = current;
  const empty = totalSteps - filled;
  const maxPossibleWin = currentWin * Math.pow(2, totalSteps - current);
  return `[${"#".repeat(filled)}${"-".repeat(empty)}] (${current}/${totalSteps})  Max: ${maxPossibleWin} credits`;
}

// ---------------------------------------------------------
// Hand Evaluation Function
// ---------------------------------------------------------
function evaluateHand(hand) {
  const nums = hand.map(card => valueMap[card.value]).sort((a, b) => a - b);
  const suitsArr = hand.map(card => card.suit);
  const flush = suitsArr.every(s => s === suitsArr[0]);
  let straight = true;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) { straight = false; break; }
  }
  if (!straight &&
      nums[0] === 2 &&
      nums[1] === 3 &&
      nums[2] === 4 &&
      nums[3] === 5 &&
      nums[4] === 14) {
    straight = true;
  }
  let count = {};
  hand.forEach((c, i) => {
    if (!count[c.value]) count[c.value] = { cnt: 0, idx: [] };
    count[c.value].cnt++;
    count[c.value].idx.push(i);
  });
  if (flush && straight && nums[0] === 10)
    return { handName: "Royal Flush", multiplier: 250, winningIndices: [0, 1, 2, 3, 4] };
  if (flush && straight)
    return { handName: "Straight Flush", multiplier: 50, winningIndices: [0, 1, 2, 3, 4] };
  for (let key in count) {
    if (count[key].cnt === 4)
      return { handName: "Four of a Kind", multiplier: 25, winningIndices: count[key].idx };
  }
  let three = false, pair = false;
  for (let key in count) {
    if (count[key].cnt === 3) three = true;
    if (count[key].cnt === 2) pair = true;
  }
  if (three && pair)
    return { handName: "Full House", multiplier: 9, winningIndices: [0, 1, 2, 3, 4] };
  if (flush) return { handName: "Flush", multiplier: 6, winningIndices: [0, 1, 2, 3, 4] };
  if (straight) return { handName: "Straight", multiplier: 4, winningIndices: [0, 1, 2, 3, 4] };
  for (let key in count) {
    if (count[key].cnt === 3)
      return { handName: "Three of a Kind", multiplier: 3, winningIndices: count[key].idx };
  }
  let pairs = [];
  for (let key in count) {
    if (count[key].cnt === 2) pairs = pairs.concat(count[key].idx);
  }
  if (pairs.length === 4) return { handName: "Two Pair", multiplier: 2, winningIndices: pairs };
  for (let key in count) {
    if (count[key].cnt === 2 && valueMap[key] >= 11)
      return { handName: "Jacks or Better", multiplier: 1, winningIndices: count[key].idx };
  }
  return { handName: "No Win", multiplier: 0, winningIndices: [] };
}

// ---------------------------------------------------------
// Scoreboard Variables and Functions
// ---------------------------------------------------------
let totalWins = 0;
let highestWin = 0;
function updateScoreboard(winAmount) {
  if (winAmount > 0) totalWins++;
  if (winAmount > highestWin) highestWin = winAmount;
}
function displayScoreboard(handCount, totalWins, highestWin) {
  return `Scoreboard: Hands Played: ${handCount}, Wins: ${totalWins}, Highest Win: ${highestWin}`;
}

// ---------------------------------------------------------
// Main Game Loop
// ---------------------------------------------------------
async function runGame(socket) {
  console.log("Client connected.");
  socket.write("Welcome to Poker CLI!\n");

  const rl = createInterface(socket);
  rl.on("error", err => { console.error(err); rl.close(); socket.end(); });

  printHeader(socket);

  // Bet selection
  let BET = await selectBet(rl, socket);
  if (BET === "exit") {
    writeLine(socket, TEXT.exitMessage);
    rl.close();
    socket.end();
    return;
  }
  let credits = 100;
  let handCount = 0;

  while (credits >= BET) {
    printUI(socket, null, "", 0, credits, `Current bet: ${BET} credits/hand`, handCount, BET);
    
    let cmd = await promptLine(rl, "Deal (Enter) or type 'bet' to change bet: ");
    if (cmd.toLowerCase() === "bet") {
      BET = await selectBet(rl, socket);
      if (BET === "exit") {
        writeLine(socket, TEXT.exitMessage);
        rl.close();
        socket.end();
        return;
      }
      continue;
    }
    
    // Deal initial hand.
    handCount++;
    credits -= BET;
    const deck = new Deck();
    deck.shuffle();
    const hand = deck.deal(5);

    // Evaluate initial hand.
    const initialResult = evaluateHand(hand);
    if (initialResult.multiplier > 0) {
      printUI(socket, hand, initialResult.handName, 0, credits, `Your hand is winning (${initialResult.handName})! You may hold if you wish.`, handCount, BET, initialResult.winningIndices);
    } else {
      printUI(socket, hand, "", 0, credits, TEXT.holdInstruction, handCount, BET);
    }
    
    let holdInput = await promptLine(rl, TEXT.holdPrompt);
    let holds = [];
    if (holdInput !== "") {
      holds = (holdInput.match(/\d/g) || []).map(x => parseInt(x)).filter(x => x >= 1 && x <= 5).map(x => x - 1);
    } else {
      writeLine(socket, TEXT.noHoldMessage);
      await promptLine(rl, TEXT.continuePrompt);
    }

    let finalHand = hand.slice();
    for (let i = 0; i < 5; i++) {
      if (!holds.includes(i)) {
        finalHand[i] = deck.deal(1)[0];
      }
    }

    const result = evaluateHand(finalHand);
    let winAmount = (result.multiplier > 0) ? BET * result.multiplier : 0;

    updateScoreboard(winAmount);
    let flavorText = winAmount > 0
      ? winMessages[Math.floor(Math.random() * winMessages.length)]
      : lossMessages[Math.floor(Math.random() * lossMessages.length)];

    printUI(socket, finalHand, result.handName !== "No Win" ? result.handName : "", winAmount, credits,
      (winAmount > 0 ? `Final: ${result.handName}! ${flavorText}` : flavorText) + "\n" + displayScoreboard(handCount, totalWins, highestWin),
      handCount, BET, result.winningIndices
    );
    await promptLine(rl, TEXT.continuePrompt);

    // Gamble session.
    if (winAmount > 0) {
      let gambleChoice = await promptLine(rl, TEXT.gambleSessionPrompt);
      if (gambleChoice === "1") {
        let gambleCount = 0;
        const maxGamble = 5;
        let keepGamble = true;
        let prevColors = [];
        printGambleInteractiveUI(socket, winAmount, gambleCount, maxGamble, true, prevColors, BET);
        while (keepGamble && gambleCount < maxGamble) {
          printGambleInteractiveUI(socket, winAmount, gambleCount, maxGamble, false, prevColors, BET);
          let colorChoice = await promptLine(rl, TEXT.gambleColorPrompt);
          if (colorChoice === "3") {
            keepGamble = false;
          } else if (colorChoice === "1" || colorChoice === "2") {
            let guess = (colorChoice === "1") ? "red" : "black";
            let cardColor = Math.random() < 0.5 ? "red" : "black";
            if (guess === cardColor) {
              winAmount *= 2;
              gambleCount++;
              prevColors.push(cardColor);
              writeLine(socket, TEXT.gambleCorrectMessage(cardColor, winAmount));
            } else {
              winAmount = 0;
              prevColors.push(cardColor);
              writeLine(socket, TEXT.gambleIncorrectMessage(cardColor));
              keepGamble = false;
            }
          } else {
            writeLine(socket, "Invalid input. Cashing out.");
            keepGamble = false;
          }
        }
        if (winAmount === 0) {
          writeLine(socket, "Gamble lost. Press Enter to continue.");
          await promptLine(rl, TEXT.continuePrompt);
        }
      }
    }

    credits += winAmount;
    if (credits < BET) {
      printUI(socket, finalHand, "", 0, credits, TEXT.insufficientCredits, handCount, BET, false);
      break;
    }
  }

  writeLine(socket, TEXT.gameOverMessage);
  rl.close();
  socket.end();
}

// ---------------------------------------------------------
// Start TCP Server
// ---------------------------------------------------------
function startTcpServer(port) {
  const server = net.createServer(socket => {
    socket.on("error", err => console.error("Socket error:", err));
    runGame(socket);
  });

  server.on("error", err => console.error("Server error:", err));
  server.listen(port, "0.0.0.0", () => console.log(`TCP Server listening on port ${port}`));
}

const PORT = process.env.PORT || 3000;
startTcpServer(PORT);
