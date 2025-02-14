#!/usr/bin/env node
// Ensure this is the very first line with no preceding blank lines.
import dotenv from 'dotenv';
dotenv.config();

import net from 'net';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import readline from 'readline';
import { intro, outro, text, confirm, select } from '@clack/prompts';

// ------------------ Global Color Variables ------------------

// Color for Hearts and Diamonds (bright red)
const HEARTS_DIAMONDS_COLOR = chalk.redBright;

// Color for Clubs and Spades (bright blue)
const CLUBS_SPADES_COLOR = chalk.blueBright;

// ANSI Reset code
const RESET = "\x1b[0m";

// Winning highlight: black text on a green background.
const WIN_HIGHLIGHT = chalk.bgGreen.black;

// ------------------ End Global Colors ------------------

// ------------------ Welcome Banner & Instructions ------------------
const WELCOME_BANNER = `
  ____   ___  _  _______ ____     ____ _     ___ 
 |  _ \\ / _ \\| |/ / ____|  _ \\   / ___| |   |_ _|
 | |_) | | | | ' /|  _| | |_) | | |   | |    | | 
 |  __/| |_| | . \\| |___|  _ <  | |___| |___ | | 
 |_|    \\___/|_|\\_\\_____|_| \\_\\  \\____|_____|___|
                                                  
`;

const INSTRUCTIONS = `
Welcome to POKER CLI!

Please ensure your terminal supports UTF-8 and ANSI escape codes.
For Windows: Run 'chcp 65001' in your command prompt.
For Linux: Ensure your locale is set to UTF-8 (e.g., export LANG=en_US.UTF-8).

Enjoy the game!
`;
// ------------------ End Welcome Banner & Instructions ------------------

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
// Card, Deck, and ASCII Art Functions
// ---------------------------------------------------------

