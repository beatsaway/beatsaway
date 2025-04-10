// Modify beat-sequencer.js to wrap the initialization code in a DOMContentLoaded event
// This ensures DOM elements are fully loaded before accessing them

// Initialize drum objects and variables once DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize drum objects
    const kick = new KickDrum();
    const bass = new BassDrum();
    const snare = new SnareDrum();
    const hihat = new HiHat();
    const clap = new Clap();

    // Store references to HTML elements
    const beatSelect = document.getElementById('beat-select');
    const playButton = document.getElementById('play');
    const randomizeButton = document.getElementById('randomize');
    const resetSubdivisionsButton = document.getElementById('reset-subdivisions');
    const tempoSlider = document.getElementById('tempo');
    const tempoDisplay = document.querySelector('.tempo-display');
    const currentPattern = document.getElementById('current-pattern');
    const totalBeats = document.getElementById('total-beats');
    const timeSignature = document.getElementById('time-signature');
    const beatViz = document.getElementById('beat-viz');
    const drumPads = document.querySelectorAll('.drum-pad');

    // State variables
    let currentBeat = null;
    let isPlaying = false;
    let tempo = 60; // BPM
    let beatSequence = [];
    let sequenceInterval = null;
    let currentBeatIndex = 0;
    let visualElements = [];
    let originalPattern = ""; // Store the original pattern string
    let patternStructure = []; // Store the current pattern as an array of objects with values and subdivision status
    const REPEAT_COUNT = 4; // Number of times to repeat the pattern
    let repeatPatterns = []; // Array to store each of the 4 pattern iterations

    // All the function definitions remain the same

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

    // Parse a pattern string and store as structured data
    function parsePatternToStructure(patternString) {
        const parts = patternString.split(',').map(part => part.trim());
        const drumTypes = ['kick', 'bass', 'snare', 'hihat', 'clap'];
        
        return parts.map((part, index) => {
            // Parse the fraction
            let value, numerator, denominator;
            
            if (part.includes('/')) {
                [numerator, denominator] = part.split('/').map(Number);
                value = numerator / denominator;
            } else {
                value = parseFloat(part);
                numerator = value;
                denominator = 1;
            }
            
            // Assign a drum type based on the index
            const drumType = drumTypes[index % drumTypes.length];
            
            return {
                original: part,
                value: value,
                numerator: numerator,
                denominator: denominator,
                isSubdivided: false,
                subdivisions: [],
                drumType: drumType // Add drum type to each segment
            };
        });
    }

    // Deep clone an object - for creating independent copies of pattern structures
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Convert the structured pattern to timing in seconds
    function patternToTimings(patternStructures, tempo) {
        const secondsPerBeat = 60 / tempo;
        let timings = [];
        
        // Process all pattern structures (all repetitions)
        patternStructures.forEach(patternStructure => {
            patternStructure.forEach(item => {
                if (item.isSubdivided) {
                    if (item.subdivisions && item.subdivisions.length > 0) {
                        // Use the stored subdivisions to determine timings
                        item.subdivisions.forEach(sub => {
                            timings.push({
                                duration: (sub.numerator / sub.denominator) * secondsPerBeat,
                                drumType: sub.drumType
                            });
                        });
                    } else {
                        // Fallback if subdivisions are not properly defined
                        timings.push({
                            duration: item.value * secondsPerBeat,
                            drumType: item.drumType
                        });
                    }
                } else {
                    // Add the normal timing
                    timings.push({
                        duration: item.value * secondsPerBeat,
                        drumType: item.drumType
                    });
                }
            });
        });
        
        return timings;
    }

    // Set the current beat and update the UI
    function setCurrentBeat(beatName) {
        currentBeat = beatList.find(beat => beat.name === beatName);
        
        if (currentBeat) {
            
            // Store the original pattern
            originalPattern = currentBeat.pattern;
            
            // Parse the pattern to our structured format
            patternStructure = parsePatternToStructure(currentBeat.pattern);
            
            // Create 4 independent copies of the pattern structure
            repeatPatterns = [];
            for (let i = 0; i < REPEAT_COUNT; i++) {
                repeatPatterns.push(deepClone(patternStructure));
            }
            
            // Calculate the timing sequence from all pattern repetitions
            beatSequence = patternToTimings(repeatPatterns, tempo);
            
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
        
        // Process each repetition of the pattern
        repeatPatterns.forEach((patternStructure, repeatIndex) => {
            // Create a container for this repetition
            const repeatDiv = document.createElement('div');
            repeatDiv.className = 'pattern-repeat';
            repeatDiv.style.display = 'flex';
            repeatDiv.style.flexDirection = 'column';
            repeatDiv.style.width = '100%';
            repeatDiv.style.marginBottom = '2px'; // Minimal gap between patterns
            repeatDiv.style.padding = '0'; // No padding
            repeatDiv.style.borderRadius = '4px';
            repeatDiv.style.border = '1px solid #ddd';
            repeatDiv.style.backgroundColor = 'rgba(0,0,0,0.02)';
            
            // Calculate total duration for proportional widths
            const totalDuration = patternStructure.reduce((sum, item) => sum + item.value, 0);
            
            // Create a horizontal layout for the beat segments
            const segmentsRow = document.createElement('div');
            segmentsRow.className = 'segments-row';
            segmentsRow.style.display = 'flex';
            segmentsRow.style.width = '100%';
            
            patternStructure.forEach((item, index) => {
                if (item.isSubdivided && item.subdivisions && item.subdivisions.length > 0) {
                    // Create a container for subdivided beats
                    const container = document.createElement('div');
                    container.className = 'beat-container';
                    container.style.display = 'flex';
                    container.style.flex = String(item.value / totalDuration);
                    
                    // Create segments for each subdivision
                    item.subdivisions.forEach((sub, subIndex) => {
                        const subSegment = document.createElement('div');
                        subSegment.className = 'beat-segment subdivided';
                        
                        // Add drum-specific class for coloring
                        subSegment.classList.add(`beat-${sub.drumType}`);
                        
                        // Add data attributes for identification
                        subSegment.dataset.repeatIndex = repeatIndex;
                        subSegment.dataset.patternIndex = index;
                        
                        // Width is equal within the container
                        subSegment.style.flex = '1';
                        
                        // Show the subdivision representation
                        const durationText = document.createElement('div');
                        durationText.textContent = sub.original;
                        subSegment.appendChild(durationText);
                        
                        // Add drum type indicator
                        const drumIndicator = document.createElement('div');
                        drumIndicator.className = 'drum-indicator';
                        drumIndicator.textContent = sub.drumType.charAt(0).toUpperCase() + sub.drumType.slice(1);
                        subSegment.appendChild(drumIndicator);
                        
                        // Add click handler to toggle back the entire subdivision
                        subSegment.addEventListener('click', () => {
                            toggleSubdivision(repeatIndex, index);
                        });
                        
                        container.appendChild(subSegment);
                        visualElements.push(subSegment);
                    });
                    
                    segmentsRow.appendChild(container);
                } else {
                    // Create a normal segment
                    const segment = document.createElement('div');
                    segment.className = 'beat-segment';
                    
                    // Add data attributes for identification
                    segment.dataset.repeatIndex = repeatIndex;
                    segment.dataset.patternIndex = index;
                    
                    // Add drum-specific class for coloring
                    segment.classList.add(`beat-${item.drumType}`);
                    
                    // Width proportional to the duration
                    segment.style.flex = String(item.value / totalDuration);
                    
                    // Show the fraction representation
                    const durationText = document.createElement('div');
                    durationText.textContent = item.original;
                    segment.appendChild(durationText);
                    
                    // Add drum type indicator
                    const drumIndicator = document.createElement('div');
                    drumIndicator.className = 'drum-indicator';
                    drumIndicator.textContent = item.drumType.charAt(0).toUpperCase() + item.drumType.slice(1);
                    segment.appendChild(drumIndicator);
                    
                    // Add click handler to toggle subdivision
                    segment.addEventListener('click', () => {
                        toggleSubdivision(repeatIndex, index);
                    });
                    
                    segmentsRow.appendChild(segment);
                    visualElements.push(segment);
                }
            });
            
            repeatDiv.appendChild(segmentsRow);
            beatViz.appendChild(repeatDiv);
        });
    }
    // Toggle subdivision for a beat segment
    function toggleSubdivision(repeatIndex, patternIndex) {
      if (isPlaying) {
          stopSequence();
          setTimeout(startSequence, 300); // Brief pause then start
      }
        
        const segment = repeatPatterns[repeatIndex][patternIndex];
        
        // Toggle the subdivision state
        segment.isSubdivided = !segment.isSubdivided;
        
        if (segment.isSubdivided) {
            // Generate subdivisions based on the original segment
            segment.subdivisions = [];
            
            // Ensure the drum type is preserved
            const drumType = segment.drumType;
            
            if (segment.numerator > 1) {
                // Break down into multiple 1/denominator segments
                // Example: 3/8 -> 1/8 + 1/8 + 1/8
                for (let i = 0; i < segment.numerator; i++) {
                    segment.subdivisions.push({
                        numerator: 1,
                        denominator: segment.denominator,
                        value: 1 / segment.denominator,
                        original: `1/${segment.denominator}`,
                        drumType: drumType // Pass the drum type to subdivision
                    });
                }
            } else {
                // Divide by 2 for segments where numerator is 1
                // Example: 1/4 -> 1/8 + 1/8
                segment.subdivisions.push({
                    numerator: 1,
                    denominator: segment.denominator * 2,
                    value: 1 / (segment.denominator * 2),
                    original: `1/${segment.denominator * 2}`,
                    drumType: drumType // Pass the drum type to subdivision
                });
                
                segment.subdivisions.push({
                    numerator: 1,
                    denominator: segment.denominator * 2,
                    value: 1 / (segment.denominator * 2),
                    original: `1/${segment.denominator * 2}`,
                    drumType: drumType // Pass the drum type to subdivision
                });
            }
        } else {
            // Clear subdivisions when toggling off
            segment.subdivisions = [];
        }
        
        // Recalculate beat sequence for all repetitions
        beatSequence = patternToTimings(repeatPatterns, tempo);
        
        // Update visualization
        createBeatVisualization();
        
        // Show feedback to the user
        const feedbackMessage = document.createElement('div');
        feedbackMessage.style.position = 'fixed';
        feedbackMessage.style.top = '10px';
        feedbackMessage.style.left = '50%';
        feedbackMessage.style.transform = 'translateX(-50%)';
        feedbackMessage.style.backgroundColor = 'rgba(0,0,0,0.7)';
        feedbackMessage.style.color = 'white';
        feedbackMessage.style.padding = '10px 20px';
        feedbackMessage.style.borderRadius = '5px';
        feedbackMessage.style.zIndex = '1000';
        
        if (segment.isSubdivided) {
            if (segment.numerator > 1) {
                feedbackMessage.textContent = `Pattern ${repeatIndex + 1}: ${segment.original} subdivided into ${segment.numerator} equal parts (${segment.subdivisions[0].original})`;
            } else {
                feedbackMessage.textContent = `Pattern ${repeatIndex + 1}: ${segment.original} subdivided into 2 equal parts (${segment.subdivisions[0].original})`;
            }
        } else {
            feedbackMessage.textContent = `Pattern ${repeatIndex + 1}: Restored original beat: ${segment.original}`;
        }
        
        document.body.appendChild(feedbackMessage);
        
        // Remove the message after 2 seconds
        setTimeout(() => {
            feedbackMessage.style.opacity = '0';
            feedbackMessage.style.transition = 'opacity 0.5s';
            setTimeout(() => document.body.removeChild(feedbackMessage), 500);
        }, 2000);
    }

    // Play a single note in the sequence
    function playBeat(index) {
        if (!currentBeat || !isPlaying) return;
        
        // Remove active class from all segments
        visualElements.forEach(el => el.classList.remove('active-segment'));
        
        // Highlight current segment
        if (visualElements[index]) {
            visualElements[index].classList.add('active-segment');
            
            // Get the drum type from the beat sequence
            const currentDrum = beatSequence[index].drumType;
            
            // Play the appropriate drum sound
            switch (currentDrum) {
                case 'kick': kick.play(); break;
                case 'bass': bass.play(); break;
                case 'snare': snare.play(); break;
                case 'hihat': hihat.play(); break;
                case 'clap': clap.play(); break;
            }
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
            
            // Get the duration for the current beat
            const currentDuration = beatSequence[currentBeatIndex].duration;
            
            // Move to next beat
            currentBeatIndex = (currentBeatIndex + 1) % beatSequence.length;
            
            // Schedule the next beat
            setTimeout(() => {
                playBeat(currentBeatIndex);
                scheduleNextBeat();
            }, currentDuration * 1000);
        }
        
        // Schedule the second beat with the duration of the first beat
        setTimeout(scheduleNextBeat, beatSequence[currentBeatIndex].duration * 1000);
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
        
        // 33% chance to subdivide each segment
        repeatPatterns.forEach((patternStructure, repeatIndex) => {
            patternStructure.forEach((segment, patternIndex) => {
                // 33% chance (approximately) to subdivide this segment
                if (Math.random() < 0.33) {
                    // Toggle subdivision for this segment
                    segment.isSubdivided = true;
                    
                    // Generate subdivisions based on the original segment
                    segment.subdivisions = [];
                    
                    // Ensure the drum type is preserved
                    const drumType = segment.drumType;
                    
                    if (segment.numerator > 1) {
                        // Break down into multiple 1/denominator segments
                        // Example: 3/8 -> 1/8 + 1/8 + 1/8
                        for (let i = 0; i < segment.numerator; i++) {
                            segment.subdivisions.push({
                                numerator: 1,
                                denominator: segment.denominator,
                                value: 1 / segment.denominator,
                                original: `1/${segment.denominator}`,
                                drumType: drumType
                            });
                        }
                    } else {
                        // Divide by 2 for segments where numerator is 1
                        // Example: 1/4 -> 1/8 + 1/8
                        segment.subdivisions.push({
                            numerator: 1,
                            denominator: segment.denominator * 2,
                            value: 1 / (segment.denominator * 2),
                            original: `1/${segment.denominator * 2}`,
                            drumType: drumType
                        });
                        
                        segment.subdivisions.push({
                            numerator: 1,
                            denominator: segment.denominator * 2,
                            value: 1 / (segment.denominator * 2),
                            original: `1/${segment.denominator * 2}`,
                            drumType: drumType
                        });
                    }
                }
            });
        });
        
        // Recalculate beat sequence with the new subdivisions
        beatSequence = patternToTimings(repeatPatterns, tempo);
        
        // Update visualization
        createBeatVisualization();
        
        // Show feedback to the user
        const feedbackMessage = document.createElement('div');
        feedbackMessage.style.position = 'fixed';
        feedbackMessage.style.top = '10px';
        feedbackMessage.style.left = '50%';
        feedbackMessage.style.transform = 'translateX(-50%)';
        feedbackMessage.style.backgroundColor = 'rgba(0,0,0,0.7)';
        feedbackMessage.style.color = 'white';
        feedbackMessage.style.padding = '10px 20px';
        feedbackMessage.style.borderRadius = '5px';
        feedbackMessage.style.zIndex = '1000';
        feedbackMessage.textContent = 'Random beat selected with random subdivisions';
        
        document.body.appendChild(feedbackMessage);
        
        // Remove the message after 2 seconds
        setTimeout(() => {
            feedbackMessage.style.opacity = '0';
            feedbackMessage.style.transition = 'opacity 0.5s';
            setTimeout(() => document.body.removeChild(feedbackMessage), 500);
        }, 2000);
    }

    // Reset subdivisions button event listener - now resets all pattern repetitions
    function resetSubdivisions() {
        if (isPlaying) {
            stopSequence();
            setTimeout(startSequence, 300); // Brief pause then start
        }
        // Reset all subdivisions to the original pattern
        if (currentBeat) {
            // Create 4 fresh copies of the original pattern
            repeatPatterns = [];
            for (let i = 0; i < REPEAT_COUNT; i++) {
                repeatPatterns.push(parsePatternToStructure(originalPattern));
            }
            
            // Recalculate beat sequence
            beatSequence = patternToTimings(repeatPatterns, tempo);
            
            // Update visualization
            createBeatVisualization();
            
            // Show feedback to the user
            const feedbackMessage = document.createElement('div');
            feedbackMessage.style.position = 'fixed';
            feedbackMessage.style.top = '10px';
            feedbackMessage.style.left = '50%';
            feedbackMessage.style.transform = 'translateX(-50%)';
            feedbackMessage.style.backgroundColor = 'rgba(0,0,0,0.7)';
            feedbackMessage.style.color = 'white';
            feedbackMessage.style.padding = '10px 20px';
            feedbackMessage.style.borderRadius = '5px';
            feedbackMessage.style.zIndex = '1000';
            feedbackMessage.textContent = 'All repetitions reset to original pattern';
            
            document.body.appendChild(feedbackMessage);
            
            // Remove the message after 2 seconds
            setTimeout(() => {
                feedbackMessage.style.opacity = '0';
                feedbackMessage.style.transition = 'opacity 0.5s';
                setTimeout(() => document.body.removeChild(feedbackMessage), 500);
            }, 2000);
        }
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
            beatSequence = patternToTimings(repeatPatterns, tempo);
        }
        
        // If playing, restart the sequence to apply the new tempo
        if (isPlaying) {
            stopSequence();
            setTimeout(startSequence, 300); // Brief pause then start
        }
    });

    // Reset subdivisions button event listener
    resetSubdivisionsButton.addEventListener('click', resetSubdivisions);

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
        
        // Add styles for subdivided beats and drum-specific colors
        const style = document.createElement('style');
        style.textContent = `
            .beat-segment {
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
                padding: 5px;
                text-align: center;
                margin: 1px;
                height: auto;
                min-height: 40px;
                font-size: 12px;
            }
            .beat-segment:hover {
                filter: brightness(1.2);
                transform: translateY(-2px);
            }
            .beat-segment.subdivided {
                border-right: 1px dashed rgba(255,255,255,0.5);
            }
            .beat-segment.subdivided:last-child {
                border-right: none;
            }
            .beat-container {
                display: flex;
                margin: 1px;
                border: 1px dashed #aaa;
                border-radius: 4px;
                overflow: hidden;
            }
            .active-segment {
                transform: scale(0.9);
                box-shadow: 0 0 10px rgba(255, 152, 0, 0.7);
                z-index: 10;
            }
            
            .drum-indicator {
                font-size: 10px;
                margin-top: 2px;
            }
            
            /* Drum-specific colors */
            .beat-kick {
                background: #2196F3;
            }
            .beat-bass {
                background: #9C27B0;
            }
            .beat-snare {
                background: #E91E63;
            }
            .beat-hihat {
                background: #FF9800;
            }
            .beat-clap {
                background: #4CAF50;
            }
            
            /* Subdivided segments get slightly different shades */
            .beat-segment.subdivided.beat-kick {
                background: linear-gradient(to right, #2196F3, #64B5F6);
            }
            .beat-segment.subdivided.beat-bass {
                background: linear-gradient(to right, #9C27B0, #BA68C8);
            }
            .beat-segment.subdivided.beat-snare {
                background: linear-gradient(to right, #E91E63, #F06292);
            }
            .beat-segment.subdivided.beat-hihat {
                background: linear-gradient(to right, #FF9800, #FFB74D);
            }
            .beat-segment.subdivided.beat-clap {
                background: linear-gradient(to right, #4CAF50, #81C784);
            }
            
            /* Drum module color coordination */
            #kick-module .drum-pad {
                background-color: #2196F3;
            }
            #bass-module .drum-pad {
                background-color: #9C27B0;
            }
            #snare-module .drum-pad {
                background-color: #E91E63;
            }
            #hihat-module .drum-pad {
                background-color: #FF9800;
            }
            #clap-module .drum-pad {
                background-color: #4CAF50;
            }
            
            /* Pattern repeat styling */
            .pattern-repeat {
                border: 1px solid #ddd;
                background-color: rgba(0,0,0,0.02);
                border-radius: 4px;
                padding: 8px;
                margin: 4px;
            }
            
            /* Make the visualization area scrollable if needed */
            #beat-viz {
                overflow-x: auto;
                max-width: 100%;
            }
            
            /* For the tempo control - keep BPM and slider on same row */
            .tempo-control {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .tempo-slider-container {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .tempo-display {
                min-width: 80px;
                font-size: 18px;
                font-weight: bold;
            }
            
            #tempo {
                flex: 1;
            }
        `;
        document.head.appendChild(style);
    }

    // Start the app
    init();
});
