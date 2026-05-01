// Google Sheets API integration for UFO Bingo Dashboard
// This module handles fetching data from Google Sheets

const SPREADSHEET_ID = '12QxCeOhHnmnoRQhiSmD56dPSl3rNnw2mfDt7qScz9Ds';
const API_KEY = 'AIzaSyBj6h3j8kq9l7m2n1o0p9q8r7s6t5u4v3w'; // You'll need to replace this with a valid API key

// Cache for storing loaded data
let cachedData = null;
let cachedGoalTypes = null;

/**
 * Fetches data from a Google Sheets worksheet using the public CSV export
 * This approach doesn't require authentication for publicly accessible sheets
 */
async function fetchSheetDataAsCsv(gid) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching sheet data (gid=${gid}):`, error);
        throw error;
    }
}

/**
 * Alternative method using Google Sheets API v4
 * Requires API key and the sheet must be publicly accessible or have proper sharing settings
 */
async function fetchSheetDataApi(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error(`Error fetching sheet data (range=${range}):`, error);
        throw error;
    }
}

/**
 * Parse CSV text into a 2D array
 */
function parseCsv(text) {
    const lines = [];
    let current = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                field += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === "," && !inQuotes) {
            current.push(field);
            field = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && next === "\n") {
                i += 1;
            }
            current.push(field);
            field = "";
            if (current.length > 1 || current[0] !== "") {
                lines.push(current);
            }
            current = [];
            continue;
        }

        field += char;
    }

    if (field.length > 0 || current.length > 0) {
        current.push(field);
        lines.push(current);
    }

    return lines;
}

/**
 * Load goal types from UFO Bingo website
 */
async function loadGoalTypesFromWebsite() {
    try {
        const response = await fetch('https://ufo50.bingo/goals');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = await response.text();
        
        console.log('=== DEBUG: Raw HTML from UFO Bingo website ===');
        console.log('HTML length:', html.length);
        console.log('First 1000 characters:');
        console.log(html.substring(0, 1000));
        console.log('=== END DEBUG ===');
        
        // Parse the HTML to extract goal data
        const goalTypes = new Map();
        
        // Create a temporary DOM element to parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Look for goal elements - this will need to be adjusted based on the actual HTML structure
        const goalElements = doc.querySelectorAll('[data-goal], .goal, .goal-item');
        console.log('Found goal elements:', goalElements.length);
        
        goalElements.forEach(element => {
            const goalText = element.textContent.trim();
            const goalType = element.getAttribute('data-type') || 
                           element.getAttribute('data-difficulty') ||
                           element.querySelector('.difficulty, .type')?.textContent.trim();
            
            console.log('Goal element:', { goalText, goalType });
            
            if (goalText && goalType) {
                goalTypes.set(goalText.toLowerCase(), goalType);
            }
        });
        
        // If no structured data found, try to parse from text patterns
        if (goalTypes.size === 0) {
            console.log('No structured data found, trying text pattern matching...');
            
            // Look for patterns in the text that might indicate goals and difficulties
            const lines = html.split('\n');
            let matchCount = 0;
            lines.forEach((line, index) => {
                // Look for lines that contain goal names and difficulty indicators
                const difficultyMatch = line.match(/\b(Easy|Medium|Hard|Very Hard)\b/i);
                if (difficultyMatch) {
                    const difficulty = difficultyMatch[1];
                    const goalText = line.replace(/\b(Easy|Medium|Hard|Very Hard)\b/i, '').trim();
                    if (goalText) {
                        goalTypes.set(goalText.toLowerCase(), difficulty);
                        matchCount++;
                        console.log(`Pattern match ${matchCount}: Line ${index}`, { goalText, difficulty, originalLine: line.trim() });
                    }
                }
            });
            
            console.log(`Found ${matchCount} pattern matches`);
        }
        
        console.log('=== DEBUG: Final goal types map ===');
        console.log('Total goal types loaded:', goalTypes.size);
        let count = 0;
        for (const [goal, type] of goalTypes.entries()) {
            console.log(`${count + 1}. "${goal}" -> ${type}`);
            count++;
            if (count >= 10) { // Show first 10 entries
                console.log('... (showing first 10 entries)');
                break;
            }
        }
        console.log('=== END DEBUG ===');
        
        return goalTypes;
        
    } catch (error) {
        console.error('Failed to load goal types from website:', error);
        // Fallback to CSV if website fetch fails
        return await loadGoalTypesFromCsv();
    }
}

/**
 * Load goal types from the local CSV file (fallback)
 */
async function loadGoalTypesFromCsv() {
    try {
        const response = await fetch('goal types.csv');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const csvText = await response.text();
        const table = parseCsv(csvText);
        const headers = table[0];
        const records = table.slice(1);
        
        const goalTypes = new Map();
        
        // Find column indices
        const goalIndex = headers.findIndex(h => h.toLowerCase() === 'goal');
        const typeIndex = headers.findIndex(h => h.toLowerCase() === 'type');
        
        if (goalIndex === -1 || typeIndex === -1) {
            console.warn('Goal or Type column not found in goal types CSV');
            return goalTypes;
        }
        
        for (const record of records) {
            if (record[goalIndex] && record[typeIndex]) {
                const goalName = record[goalIndex].trim().toLowerCase();
                const goalType = record[typeIndex].trim();
                goalTypes.set(goalName, goalType);
            }
        }
        
        console.log(`Loaded ${goalTypes.size} goal types from CSV`);
        return goalTypes;
        
    } catch (error) {
        console.error('Failed to load goal types from CSV:', error);
        return new Map();
    }
}

/**
 * Load player and goal data from Google Sheets
 * Attempts multiple methods to access the data
 */
async function loadPlayerAndGoalData() {
    // Return cached data if available
    if (cachedData && cachedGoalTypes) {
        return {
            playerData: cachedData,
            goalTypes: cachedGoalTypes
        };
    }

    try {
        // Method 1: Try to fetch main data using CSV export (assuming it's the first sheet)
        let csvText;
        try {
            csvText = await fetchSheetDataAsCsv('0'); // gid=0 is typically the first sheet
        } catch (error) {
            console.warn('CSV export failed, trying API method:', error.message);
            // Method 2: Try API method with a default range
            const apiData = await fetchSheetDataApi('Sheet1!A:Z');
            // Convert API data back to CSV format for compatibility
            csvText = apiData.map(row => 
                row.map(cell => {
                    // Escape commas and quotes in CSV format
                    if (cell.includes(',') || cell.includes('"')) {
                        return `"${cell.replace(/"/g, '""')}"`;
                    }
                    return cell;
                }).join(',')
            ).join('\n');
        }

        // Parse the CSV data
        const table = parseCsv(csvText);
        const headers = table[0];
        const records = table.slice(1);

        // Map the data using the same structure as the original CSV
        const index = {
            tier: headers.findIndex(h => h.toLowerCase().includes('tier')),
            player1: headers.findIndex(h => h.toLowerCase().includes('player 1')),
            player2: headers.findIndex(h => h.toLowerCase().includes('player 2')),
            completedBy: headers.findIndex(h => h.toLowerCase().includes('completed')),
            game: headers.findIndex(h => h.toLowerCase().includes('game')),
            goal: headers.findIndex(h => h.toLowerCase().includes('goal')),
            sourceGoal: headers.findIndex(h => h.toLowerCase().includes('source'))
        };

        const playerData = records.map((record) => ({
            tier: record[index.tier] || "",
            player1: record[index.player1] || "",
            player2: record[index.player2] || "",
            completedBy: record[index.completedBy] || "",
            game: record[index.game] || "",
            goal: record[index.goal] || "",
            sourceGoal: record[index.sourceGoal] || record[index.goal] || "",
        }));

        // Load goal types from CSV file (has correct mappings)
        const goalTypes = await loadGoalTypesFromCsv();

        // Cache the data
        cachedData = playerData;
        cachedGoalTypes = goalTypes;

        return {
            playerData,
            goalTypes
        };

    } catch (error) {
        console.error('Failed to load data from Google Sheets:', error);
        throw new Error(`Could not load data from Google Sheets: ${error.message}`);
    }
}

/**
 * Clear the cached data (useful for forcing a refresh)
 */
function clearCache() {
    cachedData = null;
    cachedGoalTypes = null;
}

// Export the functions for use in the main app
window.SheetsAPI = {
    loadPlayerAndGoalData,
    loadGoalTypesFromWebsite,
    loadGoalTypesFromCsv,
    clearCache
};