const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

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
    for (const suit of suits) {
      for (const value of values) {
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
 * Returns the ASCII art for a card with its suit color.
 */
function getAsciiCard(card) {
  let colorFunc;
  if (card.suit === "Hearts" || card.suit === "Diamonds") {
    colorFunc = (str) => HEARTS_DIAMONDS_COLOR(str) + RESET;
  } else if (card.suit === "Clubs" || card.suit === "Spades") {
    colorFunc = (str) => CLUBS_SPADES_COLOR(str) + RESET;
  } else {
    colorFunc = (str) => str;
  }
  const val = card.value;
  const leftVal  = (val.length === 2 ? val : val + ' ');
  const rightVal = (val.length === 2 ? val : ' ' + val);
  const suitSymbol = card.suit === "Hearts" ? "♥" :
                     card.suit === "Diamonds" ? "♦" :
                     card.suit === "Clubs" ? "♣" :
                     card.suit === "Spades" ? "♠" : "?";
  let art = [
    '┌─────────┐',
    `│${leftVal}       │`,
    '│         │',
    `│    ${suitSymbol}    │`,
    '│         │',
    `│       ${rightVal}│`,
    '└─────────┘'
  ];
  return art.map(line => colorFunc(line));
}

function displayHand(hand) {
  const cardsAscii = hand.map(card => getAsciiCard(card));
  const cardHeight = cardsAscii[0].length;
  let combined = '';
  for (let i = 0; i < cardHeight; i++) {
    const line = cardsAscii.map(cardLines => cardLines[i]).join('  ');
    combined += line + '\n';
  }
  return combined;
}

function displayHandWithIndices(hand, highlightIndexes = []) {
  const cardsAscii = hand.map((card, index) => {
    let art = getAsciiCard(card);
    if (highlightIndexes.includes(index)) {
      art = art.map(line => String(WIN_HIGHLIGHT(stripAnsi(line))));
    }
    return art;
  });
  const cardHeight = cardsAscii[0].length;
  let combined = '';
  for (let i = 0; i < cardHeight; i++) {
    const line = cardsAscii.map(cardLines => cardLines[i]).join('  ');
    combined += line + '\n';
  }
  let indicesLine = '';
  for (let i = 0; i < hand.length; i++) {
    const indexStr = `(${i+1})`;
    const padded = indexStr.padStart(Math.floor((11 + indexStr.length) / 2), ' ')
                             .padEnd(11, ' ');
    indicesLine += padded + "  ";
  }
  combined += indicesLine + '\n';
  return combined;
}

function displayHandWithHighlights(hand, highlightIndexes = []) {
  const cardsAscii = hand.map((card, index) => {
    let art = getAsciiCard(card);
    if (highlightIndexes.includes(index)) {
      art = art.map(line => String(WIN_HIGHLIGHT(stripAnsi(line))));
    }
    return art;
  });
  const cardHeight = cardsAscii[0].length;
  let combined = '';
  for (let i = 0; i < cardHeight; i++) {
    const line = cardsAscii.map(cardLines => cardLines[i]).join('  ');
    combined += line + '\n';
  }
  return combined;
}

// ---------------------------------------------------------
// Custom Prompt Functions for Remote I/O
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

function promptLine(rl, message) {
  return new Promise(resolve => {
    rl.question(message, answer => {
      if (answer.trim().toLowerCase() === "exit") {
        resolve("exit");
      } else {
        resolve(answer.trim());
      }
    });
  });
}

async function promptConfirm(rl, message) {
  let answer = await promptLine(rl, message + " (y/n): ");
  return answer.toLowerCase().startsWith('y');
}

// ---------------------------------------------------------
// UI Display Helpers for Remote I/O (Persistent Header)
// ---------------------------------------------------------

// Print header (banner + instructions) once on connect.
function printHeader(socket) {
  clearScreen(socket);
  writeLine(socket, WELCOME_BANNER);
  writeLine(socket, INSTRUCTIONS);
}

function printPayoutTableSocket(socket, highlightName = "") {
  writeLine(socket, "Payout Table (Multiplier x Bet):");
  for (const row of payoutTable) {
    let line = `${row.name.padEnd(18)} : ${row.multiplier}`;
    if (row.name === highlightName) {
      line = chalk.green(line);
    }
    writeLine(socket, line);
  }
  writeLine(socket, '---------------------------------------------------\n');
}

// After game starts, clear the screen completely and reprint the banner (without instructions).
function printUI(socket, hand, highlightName, win, credits, message, showIndices = false, highlightedIndexes = []) {
  clearScreen(socket);
  // Print only the banner (without instructions) after game starts.
  writeLine(socket, WELCOME_BANNER);
  writeLine(socket, `Credits: ${credits}\n`);
  printPayoutTableSocket(socket, highlightName);
  if (hand) {
    writeLine(socket, "Your Hand:");
    if (showIndices) {
      writeLine(socket, displayHandWithIndices(hand, highlightedIndexes));
    } else if (highlightedIndexes.length > 0) {
      writeLine(socket, displayHandWithHighlights(hand, highlightedIndexes));
    } else {
      writeLine(socket, displayHand(hand));
    }
  }
  if (message) {
    writeLine(socket, message + "\n");
  }
  if (win > 0) {
    writeLine(socket, `Win for this hand: ${win} credits.\n`);
  }
}

// ---------------------------------------------------------
// Hand Evaluation Function (Unchanged)
// ---------------------------------------------------------

function evaluateHand(hand) {
  const numbers = hand.map(card => valueMap[card.value]).sort((a, b) => a - b);
  const suitsArr = hand.map(card => card.suit);
  const isFlush = suitsArr.every(s => s === suitsArr[0]);
  let isStraight = true;
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      isStraight = false;
      break;
    }
  }
  if (!isStraight &&
      numbers[0] === 2 &&
      numbers[1] === 3 &&
      numbers[2] === 4 &&
      numbers[3] === 5 &&
      numbers[4] === 14) {
    isStraight = true;
  }
  let countMap = {};
  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    if (!countMap[card.value]) {
      countMap[card.value] = { count: 0, indices: [] };
    }
    countMap[card.value].count++;
    countMap[card.value].indices.push(i);
  }
  if (isFlush && isStraight && numbers[0] === 10) {
    return { handName: "Royal Flush", multiplier: 250, winningIndices: [0, 1, 2, 3, 4] };
  }
  if (isFlush && isStraight) {
    return { handName: "Straight Flush", multiplier: 50, winningIndices: [0, 1, 2, 3, 4] };
  }
  for (let key in countMap) {
    if (countMap[key].count === 4) {
      return { handName: "Four of a Kind", multiplier: 25, winningIndices: countMap[key].indices };
    }
  }
  let hasThree = false, hasPair = false;
  for (let key in countMap) {
    if (countMap[key].count === 3) { hasThree = true; }
    if (countMap[key].count === 2) { hasPair = true; }
  }
  if (hasThree && hasPair) {
    return { handName: "Full House", multiplier: 9, winningIndices: [0, 1, 2, 3, 4] };
  }
  if (isFlush) {
    return { handName: "Flush", multiplier: 6, winningIndices: [0, 1, 2, 3, 4] };
  }
  if (isStraight) {
    return { handName: "Straight", multiplier: 4, winningIndices: [0, 1, 2, 3, 4] };
  }
  for (let key in countMap) {
    if (countMap[key].count === 3) {
      return { handName: "Three of a Kind", multiplier: 3, winningIndices: countMap[key].indices };
    }
  }
  let pairIndices = [];
  for (let key in countMap) {
    if (countMap[key].count === 2) {
      pairIndices = pairIndices.concat(countMap[key].indices);
    }
  }
  if (pairIndices.length === 4) {
    return { handName: "Two Pair", multiplier: 2, winningIndices: pairIndices };
  }
  for (let key in countMap) {
    if (countMap[key].count === 2 && valueMap[key] >= 11) {
      return { handName: "Jacks or Better", multiplier: 1, winningIndices: countMap[key].indices };
    }
  }
  return { handName: "No Win", multiplier: 0, winningIndices: [] };
}

// ---------------------------------------------------------
// Main Game Loop (Remote Version)
// ---------------------------------------------------------

