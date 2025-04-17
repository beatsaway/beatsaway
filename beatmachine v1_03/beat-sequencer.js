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
    let isMastersoundEnabled = false;
    let tempo = 60; // BPM
    let beatSequence = [];
    let sequenceInterval = null;
    let currentBeatIndex = 0;
    let visualElements = [];
    let originalPattern = ""; // Store the original pattern string
    let patternStructure = []; // Store the current pattern as an array of BeatSegment objects
    const REPEAT_COUNT = 4; // Number of times to repeat the pattern
    let repeatPatterns = []; // Array to store each of the 4 pattern iterations

    // Load sound presets
    function loadSoundPreset(drumType, presetIndex = 0) {
        if (!window.soundPresets || !window.soundPresets[drumType]) {
            console.warn(`No presets found for ${drumType}`);
            return {};
        }
        
        const presets = window.soundPresets[drumType];
        if (presetIndex >= presets.length) {
            console.warn(`Preset index ${presetIndex} out of range for ${drumType}`);
            return {};
        }
        
        return presets[presetIndex].params;
    }

    // Populate the beat select dropdown
    function populateBeatSelect() {
        // Ensure beatList exists
        if (!window.beatList) {
            console.warn('beatList not found. Using empty beat list.');
            window.beatList = [];
        }
        
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
            repeatDiv.style.marginBottom = '2px';
            repeatDiv.style.padding = '0';
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
                        subSegment.classList.add(`beat-${sub.drumType}`);
                        subSegment.dataset.repeatIndex = repeatIndex;
                        subSegment.dataset.patternIndex = index;
                        subSegment.dataset.subIndex = subIndex;
                        subSegment.style.flex = '1';
                        
                        const durationText = document.createElement('div');
                        durationText.textContent = sub.getOriginalPattern();
                        durationText.style.opacity = '0.33';
                        subSegment.appendChild(durationText);
                        
                        // Add click handler to toggle back the entire subdivision
                        subSegment.addEventListener('click', () => {
                            toggleSubdivision(repeatIndex, index);
                        });
                        
                        // Add right-click handler for parameters
                        subSegment.addEventListener('contextmenu', (e) => {
                            console.log('Right-click detected on subdivided segment');
                            e.preventDefault();
                            showParameterControls(e, repeatIndex, index, subIndex, true);
                        });
                        
                        container.appendChild(subSegment);
                        visualElements.push(subSegment);
                    });
                    
                    segmentsRow.appendChild(container);
                } else {
                    // Create a normal segment
                    const segment = document.createElement('div');
                    segment.className = 'beat-segment';
                    segment.classList.add(`beat-${item.drumType}`);
                    segment.dataset.repeatIndex = repeatIndex;
                    segment.dataset.patternIndex = index;
                    segment.style.flex = String(item.value / totalDuration);
                    
                    const durationText = document.createElement('div');
                    durationText.textContent = item.getOriginalPattern();
                    durationText.style.opacity = '0.33';
                    segment.appendChild(durationText);
                    
                    // Add click handler to toggle subdivision
                    segment.addEventListener('click', () => {
                        toggleSubdivision(repeatIndex, index);
                    });
                    
                    // Add right-click handler for parameters
                    segment.addEventListener('contextmenu', (e) => {
                        console.log('Right-click detected on normal segment');
                        e.preventDefault();
                        showParameterControls(e, repeatIndex, index, null, false);
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

    // Show parameter controls for a segment
    function showParameterControls(event, repeatIndex, patternIndex, subIndex, isSubdivision) {
        console.log('showParameterControls called with:', { repeatIndex, patternIndex, subIndex, isSubdivision });
        
        // Remove selected class from all segments
        document.querySelectorAll('.beat-segment').forEach(segment => {
            segment.classList.remove('selected-segment');
        });
        
        // Get the segment from the pattern structure
        const segment = repeatPatterns[repeatIndex][patternIndex];
        const selectedSegment = isSubdivision && segment.subdivisions && segment.subdivisions.length > subIndex
            ? segment.subdivisions[subIndex]
            : segment;
        
        // Add selected class to the clicked segment
        const clickedSegment = event.target.closest('.beat-segment');
        if (clickedSegment) {
            clickedSegment.classList.add('selected-segment');
        }
        
        console.log('Selected segment:', selectedSegment);
        
        // Get the parameter panel and controls container
        const parameterPanel = document.getElementById('parameter-panel');
        const parameterControls = document.getElementById('parameter-controls');
        const soundTypePanel = document.getElementById('sound-type-panel');
        const soundTypeSelect = document.getElementById('sound-type-select');
        
        console.log('Parameter panel found:', !!parameterPanel);
        console.log('Parameter controls container found:', !!parameterControls);
        console.log('Sound type panel found:', !!soundTypePanel);
        
        // Set the current sound type in the dropdown
        soundTypeSelect.value = selectedSegment.drumType;
        
        // Add change event listener to the sound type select
        soundTypeSelect.onchange = () => {
            const newType = soundTypeSelect.value;
            
            // Update the segment's drum type
            selectedSegment.drumType = newType;
            
            // Reinitialize sound parameters for the new type
            selectedSegment.soundParams = selectedSegment.initializeSoundParams();
            
            // Update visualization
            createBeatVisualization();
            
            // Recalculate beat sequence
            beatSequence = patternToTimings(repeatPatterns, tempo);
            
            // Update parameter controls for the new sound type
            const drumModuleClass = selectedSegment.getDrumModuleClass();
            if (drumModuleClass && drumModuleClass.parameterNames) {
                // Clear existing controls
                parameterControls.innerHTML = '';
                
                // Create new controls for the new sound type
                for (const [paramName, paramConfig] of Object.entries(drumModuleClass.parameterNames)) {
                    const paramDiv = document.createElement('div');
                    paramDiv.className = 'parameter-control';

                    const label = document.createElement('label');
                    label.htmlFor = `${selectedSegment.drumType}-${paramName}`;
                    label.textContent = paramConfig.label || paramName;

                    const input = document.createElement('input');
                    input.type = 'range';
                    input.id = `${selectedSegment.drumType}-${paramName}`;
                    input.min = paramConfig.min;
                    input.max = paramConfig.max;
                    input.step = paramConfig.step || (paramConfig.max <= 1 ? 0.01 : 1);
                    input.value = selectedSegment.soundParams[paramName] || paramConfig.default;

                    const valueSpan = document.createElement('span');
                    valueSpan.className = 'value-display';
                    valueSpan.textContent = input.value;

                    // Add event listener to update the value display and segment parameters
                    input.addEventListener('input', function() {
                        valueSpan.textContent = this.value;
                        selectedSegment.soundParams[paramName] = parseFloat(this.value);
                        // Recalculate beat sequence with updated parameters
                        beatSequence = patternToTimings(repeatPatterns, tempo);
                    });

                    paramDiv.appendChild(label);
                    paramDiv.appendChild(input);
                    paramDiv.appendChild(valueSpan);
                    parameterControls.appendChild(paramDiv);
                }
                
                // Update the panel title
                parameterPanel.querySelector('h3').textContent = `Sound Parameters - ${selectedSegment.drumType} (${selectedSegment.getOriginalPattern()})`;
            }
            
            // Play a preview of the new sound
            const drumModule = new drumModuleClass();
            drumModule.play();
        };
        
        // Clear existing controls
        parameterControls.innerHTML = '';
        
        // Get the drum module class
        const drumModuleClass = selectedSegment.getDrumModuleClass();
        console.log('Drum module class found:', !!drumModuleClass);
        console.log('Parameter names available:', drumModuleClass?.parameterNames);
        
        if (!drumModuleClass || !drumModuleClass.parameterNames) return;

        // Create controls for each parameter
        const parameters = drumModuleClass.parameterNames;
        for (const [paramName, paramConfig] of Object.entries(parameters)) {
            const paramDiv = document.createElement('div');
            paramDiv.className = 'parameter-control';

            const label = document.createElement('label');
            label.htmlFor = `${selectedSegment.drumType}-${paramName}`;
            label.textContent = paramConfig.label || paramName;

            const input = document.createElement('input');
            input.type = 'range';
            input.id = `${selectedSegment.drumType}-${paramName}`;
            input.min = paramConfig.min;
            input.max = paramConfig.max;
            input.step = paramConfig.step || (paramConfig.max <= 1 ? 0.01 : 1);
            input.value = selectedSegment.soundParams[paramName] || paramConfig.default;

            const valueSpan = document.createElement('span');
            valueSpan.className = 'value-display';
            valueSpan.textContent = input.value;

            // Add event listener to update the value display and segment parameters
            input.addEventListener('input', function() {
                valueSpan.textContent = this.value;
                selectedSegment.soundParams[paramName] = parseFloat(this.value);
                // Recalculate beat sequence with updated parameters
                beatSequence = patternToTimings(repeatPatterns, tempo);
            });

            paramDiv.appendChild(label);
            paramDiv.appendChild(input);
            paramDiv.appendChild(valueSpan);
            parameterControls.appendChild(paramDiv);
        }

        // Show both panels
        parameterPanel.style.display = 'block';
        soundTypePanel.style.display = 'block';
        
        // Update the panel titles
        parameterPanel.querySelector('h3').textContent = `Sound Parameters - ${selectedSegment.drumType} (${selectedSegment.getOriginalPattern()})`;
        soundTypePanel.querySelector('h3').textContent = 'Change Sound Type';

        // Scroll to the sound type panel
        soundTypePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Add click event listener to close panels when clicking outside
        const closePanelsOnClickOutside = (e) => {
            if (!parameterPanel.contains(e.target) && 
                !soundTypePanel.contains(e.target) && 
                !e.target.closest('.beat-segment')) {
                parameterPanel.style.display = 'none';
                soundTypePanel.style.display = 'none';
                // Remove selected class from all segments
                document.querySelectorAll('.beat-segment').forEach(segment => {
                    segment.classList.remove('selected-segment');
                });
                document.removeEventListener('click', closePanelsOnClickOutside);
            }
        };

        // Add the event listener after a small delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closePanelsOnClickOutside);
        }, 0);
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
            
            // Apply humanization if checkbox is checked
            const humanizeCheckbox = document.getElementById(`${currentDrum}-humanize`);
            if (humanizeCheckbox && humanizeCheckbox.checked) {
                // Create a copy of the sound parameters
                const humanizedParams = { ...soundParams };
                
                // Get the current preset for this drum type
                const presetSelect = document.getElementById(`${currentDrum}-preset`);
                const presetName = presetSelect.value;
                const preset = window.soundPresets[currentDrum].find(p => p.name === presetName);
                
                if (preset) {
                    // Get the drum module class to access parameter ranges
                    let drumModuleClass;
                    switch (currentDrum) {
                        case 'kick': drumModuleClass = KickDrum; break;
                        case 'bass': drumModuleClass = BassDrum; break;
                        case 'snare': drumModuleClass = SnareDrum; break;
                        case 'hihat': drumModuleClass = HiHat; break;
                        case 'clap': drumModuleClass = Clap; break;
                    }
                    
                    if (drumModuleClass && drumModuleClass.parameterNames) {
                        // Apply small random variation based on preset parameter ranges
                        Object.keys(humanizedParams).forEach(param => {
                            const paramConfig = drumModuleClass.parameterNames[param];
                            if (paramConfig) {
                                const range = paramConfig.max - paramConfig.min;
                                const variation = (Math.random() * 0.1 - 0.05) * range; // -5% to +5% of the total range
                                const originalValue = humanizedParams[param];
                                humanizedParams[param] = originalValue + variation;
                                
                                // Clamp values to valid range
                                humanizedParams[param] = Math.max(paramConfig.min, Math.min(paramConfig.max, humanizedParams[param]));
                            }
                        });
                    }
                }
                
                // Play the appropriate drum sound with humanized parameters
                switch (currentDrum) {
                    case 'kick': 
                        Object.assign(kick.params, humanizedParams);
                        kick.play(); 
                        break;
                    case 'bass': 
                        Object.assign(bass.params, humanizedParams);
                        bass.play(); 
                        break;
                    case 'snare': 
                        Object.assign(snare.params, humanizedParams);
                        snare.play(); 
                        break;
                    case 'hihat': 
                        Object.assign(hihat.params, humanizedParams);
                        hihat.play(); 
                        break;
                    case 'clap': 
                        Object.assign(clap.params, humanizedParams);
                        clap.play(); 
                        break;
                }
            } else {
                // Play without humanization
                switch (currentDrum) {
                    case 'kick': 
                        Object.assign(kick.params, soundParams);
                        kick.play(); 
                        break;
                    case 'bass': 
                        Object.assign(bass.params, soundParams);
                        bass.play(); 
                        break;
                    case 'snare': 
                        Object.assign(snare.params, soundParams);
                        snare.play(); 
                        break;
                    case 'hihat': 
                        Object.assign(hihat.params, soundParams);
                        hihat.play(); 
                        break;
                    case 'clap': 
                        Object.assign(clap.params, soundParams);
                        clap.play(); 
                        break;
                }
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
        // Ensure beatList exists
        if (!window.beatList || window.beatList.length === 0) {
            console.warn('No beats available in beatList');
            return;
        }
        
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
        const hasBeat = !!beatSelect.value;
        
        if (hasBeat) {
            setCurrentBeat(beatSelect.value);
            enableMastersoundInfo();
            
            // If playing, restart the sequence with the new beat
            if (isPlaying) {
                stopSequence();
                setTimeout(startSequence, 300);
            }
        } else {
            disableMastersoundInfo();
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
                    selectRandomBeat();
                }
            }
            startSequence();
            enableMastersoundInfo();
        }
    });

    randomizeButton.addEventListener('click', () => {
        selectRandomBeat();
        if (isPlaying) {
            stopSequence();
            setTimeout(startSequence, 300); // Brief pause then start
        }
        // Enable mastersound-info panel
        enableMastersoundInfo();
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

    // Add these new functions before the init() function
    function randomizeSamples() {
        if (!currentBeat) return;
        
        const drumTypes = ['kick', 'bass', 'snare', 'hihat', 'clap'];
        
        // Process each pattern repetition
        repeatPatterns.forEach((patternStructure, repeatIndex) => {
            patternStructure.forEach((segment, patternIndex) => {
                // Randomly select a new drum type
                const newDrumType = drumTypes[Math.floor(Math.random() * drumTypes.length)];
                
                // Change drum type and use its default parameters
                segment.drumType = newDrumType;
                segment.soundParams = segment.initializeSoundParams();
                
                // Apply humanization if enabled
                applyHumanization(segment);
                
                // If segment is subdivided, also randomize subdivisions
                if (segment.isSubdivided && segment.subdivisions) {
                    segment.subdivisions.forEach(sub => {
                        const subDrumType = drumTypes[Math.floor(Math.random() * drumTypes.length)];
                        sub.drumType = subDrumType;
                        sub.soundParams = sub.initializeSoundParams();
                        // Apply humanization if enabled
                        applyHumanization(sub);
                    });
                }
            });
        });
        
        // Update visualization and sequence
        beatSequence = patternToTimings(repeatPatterns, tempo);
        createBeatVisualization();
    }

    // Add helper function to enable mastersound-info panel
    function enableMastersoundInfo() {
        if (isMastersoundEnabled) return; // Prevent unnecessary updates
        
        isMastersoundEnabled = true;
        const mastersoundInfo = document.getElementById('mastersound-info');
        mastersoundInfo.style.opacity = '1';
        mastersoundInfo.style.pointerEvents = 'auto';
        
        // Enable all controls
        document.getElementById('randomize_samples').disabled = false;
        document.querySelectorAll('.preset-select').forEach(select => {
            select.disabled = false;
        });
        document.querySelectorAll('.humanize-checkbox').forEach(checkbox => {
            checkbox.disabled = false;
        });
    }

    // Function to disable mastersound-info panel
    function disableMastersoundInfo() {
        if (!isMastersoundEnabled) return; // Prevent unnecessary updates
        
        isMastersoundEnabled = false;
        const mastersoundInfo = document.getElementById('mastersound-info');
        mastersoundInfo.style.opacity = '0.5';
        mastersoundInfo.style.pointerEvents = 'none';
        
        // Disable all controls
        document.getElementById('randomize_samples').disabled = true;
        document.querySelectorAll('.preset-select').forEach(select => {
            select.disabled = true;
        });
        document.querySelectorAll('.humanize-checkbox').forEach(checkbox => {
            checkbox.disabled = true;
            checkbox.checked = false;
        });
    }

    // Function to check if mastersound-info is enabled
    function isMastersoundInfoEnabled() {
        return isMastersoundEnabled;
    }

    // Update the init() function to add event listeners and show/hide mastersound-info
    function init() {
        populateBeatSelect();
        
        // Add event listeners for new buttons
        document.getElementById('randomize_samples').addEventListener('click', randomizeSamples);
        
        // Populate preset dropdowns
        populatePresetDropdowns();
        
        // Add event listeners for preset changes
        addPresetChangeListeners();
        
        // Set all humanize checkboxes to checked by default
        document.querySelectorAll('.humanize-checkbox').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        // Add event listener to show/hide mastersound-info based on beat selection
        beatSelect.addEventListener('change', () => {
            const hasBeat = !!beatSelect.value;
            
            if (hasBeat) {
                setCurrentBeat(beatSelect.value);
                enableMastersoundInfo();
                
                // If playing, restart the sequence with the new beat
                if (isPlaying) {
                    stopSequence();
                    setTimeout(startSequence, 300);
                }
            } else {
                disableMastersoundInfo();
            }
        });
        
        // Initially show but disable mastersound-info
        const mastersoundInfo = document.getElementById('mastersound-info');
        mastersoundInfo.style.display = 'block';
        mastersoundInfo.style.opacity = '0.5';
        document.getElementById('randomize_samples').disabled = true;
        document.querySelectorAll('.preset-select').forEach(select => {
            select.disabled = true;
        });
        document.querySelectorAll('.humanize-checkbox').forEach(checkbox => {
            checkbox.disabled = true;
            checkbox.checked = true; // Set to checked by default
        });
    }

    // Populate preset dropdowns with available presets
    function populatePresetDropdowns() {
        const soundTypes = ['kick', 'snare', 'bass', 'hihat', 'clap'];
        
        soundTypes.forEach(soundType => {
            const select = document.getElementById(`${soundType}-preset`);
            if (!select) return;
            
            // Clear existing options
            select.innerHTML = '';
            
            // Add presets for this sound type
            if (window.soundPresets && window.soundPresets[soundType]) {
                window.soundPresets[soundType].forEach((preset, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = preset.name;
                    select.appendChild(option);
                });
            }
        });
    }

    // Add event listeners for preset changes
    function addPresetChangeListeners() {
        const soundTypes = ['kick', 'snare', 'bass', 'hihat', 'clap'];
        
        soundTypes.forEach(soundType => {
            const select = document.getElementById(`${soundType}-preset`);
            const humanizeCheckbox = document.getElementById(`${soundType}-humanize`);
            
            select.addEventListener('change', () => {
                if (!currentBeat || !isMastersoundEnabled) return;
                
                // Get the selected preset
                const presetName = select.value;
                const preset = window.soundPresets[soundType].find(p => p.name === presetName);
                
                if (!preset) return;
                
                // Update all segments of this drum type with the preset parameters
                repeatPatterns.forEach(pattern => {
                    pattern.forEach(segment => {
                        if (segment.drumType === soundType) {
                            segment.soundParams = { ...preset.params };
                        }
                        
                        // Also update subdivisions if they exist
                        if (segment.isSubdivided && segment.subdivisions) {
                            segment.subdivisions.forEach(sub => {
                                if (sub.drumType === soundType) {
                                    sub.soundParams = { ...preset.params };
                                }
                            });
                        }
                    });
                });
                
                // Update visualization and sequence
                beatSequence = patternToTimings(repeatPatterns, tempo);
                createBeatVisualization();
                
                // If playing, restart the sequence to apply the new sound
                if (isPlaying) {
                    stopSequence();
                    setTimeout(startSequence, 300);
                }
            });
            
            humanizeCheckbox.addEventListener('change', () => {
                if (!currentBeat || !isMastersoundEnabled) return;
                select.dispatchEvent(new Event('change'));
            });
        });
    }

    // Initialize BPM controls
    const bpmButton = document.getElementById('bpm-button');
    const bpmPopup = document.querySelector('.bpm-popup');

    // Toggle BPM popup
    bpmButton.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent event from bubbling up
        bpmPopup.classList.toggle('active');
    });

    // Close popup when clicking outside
    document.addEventListener('click', function(event) {
        const bpmControl = document.querySelector('.bpm-control');
        if (!bpmControl.contains(event.target)) {
            bpmPopup.classList.remove('active');
        }
    });

    // Update BPM display
    function updateBPMDisplay(value) {
        bpmButton.textContent = `${value} BPM`;
        tempoDisplay.textContent = `${value} BPM`;
    }

    // Handle BPM changes
    tempoSlider.addEventListener('input', function() {
        const value = this.value;
        updateBPMDisplay(value);
        // Update your sequencer's BPM here
    });

    // Initialize BPM display
    updateBPMDisplay(tempoSlider.value);

    // Add event listener for randomize presets button
    const randomizePresetsButton = document.getElementById('randomize_presets');
    randomizePresetsButton.addEventListener('click', randomizePresets);

    function randomizePresets() {
        if (!isMastersoundInfoEnabled()) {
            return;
        }

        const drumTypes = ['kick', 'snare', 'bass', 'hihat', 'clap'];
        let changesMade = false;

        drumTypes.forEach(drumType => {
            const presetSelect = document.getElementById(`${drumType}-preset`);
            if (presetSelect && presetSelect.options.length > 1) {
                const randomIndex = Math.floor(Math.random() * (presetSelect.options.length - 1)) + 1;
                if (presetSelect.selectedIndex !== randomIndex) {
                    presetSelect.selectedIndex = randomIndex;
                    changesMade = true;
                }
            }
        });

        if (changesMade) {
            // Update all segments with the new preset parameters
            repeatPatterns.forEach(pattern => {
                pattern.forEach(segment => {
                    const presetSelect = document.getElementById(`${segment.drumType}-preset`);
                    if (presetSelect) {
                        const presetIndex = parseInt(presetSelect.value);
                        const preset = window.soundPresets[segment.drumType][presetIndex];
                        if (preset) {
                            segment.soundParams = { ...preset.params };
                            // Apply humanization if enabled
                            applyHumanization(segment);
                        }
                    }
                    
                    // Also update subdivisions if they exist
                    if (segment.isSubdivided && segment.subdivisions) {
                        segment.subdivisions.forEach(sub => {
                            const subPresetSelect = document.getElementById(`${sub.drumType}-preset`);
                            if (subPresetSelect) {
                                const presetIndex = parseInt(subPresetSelect.value);
                                const preset = window.soundPresets[sub.drumType][presetIndex];
                                if (preset) {
                                    sub.soundParams = { ...preset.params };
                                    // Apply humanization if enabled
                                    applyHumanization(sub);
                                }
                            }
                        });
                    }
                });
            });

            // Recalculate beat sequence
            beatSequence = patternToTimings(repeatPatterns, tempo);
            
            // Update visualization
            createBeatVisualization();

            // If currently playing, restart the sequence
            if (isPlaying) {
                stopSequence();
                setTimeout(startSequence, 300);
            }

            // Show feedback
            showFeedback('Random presets applied');
        }
    }

    // Helper function to apply humanization to a segment's parameters
    function applyHumanization(segment) {
        const humanizeCheckbox = document.getElementById(`${segment.drumType}-humanize`);
        if (!humanizeCheckbox || !humanizeCheckbox.checked) return;

        // Get the drum module class to access parameter ranges
        let drumModuleClass;
        switch (segment.drumType) {
            case 'kick': drumModuleClass = KickDrum; break;
            case 'bass': drumModuleClass = BassDrum; break;
            case 'snare': drumModuleClass = SnareDrum; break;
            case 'hihat': drumModuleClass = HiHat; break;
            case 'clap': drumModuleClass = Clap; break;
        }

        if (drumModuleClass && drumModuleClass.parameterNames) {
            // Apply small random variation based on preset parameter ranges
            Object.keys(segment.soundParams).forEach(param => {
                const paramConfig = drumModuleClass.parameterNames[param];
                if (paramConfig) {
                    const range = paramConfig.max - paramConfig.min;
                    const variation = (Math.random() * 0.1 - 0.05) * range; // -5% to +5% of the total range
                    const originalValue = segment.soundParams[param];
                    segment.soundParams[param] = originalValue + variation;
                    
                    // Clamp values to valid range
                    segment.soundParams[param] = Math.max(paramConfig.min, Math.min(paramConfig.max, segment.soundParams[param]));
                }
            });
        }
    }

    // Start the app
    init();
});