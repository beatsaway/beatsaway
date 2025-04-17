const ChordDurations = ["1/4", "1/2", "3/4", "1", "1/8", "3/8", "3/16", "1/16", "1/6", "1/12", "1/3", "1/3", "1/6"];

const beatList = [
  // 4/4 Beat Patterns (total = 4 beats)
  { name: "Standard 4/4", pattern: "1/4, 1/4, 1/4, 1/4", totalBeats: 4 },
  { name: "Half notes", pattern: "1/2, 1/2", totalBeats: 4 },
  { name: "Whole note", pattern: "1", totalBeats: 4 },
  { name: "Quarter-Half-Quarter", pattern: "1/4, 1/2, 1/4", totalBeats: 4 },
  { name: "Syncopated 4/4", pattern: "3/8, 1/8, 1/4, 1/4", totalBeats: 4 },
  { name: "Two-One-One", pattern: "1/2, 1/4, 1/4", totalBeats: 4 },
  { name: "One-Two-One", pattern: "1/4, 1/2, 1/4", totalBeats: 4 },
  { name: "One-One-Two", pattern: "1/4, 1/4, 1/2", totalBeats: 4 },
  { name: "Dotted Quarter-Eighth-Half", pattern: "3/8, 1/8, 1/2", totalBeats: 4 },
  { name: "Half-Quarter-Quarter", pattern: "1/2, 1/4, 1/4", totalBeats: 4 },
  { name: "Quarter-Quarter-Half", pattern: "1/4, 1/4, 1/2", totalBeats: 4 },
  { name: "Eighth note pattern", pattern: "1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8", totalBeats: 4 },
  { name: "Syncopated eighths", pattern: "1/8, 1/8, 1/4, 1/8, 1/8, 1/4", totalBeats: 4 },
  { name: "Dotted rhythm", pattern: "3/8, 1/8, 3/8, 1/8", totalBeats: 4 },
  { name: "Quarter-Eighth-Eighth-Half", pattern: "1/4, 1/8, 1/8, 1/2", totalBeats: 4 },
  { name: "Rock ballad", pattern: "1/4, 1/4, 1/4, 1/8, 1/8", totalBeats: 4 },
  { name: "Jazz comp 1", pattern: "3/8, 1/8, 1/4, 1/8, 1/8", totalBeats: 4 },
  { name: "Jazz comp 2", pattern: "3/16, 3/16, 1/8, 1/4, 1/4", totalBeats: 4 },
  { name: "Funk stab", pattern: "1/16, 1/16, 1/8, 1/4, 1/2", totalBeats: 4 },
  { name: "R&B groove", pattern: "1/4, 1/8, 1/8, 1/8, 1/8, 1/4", totalBeats: 4 },
  { name: "Hip hop beat", pattern: "3/8, 1/8, 1/8, 1/8, 1/8, 1/8", totalBeats: 4 },
  { name: "Pop syncopation", pattern: "3/16, 3/16, 1/8, 1/8, 1/8, 1/4", totalBeats: 4 },
  { name: "Quarter triplets", pattern: "1/3, 1/3, 1/3", totalBeats: 4 },
  { name: "Eighth triplets", pattern: "1/6, 1/6, 1/6, 1/6, 1/6, 1/6", totalBeats: 4 },
  { name: "Mixed triplet feel", pattern: "1/3, 1/6, 1/6, 1/6, 1/6", totalBeats: 4 },
  { name: "Swing pattern", pattern: "1/6, 1/12, 1/6, 1/12, 1/6, 1/12, 1/6, 1/12", totalBeats: 4 },
  { name: "Half-bar swing", pattern: "1/3, 1/6, 1/3, 1/6", totalBeats: 4 },
  { name: "Tresillo rhythm", pattern: "3/8, 1/4, 3/8", totalBeats: 4 },
  { name: "Neo-soul pattern", pattern: "1/12, 1/6, 1/4, 1/4, 1/4", totalBeats: 4 },
  { name: "Drum & Bass", pattern: "1/8, 1/4, 1/8, 3/16, 3/16, 1/8", totalBeats: 4 },
  
  // 3/4 Beat Patterns (total = 3 beats)
  { name: "Standard 3/4", pattern: "1/4, 1/4, 1/4", totalBeats: 3 },
  { name: "Waltz basic", pattern: "1/4, 1/4, 1/4", totalBeats: 3 },
  { name: "Dotted half", pattern: "3/4", totalBeats: 3 },
  { name: "Half-Quarter", pattern: "1/2, 1/4", totalBeats: 3 },
  { name: "Quarter-Half", pattern: "1/4, 1/2", totalBeats: 3 },
  { name: "Minuet rhythm", pattern: "3/8, 1/8, 1/4", totalBeats: 3 },
  { name: "Mazurka pattern", pattern: "1/4, 1/8, 1/8, 1/4", totalBeats: 3 },
  { name: "Syncopated 3/4", pattern: "3/16, 3/16, 3/16, 3/16", totalBeats: 3 },
  { name: "Jazz waltz 1", pattern: "3/8, 1/8, 1/4", totalBeats: 3 },
  { name: "Jazz waltz 2", pattern: "1/8, 1/8, 1/4, 1/4", totalBeats: 3 },
  { name: "Eighth note waltz", pattern: "1/8, 1/8, 1/8, 1/8, 1/8, 1/8", totalBeats: 3 },
  { name: "Dotted quarter rhythm", pattern: "3/8, 1/8, 1/8, 1/8", totalBeats: 3 },
  { name: "Viennese waltz", pattern: "1/8, 1/8, 1/4, 1/4", totalBeats: 3 },
  { name: "Contemporary 3/4", pattern: "3/16, 3/16, 3/16, 3/16", totalBeats: 3 },
  { name: "Triplet feel 3/4", pattern: "1/4, 1/6, 1/6, 1/6", totalBeats: 3 },
  { name: "Swing waltz", pattern: "1/6, 1/12, 1/6, 1/12, 1/6, 1/12", totalBeats: 3 },
  { name: "Latin 3/4", pattern: "1/8, 1/4, 1/8, 1/4", totalBeats: 3 },
  { name: "Neo waltz", pattern: "3/8, 3/16, 3/16", totalBeats: 3 },
  { name: "Quarter triplets 3/4", pattern: "1/4, 1/4, 1/4", totalBeats: 3 },
  { name: "Eighth triplets 3/4", pattern: "1/8, 1/8, 1/8, 1/8, 1/8, 1/8", totalBeats: 3 },
  
  // 6/8 Beat Patterns (interpreted as 2 groups of 3/8, total = 6/8 or 3 quarter notes)
  { name: "Standard 6/8", pattern: "3/8, 3/8", totalBeats: 3 },
  { name: "Compound duple", pattern: "3/8, 3/8", totalBeats: 3 },
  { name: "Jig pattern", pattern: "1/8, 1/8, 1/8, 1/8, 1/8, 1/8", totalBeats: 3 },
  { name: "Irish jig", pattern: "3/16, 1/16, 1/8, 3/16, 1/16, 1/8", totalBeats: 3 },
  { name: "Siciliana rhythm", pattern: "3/16, 1/16, 1/8, 3/16, 1/16, 1/8", totalBeats: 3 },
  { name: "Tarantella", pattern: "1/8, 1/8, 1/8, 1/8, 1/8, 1/8", totalBeats: 3 },
  { name: "Compound 6/8", pattern: "1/4, 1/8, 1/4, 1/8", totalBeats: 3 },
  { name: "Dotted 6/8", pattern: "3/16, 3/16, 3/16, 3/16", totalBeats: 3 },
  { name: "Modern 6/8", pattern: "1/4, 1/8, 1/8, 1/4", totalBeats: 3 },
  { name: "12/8 feel", pattern: "1/8, 1/16, 1/16, 1/8, 1/8, 1/16, 1/16, 1/8", totalBeats: 3 },
  
  // 5/4 Beat Patterns (total = 5 beats)
  { name: "Standard 5/4", pattern: "1/2, 3/4", totalBeats: 5 },
  { name: "Brubeck pattern", pattern: "3/4, 1/2", totalBeats: 5 },
  { name: "Mixed 5/4", pattern: "1/4, 1/4, 1/4, 1/2", totalBeats: 5 },
  { name: "Mission Impossible", pattern: "1/4, 1/4, 1/4, 1/4, 1/4", totalBeats: 5 },
  { name: "Contemporary 5/4", pattern: "1/2, 3/8, 3/8", totalBeats: 5 },
  { name: "Progressive 5/4", pattern: "3/8, 3/8, 1/2", totalBeats: 5 },
  { name: "Jazz 5/4", pattern: "1/4, 1/4, 3/8, 3/8", totalBeats: 5 },
  { name: "Balkan 5/4", pattern: "1/2, 1/4, 1/2", totalBeats: 5 },
  { name: "Modern quintet", pattern: "1/4, 3/8, 1/4, 3/8", totalBeats: 5 },
  { name: "Quintuple swing", pattern: "1/3, 1/3, 1/3, 1/4", totalBeats: 5 },
  
  // 7/4 Beat Patterns (total = 7 beats)
  { name: "Standard 7/4", pattern: "1, 3/4", totalBeats: 7 },
  { name: "Prog rock 7/4", pattern: "3/4, 1", totalBeats: 7 },
  { name: "Mixed 7/4", pattern: "1/2, 1/2, 3/4", totalBeats: 7 },
  { name: "Pink Floyd pattern", pattern: "1/4, 1/4, 1/4, 1/4, 1/4, 1/4, 1/4", totalBeats: 7 },
  { name: "Balkan 7/4", pattern: "3/4, 1/2, 1/2", totalBeats: 7 },
  { name: "Septuple jazz", pattern: "1/2, 1/2, 3/8, 3/8", totalBeats: 7 },
  { name: "Contemporary 7/4", pattern: "3/8, 3/8, 1/2, 1/2", totalBeats: 7 },
  { name: "Metal 7/4", pattern: "1/4, 1/4, 1/4, 1/2, 1/2", totalBeats: 7 },
  { name: "Greek 7/4", pattern: "1/2, 1/2, 3/4", totalBeats: 7 },
  { name: "Modern seven", pattern: "3/8, 3/8, 1/4, 3/8, 3/8", totalBeats: 7 },
  
  // 9/8 Beat Patterns (interpreted as 3 groups of 3/8, total = 9/8 or 4.5 quarter notes, rounding to 4.5)
  { name: "Standard 9/8", pattern: "3/8, 3/8, 3/8", totalBeats: 4.5 },
  { name: "Blue Rondo pattern", pattern: "1/4, 1/4, 5/8", totalBeats: 4.5 },
  { name: "Greek 9/8", pattern: "1/2, 1/2, 1/8", totalBeats: 4.5 },
  { name: "Compound 9/8", pattern: "1/4, 1/4, 1/4, 3/8", totalBeats: 4.5 },
  { name: "Contemporary 9/8", pattern: "3/16, 3/16, 3/8, 3/8", totalBeats: 4.5 },
  
  // 2/4 Beat Patterns (total = 2 beats)
  { name: "Standard 2/4", pattern: "1/4, 1/4", totalBeats: 2 },
  { name: "Polka rhythm", pattern: "1/8, 1/8, 1/4", totalBeats: 2 },
  { name: "Half note 2/4", pattern: "1/2", totalBeats: 2 },
  { name: "March pattern", pattern: "1/8, 1/8, 1/8, 1/8", totalBeats: 2 },
  { name: "Dotted 2/4", pattern: "3/8, 1/8", totalBeats: 2 },
  { name: "Syncopated 2/4", pattern: "3/16, 1/16, 1/8, 1/8", totalBeats: 2 },
  { name: "Folk 2/4", pattern: "1/8, 1/4, 1/8", totalBeats: 2 },
  { name: "Contemporary 2/4", pattern: "1/8, 1/8, 1/8, 1/8", totalBeats: 2 },
  { name: "Jazz 2/4", pattern: "1/6, 1/12, 1/6, 1/12", totalBeats: 2 },
  { name: "Modern duple", pattern: "3/16, 1/8, 3/16", totalBeats: 2 }
];

