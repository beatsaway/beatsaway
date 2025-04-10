// Hi-Hat Module
class HiHat {
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
            <h2>Hi-Hat</h2>
            <button class="drum-pad" id="hihatButton">Hi-Hat</button>
            <div class="parameter-controls">
                <div class="slider-group">
                    <label for="hihatFrequency1">Frequency 1 (Hz):</label>
                    <input type="range" id="hihatFrequency1" min="2000" max="12000" value="8000">
                    <span id="hihatFrequency1Value" class="value">8000</span>
                </div>
                <div class="slider-group">
                    <label for="hihatFrequency2">Frequency 2 (Hz):</label>
                    <input type="range" id="hihatFrequency2" min="5000" max="15000" value="10000">
                    <span id="hihatFrequency2Value" class="value">10000</span>
                </div>
                <div class="slider-group">
                    <label for="hihatDuration">Duration (ms):</label>
                    <input type="range" id="hihatDuration" min="20" max="500" value="60">
                    <span id="hihatDurationValue" class="value">60</span>
                </div>
                <div class="slider-group">
                    <label for="hihatRelease">Release (ms):</label>
                    <input type="range" id="hihatRelease" min="10" max="200" value="30">
                    <span id="hihatReleaseValue" class="value">30</span>
                </div>
                <div class="slider-group">
                    <label for="hihatFilterFreq">Filter Frequency (Hz):</label>
                    <input type="range" id="hihatFilterFreq" min="1000" max="10000" value="5000">
                    <span id="hihatFilterFreqValue" class="value">5000</span>
                </div>
                <div class="slider-group">
                    <label for="hihatFilterQ">Filter Resonance:</label>
                    <input type="range" id="hihatFilterQ" min="0.1" max="10" step="0.1" value="1">
                    <span id="hihatFilterQValue" class="value">1</span>
                </div>
                <div class="slider-group">
                    <label for="hihatVolume">Volume:</label>
                    <input type="range" id="hihatVolume" min="0" max="1" step="0.1" value="0.5">
                    <span id="hihatVolumeValue" class="value">0.5</span>
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
        document.getElementById('hihatButton').addEventListener('click', () => this.play());

        // Slider updates
        const sliders = ['hihatFrequency1', 'hihatFrequency2', 'hihatDuration', 'hihatRelease', 'hihatFilterFreq', 'hihatFilterQ', 'hihatVolume'];
        sliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(id + 'Value');
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
            });
        });
    }

    // Create pink noise buffer (1/f noise)
    createPinkNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Pink noise algorithm (Voss-McCartney)
        let r = 0;
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            // Generate white noise
            const white = Math.random() * 2 - 1;
            
            // Update the running sums
            b0 = (b0 * 0.99829) + (white * 0.00171);
            b1 = (b1 * 0.99829) + (b0 * 0.00171);
            b2 = (b2 * 0.99829) + (b1 * 0.00171);
            b3 = (b3 * 0.99829) + (b2 * 0.00171);
            b4 = (b4 * 0.99829) + (b3 * 0.00171);
            b5 = (b5 * 0.99829) + (b4 * 0.00171);
            b6 = (b6 * 0.99829) + (b5 * 0.00171);
            
            // Combine the running sums to create pink noise
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6) * 0.15;
        }
        
        return buffer;
    }

    play() {
        const now = this.audioContext.currentTime;
        
        // Get parameters
        const freq1 = parseInt(document.getElementById('hihatFrequency1').value);
        const freq2 = parseInt(document.getElementById('hihatFrequency2').value);
        const duration = parseInt(document.getElementById('hihatDuration').value) / 1000;
        const release = parseInt(document.getElementById('hihatRelease').value) / 1000;
        const filterFreq = parseInt(document.getElementById('hihatFilterFreq').value);
        const filterQ = parseFloat(document.getElementById('hihatFilterQ').value);
        const volume = parseFloat(document.getElementById('hihatVolume').value);
        
        // Create two square oscillators
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'square';
        osc1.frequency.value = freq1;
        
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = freq2;
        
        // Create pink noise source
        const noiseBuffer = this.createPinkNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Create highpass filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        filter.Q.value = 3;
        
        // Create bandpass filter
        const bandpassFilter = this.audioContext.createBiquadFilter();
        bandpassFilter.type = 'bandpass';
        bandpassFilter.frequency.value = 10000;
        bandpassFilter.Q.value = 1;
        
        // Create lowpass filter to reduce harshness
        const lowpassFilter = this.audioContext.createBiquadFilter();
        lowpassFilter.type = 'lowpass';
        lowpassFilter.frequency.value = filterFreq;
        lowpassFilter.Q.value = filterQ;
        
        // Create gain node
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3 * volume, now + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration + release);
        
        // Connect nodes
        osc1.connect(filter);
        osc2.connect(filter);
        noiseSource.connect(filter);
        
        filter.connect(bandpassFilter);
        bandpassFilter.connect(lowpassFilter);
        lowpassFilter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Start and stop
        osc1.start(now);
        osc2.start(now);
        noiseSource.start(now);
        
        osc1.stop(now + duration + release + 0.1);
        osc2.stop(now + duration + release + 0.1);
        noiseSource.stop(now + duration + release + 0.1);
    }

    // Static property defining the parameters for this drum type
    static parameterNames = {
        noiseLevel: { min: 0, max: 100, default: 11, label: 'Noise Level' },
        noiseDuration: { min: 10, max: 100, default: 37, label: 'Noise Duration' },
        volume: { min: 0, max: 1, default: 0.7, label: 'Volume' }
    };
}

// Make HiHat available globally
window.HiHat = HiHat; 