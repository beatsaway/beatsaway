// Clap Module
class Clap {
    constructor() {
        this.audioContext = null;
        this.initAudio();
        this.createUI();
    }

    initAudio() {
        // Handle Safari
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
    }

    createUI() {
        // Create container
        const container = document.createElement('div');
        container.className = 'drum-module';
        container.innerHTML = `
            <h2>Clap</h2>
            <button class="drum-pad" id="clapButton">Clap</button>
            <div class="parameter-controls">
                <div class="slider-group">
                    <label for="clapSpacing">Clap Spacing (ms):</label>
                    <input type="range" id="clapSpacing" min="5" max="60" value="10">
                    <span id="clapSpacingValue" class="value">10</span>
                </div>
                <div class="slider-group">
                    <label for="clapDecay">Main Decay (ms):</label>
                    <input type="range" id="clapDecay" min="20" max="200" value="60">
                    <span id="clapDecayValue" class="value">60</span>
                </div>
                <div class="slider-group">
                    <label for="clapReverbDecay">Last Clap Decay (ms):</label>
                    <input type="range" id="clapReverbDecay" min="200" max="1000" value="500">
                    <span id="clapReverbDecayValue" class="value">500</span>
                </div>
                <div class="slider-group">
                    <label for="clapFilterFreq">Filter Frequency (Hz):</label>
                    <input type="range" id="clapFilterFreq" min="500" max="8000" value="3000">
                    <span id="clapFilterFreqValue" class="value">3000</span>
                </div>
                <div class="slider-group">
                    <label for="clapFilterQ">Filter Q:</label>
                    <input type="range" id="clapFilterQ" min="0.05" max="1" step="0.01" value="0.1">
                    <span id="clapFilterQValue" class="value">0.1</span>
                </div>
                <div class="slider-group">
                    <label for="clapVolume">Volume:</label>
                    <input type="range" id="clapVolume" min="0" max="1" step="0.01" value="0.7">
                    <span id="clapVolumeValue" class="value">0.7</span>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(container);

        // Add event listeners
        this.addEventListeners();
    }

    addEventListeners() {
        // Button click
        document.getElementById('clapButton').addEventListener('click', () => this.play());

        // Slider updates
        const sliders = ['clapSpacing', 'clapDecay', 'clapReverbDecay', 'clapFilterFreq', 'clapFilterQ', 'clapVolume'];
        sliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(id + 'Value');
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
            });
        });
    }

    createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }

    play() {
        const now = this.audioContext.currentTime;
        
        // Get parameters
        const spacing = parseInt(document.getElementById('clapSpacing').value);
        const decay = parseInt(document.getElementById('clapDecay').value) / 1000;
        const reverbDecay = parseInt(document.getElementById('clapReverbDecay').value) / 1000;
        const filterFreq = parseInt(document.getElementById('clapFilterFreq').value);
        const filterQ = parseFloat(document.getElementById('clapFilterQ').value);
        const volume = parseFloat(document.getElementById('clapVolume').value);
        
        // Master gain node
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(this.audioContext.destination);
        
        // Create bandpass filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = filterQ;
        filter.connect(masterGain);
        
        // Create 4 claps with different timings
        for (let i = 0; i < 4; i++) {
            const startTime = now + (spacing * i) / 1000;
            const clapDecay = i === 3 ? reverbDecay : decay; // Last clap has longer decay
            
            // Create noise source
            const noiseBuffer = this.createNoiseBuffer();
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            
            // Create envelope for the clap
            const clapGain = this.audioContext.createGain();
            clapGain.gain.setValueAtTime(0, startTime);
            clapGain.gain.linearRampToValueAtTime(0.3, startTime + 0.001);
            clapGain.gain.exponentialRampToValueAtTime(0.001, startTime + clapDecay);
            
            // Connect nodes
            noiseSource.connect(clapGain);
            clapGain.connect(filter);
            
            // Start noise
            noiseSource.start(startTime);
            noiseSource.stop(startTime + clapDecay + 0.05);
        }
    }
}

// Make Clap available globally
window.Clap = Clap; 