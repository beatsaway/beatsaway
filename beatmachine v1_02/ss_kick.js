// Kick Drum Module
class KickDrum {
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
            <h2>Kick Drum</h2>
            <button class="drum-pad" id="kickButton">Kick</button>
            <div class="parameter-controls">
                <div class="slider-group">
                    <label for="kickFrequency">Initial Frequency (Hz):</label>
                    <input type="range" id="kickFrequency" min="100" max="350" value="238">
                    <span id="kickFrequencyValue" class="value">238</span>
                </div>
                <div class="slider-group">
                    <label for="kickDecay">Frequency Decay (ms):</label>
                    <input type="range" id="kickDecay" min="20" max="300" value="200">
                    <span id="kickDecayValue" class="value">200</span>
                </div>
                <div class="slider-group">
                    <label for="kickDuration">Duration (ms):</label>
                    <input type="range" id="kickDuration" min="100" max="800" value="500">
                    <span id="kickDurationValue" class="value">500</span>
                </div>
                <div class="slider-group">
                    <label for="kickClickLevel">Click Level (%):</label>
                    <input type="range" id="kickClickLevel" min="0" max="50" value="11">
                    <span id="kickClickLevelValue" class="value">11</span>
                </div>
                <div class="slider-group">
                    <label for="kickClickDuration">Click Duration (ms):</label>
                    <input type="range" id="kickClickDuration" min="5" max="100" value="37">
                    <span id="kickClickDurationValue" class="value">37</span>
                </div>
                <div class="slider-group">
                    <label for="kickVolume">Volume:</label>
                    <input type="range" id="kickVolume" min="0" max="1" step="0.01" value="0.7">
                    <span id="kickVolumeValue" class="value">0.7</span>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .drum-module {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }
            .drum-pad {
                background-color: #4a5568;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 30px 20px;
                font-size: 18px;
                cursor: pointer;
                transition: background-color 0.2s;
                text-align: center;
                width: 100%;
                margin-bottom: 20px;
            }
            .drum-pad:hover {
                background-color: #2d3748;
            }
            .drum-pad:active {
                background-color: #1a202c;
                transform: scale(0.98);
            }
            .parameter-controls {
                margin-top: 20px;
            }
            .slider-group {
                margin-bottom: 15px;
            }
            label {
                display: inline-block;
                width: 200px;
                margin-right: 10px;
            }
            input[type="range"] {
                width: 50%;
                vertical-align: middle;
            }
            .value {
                display: inline-block;
                width: 50px;
                text-align: right;
            }
        `;

        // Add to document
        document.head.appendChild(style);
        document.body.appendChild(container);

        // Add event listeners
        this.addEventListeners();
    }

    addEventListeners() {
        // Button click
        document.getElementById('kickButton').addEventListener('click', () => this.play());

        // Slider updates
        const sliders = ['kickFrequency', 'kickDecay', 'kickDuration', 'kickClickLevel', 'kickClickDuration', 'kickVolume'];
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
        const initialFreq = parseInt(document.getElementById('kickFrequency').value);
        const freqDecay = parseInt(document.getElementById('kickDecay').value) / 1000;
        const duration = parseInt(document.getElementById('kickDuration').value) / 1000;
        const clickLevel = parseInt(document.getElementById('kickClickLevel').value) / 100;
        const clickDuration = parseInt(document.getElementById('kickClickDuration').value) / 1000;
        const volume = parseFloat(document.getElementById('kickVolume').value);
        
        // Create master gain node for volume control
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(this.audioContext.destination);
        
        // Create oscillator for the main tone
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(initialFreq, now);
        
        // Exponential frequency ramp down
        osc.frequency.exponentialRampToValueAtTime(1, now + freqDecay);
        
        // Create gain node for amplitude envelope
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.linearRampToValueAtTime(1, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Create noise component for the click/snap
        const noiseBuffer = this.createNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Create a bandpass filter for the noise
        const clickFilter = this.audioContext.createBiquadFilter();
        clickFilter.type = 'bandpass';
        clickFilter.frequency.value = 6000;
        clickFilter.Q.value = 1.5;
        
        // Create gain node for the click sound
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(clickLevel, now + 0.001);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + clickDuration);
        
        // Connect nodes
        osc.connect(gainNode);
        gainNode.connect(masterGain);
        
        noiseSource.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(masterGain);
        
        // Start and stop
        osc.start(now);
        noiseSource.start(now);
        
        osc.stop(now + duration + 0.1);
        noiseSource.stop(now + duration + 0.1);
    }

    // Static property defining the parameters for this drum type
    static parameterNames = {
        initialFreq: { min: 50, max: 200, default: 100, label: 'Initial Frequency' },
        freqDecay: { min: 0.1, max: 2, default: 0.5, label: 'Frequency Decay' },
        duration: { min: 0.1, max: 1, default: 0.3, label: 'Duration' },
        volume: { min: 0, max: 1, default: 0.8, label: 'Volume' }
    };
}

// Make KickDrum available globally
window.KickDrum = KickDrum; 