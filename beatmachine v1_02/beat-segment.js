// BeatSegment class to represent a single segment in a beat pattern
class BeatSegment {
    constructor(drumType, value, numerator, denominator, isSubdivided = false) {
        this.drumType = drumType; // 'kick', 'bass', 'snare', 'hihat', 'clap'
        this.value = value; // The duration value (e.g., 1/4, 3/8)
        this.numerator = numerator;
        this.denominator = denominator;
        this.isSubdivided = isSubdivided;
        this.subdivisions = [];
        
        // Initialize sound parameters based on drum type
        this.soundParams = this.initializeSoundParams();
    }
    
    // Initialize sound parameters based on drum type
    initializeSoundParams() {
        // Get the drum module class based on drum type
        const drumModuleClass = this.getDrumModuleClass();
        if (!drumModuleClass) {
            console.warn(`No drum module found for type: ${this.drumType}`);
            return {};
        }

        // Get parameters from the drum module's static parameterNames property
        const parameters = drumModuleClass.parameterNames;
        if (!parameters) {
            console.warn(`No parameters defined for drum type: ${this.drumType}`);
            return {};
        }

        // Create an object with default values from the parameters
        const soundParams = {};
        for (const [paramName, paramConfig] of Object.entries(parameters)) {
            soundParams[paramName] = paramConfig.default;
        }

        return soundParams;
    }

    // Get the drum module class based on drum type
    getDrumModuleClass() {
        switch(this.drumType) {
            case 'kick':
                return window.KickDrum;
            case 'bass':
                return window.BassDrum;
            case 'snare':
                return window.SnareDrum;
            case 'hihat':
                return window.HiHat;
            case 'clap':
                return window.Clap;
            default:
                return null;
        }
    }
    
    // Create subdivisions for this segment
    createSubdivisions() {
        this.subdivisions = [];
        
        if (this.numerator > 1) {
            // Break down into multiple 1/denominator segments
            // Example: 3/8 -> 1/8 + 1/8 + 1/8
            for (let i = 0; i < this.numerator; i++) {
                this.subdivisions.push(new BeatSegment(
                    this.drumType,
                    1 / this.denominator,
                    1,
                    this.denominator,
                    false
                ));
            }
        } else {
            // Divide by 2 for segments where numerator is 1
            // Example: 1/4 -> 1/8 + 1/8
            this.subdivisions.push(new BeatSegment(
                this.drumType,
                1 / (this.denominator * 2),
                1,
                this.denominator * 2,
                false
            ));
            
            this.subdivisions.push(new BeatSegment(
                this.drumType,
                1 / (this.denominator * 2),
                1,
                this.denominator * 2,
                false
            ));
        }
        
        this.isSubdivided = true;
    }
    
    // Remove subdivisions
    removeSubdivisions() {
        this.subdivisions = [];
        this.isSubdivided = false;
    }
    
    // Toggle subdivision state
    toggleSubdivision() {
        if (this.isSubdivided) {
            this.removeSubdivisions();
        } else {
            this.createSubdivisions();
        }
        return this.isSubdivided;
    }
    
    // Get the original pattern string representation
    getOriginalPattern() {
        return `${this.numerator}/${this.denominator}`;
    }
    
    // Clone this segment
    clone() {
        const clone = new BeatSegment(
            this.drumType,
            this.value,
            this.numerator,
            this.denominator,
            this.isSubdivided
        );
        
        // Deep copy sound parameters
        clone.soundParams = JSON.parse(JSON.stringify(this.soundParams));
        
        // Deep copy subdivisions if they exist
        if (this.isSubdivided && this.subdivisions.length > 0) {
            clone.subdivisions = this.subdivisions.map(sub => sub.clone());
        }
        
        return clone;
    }
}

// Make BeatSegment available globally
window.BeatSegment = BeatSegment; 