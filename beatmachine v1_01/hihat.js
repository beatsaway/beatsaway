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
        const sliders = ['hihatFrequency1', 'hihatFrequency2', 'hihatDuration', 'hihatRelease'];
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
        const freq1 = parseInt(document.getElementById('hihatFrequency1').value);
        const freq2 = parseInt(document.getElementById('hihatFrequency2').value);
        const duration = parseInt(document.getElementById('hihatDuration').value) / 1000;
        const release = parseInt(document.getElementById('hihatRelease').value) / 1000;
        
        // Create two square oscillators
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'square';
        osc1.frequency.value = freq1;
        
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = freq2;
        
        // Create noise source
        const noiseBuffer = this.createNoiseBuffer();
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
        
        // Create gain node
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration + release);
        
        // Connect nodes
        osc1.connect(filter);
        osc2.connect(filter);
        noiseSource.connect(filter);
        
        filter.connect(bandpassFilter);
        bandpassFilter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Start and stop
        osc1.start(now);
        osc2.start(now);
        noiseSource.start(now);
        
        osc1.stop(now + duration + release + 0.1);
        osc2.stop(now + duration + release + 0.1);
        noiseSource.stop(now + duration + release + 0.1);
    }
}

// Make HiHat available globally
window.HiHat = HiHat; 