// Make beatList available globally
window.beatList = beatList;

// Beat groupings for organization (optional - available for potential future use)
const beatGroupings = {
  "standard_4beats": [
    "Standard 4/4", "Half notes", "Whole note", "Quarter-Half-Quarter", "Syncopated 4/4", 
    "Two-One-One", "One-Two-One", "One-One-Two", "Dotted Quarter-Eighth-Half", 
    "Half-Quarter-Quarter", "Quarter-Quarter-Half"
  ],
  "complex_4beats": [
    "Eighth note pattern", "Syncopated eighths", "Dotted rhythm", 
    "Quarter-Eighth-Eighth-Half", "Rock ballad", "Jazz comp 1", "Jazz comp 2", 
    "Funk stab", "R&B groove", "Hip hop beat", "Pop syncopation"
  ],
  "triplet_4beats": [
    "Quarter triplets", "Eighth triplets", "Mixed triplet feel", 
    "Swing pattern", "Half-bar swing", "Tresillo rhythm", "Neo-soul pattern", "Drum & Bass"
  ],
  "waltz_3beats": [
    "Standard 3/4", "Waltz basic", "Dotted half", "Half-Quarter", "Quarter-Half", 
    "Minuet rhythm", "Mazurka pattern", "Syncopated 3/4"
  ],
  "jazz_waltz_3beats": [
    "Jazz waltz 1", "Jazz waltz 2", "Eighth note waltz", "Dotted quarter rhythm", 
    "Viennese waltz", "Contemporary 3/4", "Triplet feel 3/4", "Swing waltz", 
    "Latin 3/4", "Neo waltz"
  ],
  "compound_6_8": [
    "Standard 6/8", "Compound duple", "Jig pattern", "Irish jig", "Siciliana rhythm", 
    "Tarantella", "Compound 6/8", "Dotted 6/8", "Modern 6/8", "12/8 feel"
  ],
  "odd_meters_5_7": [
    "Standard 5/4", "Brubeck pattern", "Mixed 5/4", "Mission Impossible", "Contemporary 5/4", 
    "Progressive 5/4", "Jazz 5/4", "Balkan 5/4", "Modern quintet", "Quintuple swing",
    "Standard 7/4", "Prog rock 7/4", "Mixed 7/4", "Pink Floyd pattern", "Balkan 7/4", 
    "Septuple jazz", "Contemporary 7/4", "Metal 7/4", "Greek 7/4", "Modern seven"
  ],
  "compound_9_8": [
    "Standard 9/8", "Blue Rondo pattern", "Greek 9/8", "Compound 9/8", "Contemporary 9/8"
  ],
  "simple_duple_2_4": [
    "Standard 2/4", "Polka rhythm", "Half note 2/4", "March pattern", "Dotted 2/4", 
    "Syncopated 2/4", "Folk 2/4", "Contemporary 2/4", "Jazz 2/4", "Modern duple"
  ]
};

// Make beatGroupings available globally
window.beatGroupings = beatGroupings;