async function runGame(socket) {
  const rl = createInterface(socket);

  // Handle errors on the readline interface.
  rl.on('error', (err) => {
    console.error("Readline error:", err);
    rl.close();
    socket.end();
  });

  // Print header (banner + instructions) once on connect.
  printHeader(socket);

  let betStr = await promptLine(rl, "Select your bet (5, 10, 20, 30) [default 5]: ");
  if(betStr.toLowerCase() === "exit"){
    writeLine(socket, "Exiting game. Goodbye!");
    rl.close();
    socket.end();
    return;
  }
  let BET = parseInt(betStr) || 5;
  let credits = 100;

  while (credits >= BET) {
    printUI(socket, null, "", 0, credits, `Bet: ${BET} credits per hand`);
    let dealPrompt = await promptLine(rl, "Press Enter to deal a hand: ");
    if(dealPrompt.toLowerCase() === "exit"){
      writeLine(socket, "Exiting game. Goodbye!");
      rl.close();
      socket.end();
      return;
    }

    credits -= BET;

    const deck = new Deck();
    deck.shuffle();
    const initialHand = deck.deal(5);

    printUI(socket, initialHand, "", 0, credits,
      "Select cards to hold by entering their numbers (e.g. 134 for cards 1, 3, and 4).\nPress Enter to hold none.",
      true
    );

    let holdInput = await promptLine(rl, "Enter card numbers to hold: ");
    if(holdInput.toLowerCase() === "exit"){
      writeLine(socket, "Exiting game. Goodbye!");
      rl.close();
      socket.end();
      return;
    }
    let holds = [];
    if (holdInput !== "") {
      if (holdInput.includes(",") || holdInput.includes(" ")) {
        holds = holdInput.split(/[, ]+/);
      } else {
        holds = holdInput.split("");
      }
      holds = holds.map(x => parseInt(x.trim()))
                   .filter(x => !isNaN(x) && x >= 1 && x <= 5)
                   .map(x => x - 1);
    } else {
      writeLine(socket, "No cards selected to hold. All cards will be replaced.");
      let cont = await promptLine(rl, "Press Enter to continue drawing new cards: ");
      if(cont.toLowerCase() === "exit"){
        writeLine(socket, "Exiting game. Goodbye!");
        rl.close();
        socket.end();
        return;
      }
    }

    let finalHand = initialHand.slice();
    for (let i = 0; i < 5; i++) {
      if (!holds.includes(i)) {
        finalHand[i] = deck.deal(1)[0];
      }
    }

    const evalResult = evaluateHand(finalHand);
    let winAmount = (evalResult.multiplier > 0) ? BET * evalResult.multiplier : 0;

    printUI(socket, finalHand, (evalResult.handName !== "No Win") ? evalResult.handName : "", winAmount, credits,
      (evalResult.multiplier > 0)
        ? `Final Hand: ${evalResult.handName}!`
        : "Final Hand: No winning combination.",
      false, evalResult.winningIndices
    );
    let cont2 = await promptLine(rl, "Press Enter to continue: ");
    if(cont2.toLowerCase() === "exit"){
      writeLine(socket, "Exiting game. Goodbye!");
      rl.close();
      socket.end();
      return;
    }

    if (winAmount > 0) {
      let gambleChoice = await promptLine(rl, "Gamble: Do you want to gamble your win to double it? (Y/N): ");
      if (gambleChoice.toLowerCase() === 'y') {
        let colorGuess = await promptLine(rl, "Enter your guess (R for red, B for black): ");
        if(colorGuess.toLowerCase() === "exit"){
          writeLine(socket, "Exiting game. Goodbye!");
          rl.close();
          socket.end();
          return;
        }
        let guess = (colorGuess.toLowerCase() === 'r') ? "red" : (colorGuess.toLowerCase() === 'b' ? "black" : "black");
        const randomColor = Math.random() < 0.5 ? "red" : "black";
        if (guess === randomColor) {
          winAmount *= 2;
          printUI(socket, finalHand, (evalResult.handName !== "No Win") ? evalResult.handName : "", winAmount, credits,
            `Gamble successful! The card was ${randomColor}. Your win is now ${winAmount} credits.`, false);
        } else {
          winAmount = 0;
          printUI(socket, finalHand, "", 0, credits,
            `Gamble failed! The card was ${randomColor}. You lose your win for this hand.`, false);
          let cont3 = await promptLine(rl, "Press Enter to continue: ");
          if(cont3.toLowerCase() === "exit"){
            writeLine(socket, "Exiting game. Goodbye!");
            rl.close();
            socket.end();
            return;
          }
        }
      }
    }

    credits += winAmount;
    if (credits < BET) {
      printUI(socket, finalHand, "", 0, credits, "Not enough credits to play. Game over!", false);
      break;
    }
  }

  writeLine(socket, chalk.bold("*** YOU LOSE! ***"));
  outro("Game Over. Thanks for playing!");
  rl.close();
  socket.end();
}

// ---------------------------------------------------------
// Start TCP Server
// ---------------------------------------------------------
const PORT = process.env.PORT || 8080;
const server = net.createServer(socket => {
  socket.setEncoding('utf8');
  socket.on('error', (err) => {
    console.error("Socket error:", err);
  });
  runGame(socket);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
