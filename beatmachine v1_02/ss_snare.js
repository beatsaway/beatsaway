// Snare Drum Module
class SnareDrum {
    // Static property defining the parameters for this drum type
    static parameterNames = {
        initialFreq: { min: 50, max: 500, default: 238, label: 'Frequency' },
        freqDecay: { min: 50, max: 500, default: 200, label: 'Decay' },
        duration: { min: 100, max: 1000, default: 500, label: 'Duration' },
        noiseLevel: { min: 0, max: 1, default: 0.5, label: 'Noise Level' },
        noiseDuration: { min: 0.1, max: 1, default: 0.3, label: 'Noise Duration' },
        toneLevel: { min: 0, max: 1, default: 0.3, label: 'Tone Level' },
        toneDuration: { min: 0.1, max: 1, default: 0.2, label: 'Tone Duration' },
        volume: { min: 0, max: 1, default: 0.7, label: 'Volume' }
    };

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
            <h2>Snare Drum</h2>
            <button class="drum-pad" id="snareButton">Snare</button>
            <div class="parameter-controls">
                <div class="slider-group">
                    <label for="snareNoiseLevel">Noise Level (%):</label>
                    <input type="range" id="snareNoiseLevel" min="0" max="100" value="80">
                    <span id="snareNoiseLevelValue" class="value">80</span>
                </div>
                <div class="slider-group">
                    <label for="snareOscLevel">Oscillator Level (%):</label>
                    <input type="range" id="snareOscLevel" min="0" max="100" value="50">
                    <span id="snareOscLevelValue" class="value">50</span>
                </div>
                <div class="slider-group">
                    <label for="snareFrequency">Osc Frequency (Hz):</label>
                    <input type="range" id="snareFrequency" min="100" max="500" value="180">
                    <span id="snareFrequencyValue" class="value">180</span>
                </div>
                <div class="slider-group">
                    <label for="snareDuration">Duration (ms):</label>
                    <input type="range" id="snareDuration" min="50" max="500" value="120">
                    <span id="snareDurationValue" class="value">120</span>
                </div>
                <div class="slider-group">
                    <label for="snareVolume">Volume:</label>
                    <input type="range" id="snareVolume" min="0" max="1" step="0.01" value="0.7">
                    <span id="snareVolumeValue" class="value">0.7</span>
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
        document.getElementById('snareButton').addEventListener('click', () => this.play());

        // Slider updates
        const sliders = ['snareNoiseLevel', 'snareOscLevel', 'snareFrequency', 'snareDuration', 'snareVolume'];
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
        const noiseLevel = parseInt(document.getElementById('snareNoiseLevel').value) / 100;
        const oscLevel = parseInt(document.getElementById('snareOscLevel').value) / 100;
        const oscFreq = parseInt(document.getElementById('snareFrequency').value);
        const duration = parseInt(document.getElementById('snareDuration').value) / 1000;
        const volume = parseFloat(document.getElementById('snareVolume').value);
        
        // Create master gain node for volume control
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(this.audioContext.destination);
        
        // Create the noise component
        const noiseBuffer = this.createNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Create a bandpass filter for the noise
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 4000;
        noiseFilter.Q.value = 1;
        
        // Create gain node for noise component
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(noiseLevel, now + 0.005);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Create oscillator component
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = oscFreq;
        
        // Create gain node for oscillator component
        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(oscLevel, now + 0.005);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);
        
        // Connect the noise path
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        
        // Connect the oscillator path
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        
        // Start and stop
        noiseSource.start(now);
        osc.start(now);
        
        noiseSource.stop(now + duration + 0.1);
        osc.stop(now + duration + 0.1);
    }
}

// Make SnareDrum available globally
window.SnareDrum = SnareDrum; 