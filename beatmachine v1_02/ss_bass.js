// Bass Drum Module
class BassDrum {
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
            <h2>Bass Drum</h2>
            <button class="drum-pad" id="bassButton">Bass</button>
            <div class="parameter-controls">
                <div class="slider-group">
                    <label for="subFreq">Bass Frequency (Hz):</label>
                    <input type="range" id="subFreq" min="30" max="80" value="50">
                    <span id="subFreqValue" class="value">50</span>
                </div>
                <div class="slider-group">
                    <label for="bodyPunch">Impact Strength (%):</label>
                    <input type="range" id="bodyPunch" min="0" max="100" value="60">
                    <span id="bodyPunchValue" class="value">60</span>
                </div>
                <div class="slider-group">
                    <label for="transientSharpness">Attack Sharpness (%):</label>
                    <input type="range" id="transientSharpness" min="0" max="100" value="90">
                    <span id="transientSharpnessValue" class="value">90</span>
                </div>
                <div class="slider-group">
                    <label for="clickLevel">Click Level (%):</label>
                    <input type="range" id="clickLevel" min="0" max="100" value="90">
                    <span id="clickLevelValue" class="value">90</span>
                </div>
                <div class="slider-group">
                    <label for="subDecay">Sustain Length (ms):</label>
                    <input type="range" id="subDecay" min="100" max="800" value="400">
                    <span id="subDecayValue" class="value">400</span>
                </div>
                <div class="slider-group">
                    <label for="bassVolume">Volume:</label>
                    <input type="range" id="bassVolume" min="0" max="1" step="0.01" value="0.7">
                    <span id="bassVolumeValue" class="value">0.7</span>
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
        document.getElementById('bassButton').addEventListener('click', () => this.play());

        // Slider updates
        const sliders = ['subFreq', 'bodyPunch', 'transientSharpness', 'clickLevel', 'subDecay', 'bassVolume'];
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

    createDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; ++i) {
            const x = i * 2 / samples - 1;
            curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
        }
        
        return curve;
    }

    play() {
        const now = this.audioContext.currentTime;
        
        // Read parameter values
        const attackFreq = 180;
        const subFreq = parseFloat(document.getElementById('subFreq').value);
        const pitchDecay = 30 / 1000;
        const subDecay = parseFloat(document.getElementById('subDecay').value) / 1000;
        const bodyPunch = parseFloat(document.getElementById('bodyPunch').value) / 100;
        const clickLevel = parseFloat(document.getElementById('clickLevel').value) / 100;
        const midRangeBoost = 0.4;
        const transientSharpness = parseFloat(document.getElementById('transientSharpness').value) / 100;
        const volume = parseFloat(document.getElementById('bassVolume').value);
        
        // Duration of the entire kick sound
        const duration = Math.max(subDecay + 0.2, pitchDecay * 2 + 0.1);
        
        // Create master gain node for volume control
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = volume;
        masterGain.connect(this.audioContext.destination);
        
        // Create main compressor
        const masterCompressor = this.audioContext.createDynamicsCompressor();
        masterCompressor.threshold.setValueAtTime(-15, now);
        masterCompressor.knee.setValueAtTime(5, now);
        masterCompressor.ratio.setValueAtTime(6, now);
        masterCompressor.attack.setValueAtTime(0.0005, now);
        masterCompressor.release.setValueAtTime(0.08, now);
        
        // Additional limiter
        const limiter = this.audioContext.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-1.5, now);
        limiter.knee.setValueAtTime(0, now);
        limiter.ratio.setValueAtTime(20, now);
        limiter.attack.setValueAtTime(0.0002, now);
        limiter.release.setValueAtTime(0.025, now);
        
        // Connect processing chain
        limiter.connect(masterGain);
        masterCompressor.connect(limiter);
        
        // Attack oscillator
        const attackOsc = this.audioContext.createOscillator();
        attackOsc.type = 'triangle';
        attackOsc.frequency.setValueAtTime(attackFreq, now);
        attackOsc.frequency.exponentialRampToValueAtTime(attackFreq * 0.6, now + pitchDecay * 0.25);
        attackOsc.frequency.exponentialRampToValueAtTime(subFreq, now + pitchDecay);
        
        // Attack gain
        const attackGain = this.audioContext.createGain();
        attackGain.gain.setValueAtTime(0, now);
        attackGain.gain.linearRampToValueAtTime(1.0 * bodyPunch, now + 0.0005);
        attackGain.gain.exponentialRampToValueAtTime(0.001, now + pitchDecay * 0.8);
        
        // Sub oscillator
        const subOsc = this.audioContext.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(subFreq, now);
        
        // Sub gain
        const subGain = this.audioContext.createGain();
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(1.2, now + 0.001);
        subGain.gain.setValueAtTime(1.0, now + 0.005);
        subGain.gain.exponentialRampToValueAtTime(0.8, now + 0.05);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + subDecay);
        
        // Mid-range oscillator
        const midOsc = this.audioContext.createOscillator();
        midOsc.type = 'sine';
        midOsc.frequency.setValueAtTime(subFreq * 2.5, now);
        
        // Mid gain
        const midGain = this.audioContext.createGain();
        midGain.gain.setValueAtTime(0, now);
        midGain.gain.linearRampToValueAtTime(0.4 * midRangeBoost, now + 0.001);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + pitchDecay * 1.2);
        
        // Click noise
        const noiseBuffer = this.createNoiseBuffer();
        const clickNoise = this.audioContext.createBufferSource();
        clickNoise.buffer = noiseBuffer;
        
        // Click filter
        const clickFilter = this.audioContext.createBiquadFilter();
        clickFilter.type = 'bandpass';
        clickFilter.frequency.setValueAtTime(4500, now);
        clickFilter.Q.setValueAtTime(0.7, now);
        
        // Click gain
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0, now);
        clickGain.gain.linearRampToValueAtTime(clickLevel * 0.7, now + 0.0001);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015 * (1 - transientSharpness + 0.1));
        
        // Spike noise
        const spikeNoise = this.audioContext.createBufferSource();
        spikeNoise.buffer = this.createNoiseBuffer();
        
        // Spike filter
        const spikeFilter = this.audioContext.createBiquadFilter();
        spikeFilter.type = 'highpass';
        spikeFilter.frequency.setValueAtTime(7000, now);
        spikeFilter.Q.setValueAtTime(0.5, now);
        
        // Spike gain
        const spikeGain = this.audioContext.createGain();
        spikeGain.gain.setValueAtTime(0, now);
        spikeGain.gain.linearRampToValueAtTime(transientSharpness * 0.7, now + 0.0001);
        spikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
        
        // Mid boost EQ
        const midBoostEQ = this.audioContext.createBiquadFilter();
        midBoostEQ.type = 'peaking';
        midBoostEQ.frequency.setValueAtTime(200, now);
        midBoostEQ.Q.setValueAtTime(0.7, now);
        midBoostEQ.gain.setValueAtTime(4 * midRangeBoost, now);
        
        // Distortion
        const distortion = this.audioContext.createWaveShaper();
        distortion.curve = this.createDistortionCurve(20);
        
        // Connect all nodes
        attackOsc.connect(attackGain);
        attackGain.connect(midBoostEQ);
        
        subOsc.connect(subGain);
        subGain.connect(distortion);
        
        midOsc.connect(midGain);
        midGain.connect(midBoostEQ);
        
        distortion.connect(midBoostEQ);
        midBoostEQ.connect(masterCompressor);
        
        clickNoise.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(masterCompressor);
        
        spikeNoise.connect(spikeFilter);
        spikeFilter.connect(spikeGain);
        spikeGain.connect(masterCompressor);
        
        // Start and stop all sources
        attackOsc.start(now);
        subOsc.start(now);
        midOsc.start(now);
        clickNoise.start(now);
        spikeNoise.start(now);
        
        const stopTime = now + duration;
        attackOsc.stop(stopTime);
        subOsc.stop(stopTime);
        midOsc.stop(stopTime);
        clickNoise.stop(stopTime);
        spikeNoise.stop(stopTime);
    }

    // Static property defining the parameters for this drum type
    static parameterNames = {
        initialFreq: { min: 50, max: 500, default: 238, label: 'Frequency' },
        freqDecay: { min: 50, max: 500, default: 200, label: 'Decay' },
        duration: { min: 100, max: 1000, default: 500, label: 'Duration' },
        clickLevel: { min: 0, max: 100, default: 11, label: 'Click Level' },
        clickDuration: { min: 10, max: 100, default: 37, label: 'Click Duration' },
        volume: { min: 0, max: 1, default: 0.7, label: 'Volume' }
    };
}

// Make BassDrum available globally
window.BassDrum = BassDrum; 