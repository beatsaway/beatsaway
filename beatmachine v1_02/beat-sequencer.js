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
    
    // Context menu elements
    const soundContextMenu = document.getElementById('sound-context-menu');
    const soundTypeMenu = document.getElementById('sound-type-menu');
    const paramsMenu = document.getElementById('params-menu');
    
    // Currently selected segment for editing
    let selectedSegment = null;
    let selectedRepeatIndex = null;
    let selectedPatternIndex = null;

    // State variables
    let currentBeat = null;
    let isPlaying = false;
    let tempo = 60; // BPM
    let beatSequence = [];
    let sequenceInterval = null;
    let currentBeatIndex = 0;
    let visualElements = [];
    let originalPattern = ""; // Store the original pattern string
    let patternStructure = []; // Store the current pattern as an array of BeatSegment objects
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

    // Parse a pattern string and store as structured data using BeatSegment objects
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
            
            // Create a new BeatSegment object
            return new BeatSegment(drumType, value, numerator, denominator);
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
                                duration: sub.value * secondsPerBeat,
                                drumType: sub.drumType,
                                soundParams: sub.soundParams
                            });
                        });
                    } else {
                        // Fallback if subdivisions are not properly defined
                        timings.push({
                            duration: item.value * secondsPerBeat,
                            drumType: item.drumType,
                            soundParams: item.soundParams
                        });
                    }
                } else {
                    // Add the normal timing
                    timings.push({
                        duration: item.value * secondsPerBeat,
                        drumType: item.drumType,
                        soundParams: item.soundParams
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
            
            // Parse the pattern to our structured format using BeatSegment objects
            patternStructure = parsePatternToStructure(currentBeat.pattern);
            
            // Create 4 independent copies of the pattern structure
            repeatPatterns = [];
            for (let i = 0; i < REPEAT_COUNT; i++) {
                repeatPatterns.push(patternStructure.map(segment => segment.clone()));
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
                        subSegment.dataset.subIndex = subIndex;
                        
                        // Width is equal within the container
                        subSegment.style.flex = '1';
                        
                        // Show the subdivision representation with 33% opacity
                        const durationText = document.createElement('div');
                        durationText.textContent = sub.getOriginalPattern();
                        durationText.style.opacity = '0.33';
                        subSegment.appendChild(durationText);
                        
                        // Add click handler to toggle back the entire subdivision
                        subSegment.addEventListener('click', () => {
                            toggleSubdivision(repeatIndex, index);
                        });
                        
                        // Add right-click handler for context menu
                        subSegment.addEventListener('contextmenu', (e) => {
                            e.preventDefault();
                            showContextMenu(e, repeatIndex, index, subIndex, true);
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
                    
                    // Show the fraction representation with 33% opacity
                    const durationText = document.createElement('div');
                    durationText.textContent = item.getOriginalPattern();
                    durationText.style.opacity = '0.33';
                    segment.appendChild(durationText);
                    
                    // Add click handler to toggle subdivision
                    segment.addEventListener('click', () => {
                        toggleSubdivision(repeatIndex, index);
                    });
                    
                    // Add right-click handler for context menu
                    segment.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        showContextMenu(e, repeatIndex, index, null, false);
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
        
        // Toggle the subdivision state using the BeatSegment method
        segment.toggleSubdivision();
        
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
                feedbackMessage.textContent = `Pattern ${repeatIndex + 1}: ${segment.getOriginalPattern()} subdivided into ${segment.numerator} equal parts (${segment.subdivisions[0].getOriginalPattern()})`;
            } else {
                feedbackMessage.textContent = `Pattern ${repeatIndex + 1}: ${segment.getOriginalPattern()} subdivided into 2 equal parts (${segment.subdivisions[0].getOriginalPattern()})`;
            }
        } else {
            feedbackMessage.textContent = `Pattern ${repeatIndex + 1}: Restored original beat: ${segment.getOriginalPattern()}`;
        }
        
        document.body.appendChild(feedbackMessage);
        
        // Remove the message after 2 seconds
        setTimeout(() => {
            feedbackMessage.style.opacity = '0';
            feedbackMessage.style.transition = 'opacity 0.5s';
            setTimeout(() => document.body.removeChild(feedbackMessage), 500);
        }, 2000);
    }

    // Show context menu for editing sound parameters
    function showContextMenu(event, repeatIndex, patternIndex, subIndex, isSubdivision) {
        // Store the selected segment information
        selectedRepeatIndex = repeatIndex;
        selectedPatternIndex = patternIndex;
        
        // Get the segment from the pattern structure
        const segment = repeatPatterns[repeatIndex][patternIndex];
        
        if (isSubdivision && segment.subdivisions && segment.subdivisions.length > subIndex) {
            selectedSegment = segment.subdivisions[subIndex];
        } else {
            selectedSegment = segment;
        }
        
        // Get the clicked element (the beat segment)
        const clickedElement = event.target.closest('.beat-segment');
        if (!clickedElement) return;
        
        // Get the bounding rectangle of the clicked element
        const rect = clickedElement.getBoundingClientRect();
        
        // Position the context menu relative to the clicked element
        soundContextMenu.style.position = 'absolute';
        soundContextMenu.style.display = 'block';
        
        // Calculate position to ensure menu stays within viewport
        let left = event.clientX;
        let top = event.clientY;
        
        // Check if menu would go off the right edge of the screen
        if (left + soundContextMenu.offsetWidth > window.innerWidth) {
            left = window.innerWidth - soundContextMenu.offsetWidth - 10;
        }
        
        // Check if menu would go off the bottom edge of the screen
        if (top + soundContextMenu.offsetHeight > window.innerHeight) {
            top = window.innerHeight - soundContextMenu.offsetHeight - 10;
        }
        
        soundContextMenu.style.left = `${left}px`;
        soundContextMenu.style.top = `${top}px`;
        
        // Update the sound type menu to highlight the current sound type
        const soundTypeItems = soundTypeMenu.querySelectorAll('.context-menu-item');
        soundTypeItems.forEach(item => {
            if (item.dataset.sound === selectedSegment.drumType) {
                item.style.backgroundColor = '#e3f2fd';
            } else {
                item.style.backgroundColor = '';
            }
        });
        
        // Update parameter values based on the current segment
        updateParameterValues();
    }
    
    // Update parameter values in the context menu based on the selected segment
    function updateParameterValues() {
        if (!selectedSegment) return;
        
        // Hide all parameter groups first
        const paramGroups = paramsMenu.querySelectorAll('.context-menu-param-group');
        paramGroups.forEach(group => {
            group.style.display = 'none';
        });
        
        // Show the parameter group for the current sound type
        const currentParamGroup = paramsMenu.querySelector(`.context-menu-param-group[data-sound="${selectedSegment.drumType}"]`);
        if (currentParamGroup) {
            currentParamGroup.style.display = 'block';
            
            // Update parameter values based on the sound parameters
            const soundParams = selectedSegment.soundParams;
            
            // Update each parameter input
            for (const [paramName, value] of Object.entries(soundParams)) {
                const inputId = `${selectedSegment.drumType}-${paramName}`;
                const input = document.getElementById(inputId);
                const valueSpan = input?.nextElementSibling;
                
                if (input && valueSpan) {
                    input.value = value;
                    valueSpan.textContent = value;
                }
            }
        }
    }
    
    // Change the sound type of the selected segment
    function changeSoundType(newSoundType) {
        if (!selectedSegment) return;
        
        // Update the drum type
        selectedSegment.drumType = newSoundType;
        
        // Initialize sound parameters for the new sound type
        selectedSegment.initializeSoundParams();
        
        // Update the visualization
        createBeatVisualization();
        
        // Recalculate beat sequence
        beatSequence = patternToTimings(repeatPatterns, tempo);
        
        // Show feedback
        showFeedback(`Sound type changed to ${newSoundType}`);
    }
    
    // Apply parameter changes to the selected segment
    function applyParameters() {
        if (!selectedSegment) return;
        
        // Get the drum module class
        const drumModuleClass = selectedSegment.getDrumModuleClass();
        if (!drumModuleClass || !drumModuleClass.parameterNames) return;

        // Get all parameters for this drum type
        const parameters = drumModuleClass.parameterNames;
        
        // Update each parameter
        for (const [paramName, paramConfig] of Object.entries(parameters)) {
            const inputId = `${selectedSegment.drumType}-${paramName}`;
            const input = document.getElementById(inputId);
            if (input) {
                selectedSegment.soundParams[paramName] = parseFloat(input.value);
            }
        }
        
        // Recalculate beat sequence
        beatSequence = patternToTimings(repeatPatterns, tempo);
        
        // Show feedback
        showFeedback(`Parameters updated for ${selectedSegment.drumType}`);
    }
    
    // Show feedback message to the user
    function showFeedback(message) {
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
        feedbackMessage.textContent = message;
        
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
            
            // Get the drum type and sound parameters from the beat sequence
            const currentDrum = beatSequence[index].drumType;
            const soundParams = beatSequence[index].soundParams;
            
            // Play the appropriate drum sound with its parameters
            switch (currentDrum) {
                case 'kick': 
                    // Apply sound parameters directly to the kick drum object
                    kick.initialFreq = soundParams.initialFreq;
                    kick.freqDecay = soundParams.freqDecay;
                    kick.duration = soundParams.duration;
                    kick.clickLevel = soundParams.clickLevel;
                    kick.clickDuration = soundParams.clickDuration;
                    kick.volume = soundParams.volume || 0.7; // Default volume if not set
                    kick.play(); 
                    break;
                case 'bass': 
                    // Apply sound parameters directly to the bass drum object
                    bass.subFreq = soundParams.subFreq;
                    bass.bodyPunch = soundParams.bodyPunch;
                    bass.bodyDecay = soundParams.bodyDecay;
                    bass.toneLevel = soundParams.toneLevel;
                    bass.toneDecay = soundParams.toneDecay;
                    bass.volume = soundParams.volume || 0.7; // Default volume if not set
                    bass.play(); 
                    break;
                case 'snare': 
                    // Apply sound parameters directly to the snare drum object
                    snare.toneFreq = soundParams.toneFreq;
                    snare.toneDecay = soundParams.toneDecay;
                    snare.noiseLevel = soundParams.noiseLevel;
                    snare.noiseDecay = soundParams.noiseDecay;
                    snare.duration = soundParams.duration;
                    snare.volume = soundParams.volume || 0.6; // Default volume if not set
                    snare.play(); 
                    break;
                case 'hihat': 
                    // Apply sound parameters directly to the hi-hat object
                    hihat.freq1 = soundParams.freq1;
                    hihat.freq2 = soundParams.freq2;
                    hihat.duration = soundParams.duration;
                    hihat.release = soundParams.release;
                    hihat.filterFreq = soundParams.filterFreq;
                    hihat.filterQ = soundParams.filterQ;
                    hihat.volume = soundParams.volume || 0.5; // Default volume if not set
                    hihat.play(); 
                    break;
                case 'clap': 
                    // Apply sound parameters directly to the clap object
                    clap.spacing = soundParams.spacing;
                    clap.decay = soundParams.decay;
                    clap.reverbDecay = soundParams.reverbDecay;
                    clap.filterFreq = soundParams.filterFreq;
                    clap.filterQ = soundParams.filterQ;
                    clap.volume = soundParams.volume || 0.6; // Default volume if not set
                    clap.play(); 
                    break;
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
        
        // Track changes for feedback message
        let subdivisionChanges = 0;
        let soundTypeChanges = 0;
        let parameterChanges = 0;
        
        // Process each pattern repetition
        repeatPatterns.forEach((patternStructure, repeatIndex) => {
            patternStructure.forEach((segment, patternIndex) => {
                // 33% chance to subdivide this segment
                if (Math.random() < 0.33) {
                    // Toggle subdivision for this segment
                    segment.toggleSubdivision();
                    subdivisionChanges++;
                    
                    // If subdivided, also randomize the subdivisions
                    if (segment.isSubdivided && segment.subdivisions) {
                        segment.subdivisions.forEach(sub => {
                            // 22% chance to change sound type for each subdivision
                            if (Math.random() < 0.22) {
                                const drumTypes = ['kick', 'bass', 'snare', 'hihat', 'clap'];
                                const newDrumType = drumTypes[Math.floor(Math.random() * drumTypes.length)];
                                
                                // Only change if it's a different type
                                if (sub.drumType !== newDrumType) {
                                    sub.drumType = newDrumType;
                                    sub.initializeSoundParams();
                                    soundTypeChanges++;
                                    
                                    // Randomize parameters with 22% chance
                                    if (Math.random() < 0.22) {
                                        randomizeParameters(sub);
                                        parameterChanges++;
                                    }
                                }
                            }
                        });
                    }
                }
                
                // 22% chance to change sound type for non-subdivided segments
                if (!segment.isSubdivided && Math.random() < 0.22) {
                    const drumTypes = ['kick', 'bass', 'snare', 'hihat', 'clap'];
                    const newDrumType = drumTypes[Math.floor(Math.random() * drumTypes.length)];
                    
                    // Only change if it's a different type
                    if (segment.drumType !== newDrumType) {
                        segment.drumType = newDrumType;
                        segment.initializeSoundParams();
                        soundTypeChanges++;
                        
                        // Randomize parameters with 22% chance
                        if (Math.random() < 0.22) {
                            randomizeParameters(segment);
                            parameterChanges++;
                        }
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
        
        // Create detailed feedback message
        let message = 'Random beat selected';
        if (subdivisionChanges > 0) {
            message += ` with ${subdivisionChanges} subdivisions`;
        }
        if (soundTypeChanges > 0) {
            message += `, ${soundTypeChanges} sound type changes`;
        }
        if (parameterChanges > 0) {
            message += `, and ${parameterChanges} parameter randomizations`;
        }
        
        feedbackMessage.textContent = message;
        
        document.body.appendChild(feedbackMessage);
        
        // Remove the message after 2 seconds
        setTimeout(() => {
            feedbackMessage.style.opacity = '0';
            feedbackMessage.style.transition = 'opacity 0.5s';
            setTimeout(() => document.body.removeChild(feedbackMessage), 500);
        }, 2000);
    }

    // Helper function to randomize parameters for a segment
    function randomizeParameters(segment) {
        const soundParams = segment.soundParams;
        
        switch (segment.drumType) {
            case 'kick':
                soundParams.initialFreq = 20 + Math.random() * 180; // 20-200
                soundParams.freqDecay = 0.1 + Math.random() * 1.9; // 0.1-2
                soundParams.duration = 0.1 + Math.random() * 0.9; // 0.1-1
                break;
            case 'bass':
                soundParams.subFreq = 20 + Math.random() * 80; // 20-100
                soundParams.subDecay = 0.1 + Math.random() * 1.9; // 0.1-2
                soundParams.duration = 0.1 + Math.random() * 0.9; // 0.1-1
                break;
            case 'snare':
                soundParams.noiseLevel = Math.random(); // 0-1
                soundParams.oscLevel = Math.random(); // 0-1
                soundParams.oscFreq = 100 + Math.random() * 900; // 100-1000
                soundParams.duration = 0.1 + Math.random() * 0.9; // 0.1-1
                break;
            case 'hihat':
                soundParams.freq1 = 1000 + Math.random() * 7000; // 1000-8000
                soundParams.freq2 = 1000 + Math.random() * 7000; // 1000-8000
                soundParams.duration = 0.05 + Math.random() * 0.45; // 0.05-0.5
                soundParams.release = 0.01 + Math.random() * 0.49; // 0.01-0.5
                soundParams.filterFreq = 1000 + Math.random() * 9000; // 1000-10000
                soundParams.filterQ = 0.1 + Math.random() * 9.9; // 0.1-10
                soundParams.volume = Math.random(); // 0-1
                break;
            case 'clap':
                soundParams.spacing = 0.01 + Math.random() * 0.09; // 0.01-0.1
                soundParams.decay = 0.1 + Math.random() * 1.9; // 0.1-2
                soundParams.reverbDecay = 0.1 + Math.random() * 1.9; // 0.1-2
                soundParams.filterFreq = 100 + Math.random() * 1900; // 100-2000
                soundParams.filterQ = 0.1 + Math.random() * 9.9; // 0.1-10
                soundParams.volume = Math.random(); // 0-1
                break;
        }
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
        tempoDisplay.textContent = `${tempo * 2} BPM`; // Display double the actual BPM
        
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
    
    // Context menu event listeners
    document.addEventListener('click', (e) => {
        // Hide context menus when clicking outside
        if (!e.target.closest('.context-menu') && !e.target.closest('.beat-segment')) {
            soundContextMenu.style.display = 'none';
            soundTypeMenu.style.display = 'none';
            paramsMenu.style.display = 'none';
        }
    });
    
    // Add event listener to handle window resize
    window.addEventListener('resize', () => {
        // Hide menus on window resize to prevent positioning issues
        soundContextMenu.style.display = 'none';
        soundTypeMenu.style.display = 'none';
        paramsMenu.style.display = 'none';
    });
    
    // Sound context menu items
    soundContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = item.dataset.action;
            
            if (action === 'change-sound') {
                // Show sound type menu
                soundTypeMenu.style.display = 'block';
                
                // Position the sound type menu next to the main menu
                const mainMenuRect = soundContextMenu.getBoundingClientRect();
                soundTypeMenu.style.position = 'absolute';
                soundTypeMenu.style.left = `${mainMenuRect.right}px`;
                soundTypeMenu.style.top = `${mainMenuRect.top}px`;
                
                // Hide params menu if visible
                paramsMenu.style.display = 'none';
            } else if (action === 'edit-params') {
                // Show params menu
                paramsMenu.style.display = 'block';
                
                // Position the params menu next to the main menu
                const mainMenuRect = soundContextMenu.getBoundingClientRect();
                paramsMenu.style.position = 'absolute';
                paramsMenu.style.left = `${mainMenuRect.right}px`;
                paramsMenu.style.top = `${mainMenuRect.top}px`;
                
                // Hide sound type menu if visible
                soundTypeMenu.style.display = 'none';
            }
        });
    });
    
    // Sound type menu items
    soundTypeMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const newSoundType = item.dataset.sound;
            changeSoundType(newSoundType);
            
            // Hide menus
            soundContextMenu.style.display = 'none';
            soundTypeMenu.style.display = 'none';
        });
    });
    
    // Apply parameters button
    paramsMenu.querySelector('.context-menu-item[data-action="apply-params"]').addEventListener('click', () => {
        applyParameters();
        
        // Hide menus
        soundContextMenu.style.display = 'none';
        paramsMenu.style.display = 'none';
    });
    
    // Update parameter value displays when sliders change
    paramsMenu.querySelectorAll('input[type="range"]').forEach(input => {
        input.addEventListener('input', () => {
            const valueDisplay = input.nextElementSibling;
            valueDisplay.textContent = input.value;
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