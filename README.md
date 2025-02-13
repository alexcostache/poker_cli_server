# Poker CLI Server

Poker CLI Server is a terminal-based video poker game that you can play remotely. It simulates a classic video poker machine—dealing a hand of five cards, letting you choose which to hold, evaluating your hand against a standard payout table, and even offering a gamble option to double your winnings.

## Features

- **ASCII Art Cards:** Enjoy a visually appealing card display using Unicode and ANSI colors.
- **Standard Poker Hands:** The game evaluates your hand using traditional video poker rules.
- **Gamble Option:** Double your winnings by guessing red or black.
- **Remote Play:** Connect via telnet (or similar) to play the game remotely.
- **Exit Anytime:** Type `exit` at any prompt to leave the game immediately.

## How to Play

1. **Connect to the Server:**  
   Start the server using:
   ```bash
   node poker_cli_server.js
   ```
   Then, from a terminal, connect with:
   ```bash
   telnet localhost 3000
   # or
   ncat localhost 3000
   ```
   *(Replace `localhost` with your server’s IP if needed.)*

2. **Game Flow:**
   - **Bet Selection:**  
     Choose your bet (5, 10, 20, or 30 credits). Press Enter to accept the default (5).
   - **Deal a Hand:**  
     Press Enter to deal a hand of 5 cards.
   - **Hold Cards:**  
     Enter the numbers corresponding to the cards you want to hold (e.g., `134`) and press Enter. Press Enter without input to replace all cards.
   - **Hand Evaluation:**  
     Your final hand is evaluated and your win (if any) is displayed.
   - **Gamble Option:**  
     If you win, choose to gamble your win to double it by typing `Y` or `N`. If you choose `Y`, you'll then be asked to guess:
       - `R` for red
       - `B` for black  
     Both uppercase and lowercase are accepted.
   - **Exit:**  
     At any prompt, type `exit` to leave the game immediately.

3. **Game Over:**  
   The game continues until you run out of credits. When that happens, a "YOU LOSE" message is displayed.

## Requirements

- **Node.js** (v12 or higher)
- A terminal that supports UTF-8 and ANSI escape codes.  
  - **Windows Users:** Run `chcp 65001` in your command prompt to enable UTF-8.
  - **Linux Users:** Ensure your locale is set to UTF-8 (e.g., `export LANG=en_US.UTF-8`).

## Running the Server

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Start the Server:**
   ```bash
   node poker_cli_server.js
   ```
3. **Connect Remotely:**
   ```bash
   telnet localhost 3000
   # or
   ncat localhost 3000
   ```