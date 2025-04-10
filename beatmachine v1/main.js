// Add global styles
const style = document.createElement('style');
style.textContent = `
    body {
        font-family: Arial, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f0f0f0;
    }
    h1 {
        text-align: center;
        color: #333;
    }
    .drum-module {
        background: white;
        padding: 20px;
        margin: 10px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .drum-pad {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 15px 30px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        margin: 10px 0;
    }
    .drum-pad:hover {
        background: #45a049;
    }
    .parameter-controls {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
        margin-top: 10px;
    }
    .parameter-control {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    #play-all {
        display: block;
        margin: 20px auto;
        padding: 15px 30px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
    }
    #play-all:hover {
        background: #1976D2;
    }
`;
document.head.appendChild(style);

// Create title
const title = document.createElement('h1');
title.textContent = 'Drum Synthesizer';
document.body.appendChild(title);

// Create play all button
const playAllButton = document.createElement('button');
playAllButton.id = 'play-all';
playAllButton.textContent = 'Play All';
document.body.appendChild(playAllButton);

// Initialize drum modules
const kick = new KickDrum();
const bass = new BassDrum();
const snare = new SnareDrum();
const hihat = new HiHat();
const clap = new Clap();

// Add event listener for play all button
playAllButton.addEventListener('click', () => {
    const interval = 200; // Time between each drum hit in milliseconds
    
    setTimeout(() => kick.play(), 0);
    setTimeout(() => bass.play(), interval);
    setTimeout(() => snare.play(), interval * 2);
    setTimeout(() => hihat.play(), interval * 3);
    setTimeout(() => clap.play(), interval * 4);
}); 