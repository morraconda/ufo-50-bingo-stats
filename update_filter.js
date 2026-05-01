// This script will update the player filtering logic to handle "All" players

const fs = require('fs');

// Read the current app.js file
let content = fs.readFileSync('app.js', 'utf8');

// Replace the player filtering logic to handle "All" players
const oldLogic = `    if (filterMode === "player") {
      const playerInMatch =
        normalize(row.player1) === normalize(selectedPlayer) ||
        normalize(row.player2) === normalize(selectedPlayer);
      return playerInMatch;
    }`;

const newLogic = `    if (filterMode === "player") {
      if (isAll(selectedPlayer)) {
        return true; // Show all players
      }
      const playerInMatch =
        normalize(row.player1) === normalize(selectedPlayer) ||
        normalize(row.player2) === normalize(selectedPlayer);
      return playerInMatch;
    }`;

// Replace the old logic with new logic
content = content.replace(oldLogic, newLogic);

// Write back to file
fs.writeFileSync('app.js', content, 'utf8');

console.log('Updated player filtering logic to handle "All" players');
