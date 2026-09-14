// Disk artwork in graph/disks is numbered by each game's slot on the UFO 50 menu.
// Names must match the "Game" column in the season sheets exactly.
const DISK_NUMBERS = {
  "Barbuta": 1, "Bug Hunter": 2, "Ninpek": 3, "Paint Chase": 4, "Magic Garden": 5,
  "Mortol": 6, "Velgress": 7, "Planet Zoldath": 8, "Attactics": 9, "Devilition": 10,
  "Kick Club": 11, "Avianos": 12, "Mooncat": 13, "Bushido Ball": 14, "Block Koala": 15,
  "Camouflage": 16, "Campanella": 17, "Golfaria": 18, "The Big Bell Race": 19, "Warptank": 20,
  "Waldorf's Journey": 21, "Porgy": 22, "Onion Delivery": 23, "Caramel Caramel": 24, "Party House": 25,
  "Hot Foot": 26, "Divers": 27, "Rail Heist": 28, "Vainger": 29, "Rock On! Island": 30,
  "Pingolf": 31, "Mortol II": 32, "Fist Hell": 33, "Overbold": 34, "Campanella 2": 35,
  "Hyper Contender": 36, "Valbrace": 37, "Rakshasa": 38, "Star Waspir": 39, "Grimstone": 40,
  "Lords of Diskonia": 41, "Night Manor": 42, "Elfazar's Hat": 43, "Pilot Quest": 44, "Mini & Max": 45,
  "Combatants": 46, "Quibble Race": 47, "Seaside Drive": 48, "Campanella 3": 49, "Cyber Owls": 50,
  "General": 51,
};

const FALLBACK_DISK = 1;

export function diskImageSrc(game) {
  return `./graph/disks/${DISK_NUMBERS[game] || FALLBACK_DISK}.png`;
}

// Every real game, so the "all games" view can list ones with no goals this season.
// "General" is excluded: it is the catch-all card square, not a game with a disk slot.
export function playableGames() {
  return Object.keys(DISK_NUMBERS).filter((game) => game !== "General");
}
