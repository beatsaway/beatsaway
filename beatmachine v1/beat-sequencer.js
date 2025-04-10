// Initialize drum objects
const kick = new KickDrum();
const bass = new BassDrum();
const snare = new SnareDrum();
const hihat = new HiHat();
const clap = new Clap();

// Store references to HTML elements
const beatSelect = document.getElementById('beat-select');
const playButton = document.getElementById('play');
const stopButton = document.getElementById('stop');
const randomizeButton = document.getElementById('randomize');
const tempoSlider = document.getElementById('tempo');
const tempoDisplay = document.querySelector('.tempo-display');
const currentBeatName = document.getElementById('current-beat-name');
const currentPattern = document.getElementById('current-pattern');
const totalBeats = document.getElementById('total-beats');
const timeSignature = document.getElementById('time-signature');
const beatViz = document.getElementById('beat-viz');
const drumPads = document.querySelectorAll('.drum-pad');

// State variables
let currentBeat = null;
let isPlaying = false;
let tempo = 120; // BPM
let beatSequence = [];
let sequenceInterval = null;
let currentBeatIndex = 0;
let visualElements = [];

// Populate the beat select dropdown
function populateBeatSelect() {
    // Create option groups by total beats (which represents time signature)
    const beatsByTotalBeats = {};
    
    beatList.forEach(beat => {
        const totalBeatsKey = beat.totalBeats;
        if (!beatsByTotalBeats[totalBeatsKey]) {
            beatsByTotalBeats[totalBeatsKey] = [];
        }
        beatsByTotalBeats[totalBeatsKey].push(beat);
    });
    
    // Sort the keys numerically
    const sortedTotalBeats = Object.keys(beatsByTotalBeats).sort((a, b) => parseFloat(a) - parseFloat(b));
    
    // Create option groups and add options
    sortedTotalBeats.forEach(totalBeats => {
        const optGroup = document.createElement('optgroup');
        let timeSignatureLabel;
        
        // Determine time signature based on total beats
        switch(parseFloat(totalBeats)) {
            case 2: timeSignatureLabel = '2/4'; break;
            case 3: timeSignatureLabel = '3/4'; break;
            case 4: timeSignatureLabel = '4/4'; break;
            case 4.5: timeSignatureLabel = '9/8'; break;
            case 5: timeSignatureLabel = '5/4'; break;
            case 7: timeSignatureLabel = '7/4'; break;
            default: timeSignatureLabel = totalBeats + ' beats';
        }
        
        optGroup.label = timeSignatureLabel;
        
        // Sort beats alphabetically within each group
        const sortedBeats = beatsByTotalBeats[totalBeats].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedBeats.forEach(beat => {
            const option = document.createElement('option');
            option.value = beat.name;
            option.textContent = beat.name;
            optGroup.appendChild(option);
        });
        
        beatSelect.appendChild(optGroup);
    });
}

// Convert a beat pattern string to an array of durations in seconds
function parsePattern(patternString, tempo) {
    // Split the pattern by commas and trim whitespace
    const parts = patternString.split(',').map(part => part.trim());
    const secondsPerBeat = 60 / tempo;
    
    return parts.map(part => {
        // Parse fractions like "1/4", "1/8", "3/8" etc.
        if (part.includes('/')) {
            const [numerator, denominator] = part.split('/').map(Number);
            return (numerator / denominator) * secondsPerBeat;
        } else {
            // Whole numbers like "1" (representing whole notes)
            return parseFloat(part) * secondsPerBeat;
        }
    });
}

// Set the current beat and update the UI
function setCurrentBeat(beatName) {
    currentBeat = beatList.find(beat => beat.name === beatName);
    
    if (currentBeat) {
        currentBeatName.textContent = currentBeat.name;
        currentPattern.textContent = currentBeat.pattern;
        totalBeats.textContent = currentBeat.totalBeats;
        
        // Determine time signature based on total beats
        let timeSignatureText;
        switch(currentBeat.totalBeats) {
            case 2: timeSignatureText = '2/4'; break;
            case 3: timeSignatureText = '3/4'; break;
            case 4: timeSignatureText = '4/4'; break;
            case 4.5: timeSignatureText = '9/8'; break;
            case 5: timeSignatureText = '5/4'; break;
            case 7: timeSignatureText = '7/4'; break;
            default: timeSignatureText = currentBeat.totalBeats + ' beats';
        }
        
        timeSignature.textContent = timeSignatureText;
        
        // Parse the pattern and set up the sequence
        beatSequence = parsePattern(currentBeat.pattern, tempo);
        
        // Create beat visualization
        createBeatVisualization();
    }
}

// Create visual representation of the beat
function createBeatVisualization() {
    // Clear existing visualization
    beatViz.innerHTML = '';
    visualElements = [];
    
    if (!currentBeat) return;
    
    const totalDuration = beatSequence.reduce((sum, duration) => sum + duration, 0);
    const drumTypes = ['kick', 'bass', 'snare', 'hihat', 'clap'];
    
    beatSequence.forEach((duration, index) => {
        const segment = document.createElement('div');
        segment.className = 'beat-segment';
        
        // Add drum-specific class for coloring
        const drumIndex = index % 5;
        const drumType = drumTypes[drumIndex];
        segment.classList.add(`beat-${drumType}`);
        
        // Width proportional to the duration (with minimum width)
        const widthPercentage = Math.max(5, (duration / totalDuration) * 80);
        segment.style.width = `${widthPercentage}%`;
        
        // Show the fraction representation
        const parts = currentBeat.pattern.split(',');
        const durationText = document.createElement('div');
        durationText.textContent = parts[index].trim();
        segment.appendChild(durationText);
        
        // Add drum type indicator
        const drumIndicator = document.createElement('div');
        drumIndicator.className = 'drum-indicator';
        drumIndicator.textContent = drumType.charAt(0).toUpperCase() + drumType.slice(1);
        segment.appendChild(drumIndicator);
        
        beatViz.appendChild(segment);
        visualElements.push(segment);
    });
}

// Play a single note in the sequence
function playBeat(index) {
    if (!currentBeat || !isPlaying) return;
    
    // Remove active class from all segments
    visualElements.forEach(el => el.classList.remove('active-segment'));
    
    // Highlight current segment
    if (visualElements[index]) {
        visualElements[index].classList.add('active-segment');
    }
    
    // The drum type is determined by the index
    // This matches the visualization's color coding
    const drumIndex = index % 5;
    const drumTypes = ['kick', 'bass', 'snare', 'hihat', 'clap'];
    const currentDrum = drumTypes[drumIndex];
    
    // Play the appropriate drum sound
    switch (currentDrum) {
        case 'kick': kick.play(); break;
        case 'bass': bass.play(); break;
        case 'snare': snare.play(); break;
        case 'hihat': hihat.play(); break;
        case 'clap': clap.play(); break;
    }
}

// Start playing the beat sequence
function startSequence() {
    if (!currentBeat || beatSequence.length === 0) return;
    
    isPlaying = true;
    currentBeatIndex = 0;
    playButton.textContent = 'Playing...';
    
    // Play first beat immediately
    playBeat(currentBeatIndex);
    
    // Schedule the rest of the sequence
    function scheduleNextBeat() {
        if (!isPlaying) return;
        
        // Move to next beat
        currentBeatIndex = (currentBeatIndex + 1) % beatSequence.length;
        
        // Play the beat
        playBeat(currentBeatIndex);
        
        // Schedule the next beat
        setTimeout(scheduleNextBeat, beatSequence[currentBeatIndex] * 1000);
    }
    
    // Schedule the second beat (first one was played immediately)
    setTimeout(scheduleNextBeat, beatSequence[currentBeatIndex] * 1000);
}

// Stop the sequence
function stopSequence() {
    isPlaying = false;
    playButton.textContent = 'Play Beat';
    
    // Clear any active beat visualization
    visualElements.forEach(el => el.classList.remove('active-segment'));
}

// Select a random beat
function selectRandomBeat() {
    const randomIndex = Math.floor(Math.random() * beatList.length);
    const randomBeat = beatList[randomIndex];
    
    beatSelect.value = randomBeat.name;
    setCurrentBeat(randomBeat.name);
}

// Event listeners
beatSelect.addEventListener('change', () => {
    if (beatSelect.value) {
        setCurrentBeat(beatSelect.value);
    }
});

playButton.addEventListener('click', () => {
    if (isPlaying) {
        stopSequence();
    } else {
        if (!currentBeat) {
            if (beatSelect.value) {
                setCurrentBeat(beatSelect.value);
            } else {
                selectRandomBeat(); // Select a random beat if none is selected
            }
        }
        startSequence();
    }
});

stopButton.addEventListener('click', stopSequence);

randomizeButton.addEventListener('click', () => {
    selectRandomBeat();
    if (isPlaying) {
        stopSequence();
        setTimeout(startSequence, 300); // Brief pause then start
    }
});

tempoSlider.addEventListener('input', () => {
    tempo = parseInt(tempoSlider.value);
    tempoDisplay.textContent = `${tempo} BPM`;
    
    // Update the timing for the current pattern
    if (currentBeat) {
        beatSequence = parsePattern(currentBeat.pattern, tempo);
    }
    
    // If playing, restart the sequence to apply the new tempo
    if (isPlaying) {
        stopSequence();
        setTimeout(startSequence, 300); // Brief pause then start
    }
});

// Make each drum pad playable individually
drumPads.forEach(pad => {
    pad.addEventListener('click', () => {
        const drumType = pad.getAttribute('data-drum');
        switch (drumType) {
            case 'kick': kick.play(); break;
            case 'bass': bass.play(); break;
            case 'snare': snare.play(); break;
            case 'hihat': hihat.play(); break;
            case 'clap': clap.play(); break;
        }
    });
});

// Initialize the app
function init() {
    populateBeatSelect();
}

init();