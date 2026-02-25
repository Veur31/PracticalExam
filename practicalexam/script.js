// Link to your Teachable Machine model folder
const URL = "./tm-my-image-model/";

let model, webcam, labelContainer, maxPredictions;
let lastDetectedReaction = ""; 
let lastEmojiTime = 0;

// ALL KEYS ARE NOW LOWERCASE to prevent capitalization mismatch errors
const emojiMap = {
    "heart": "💖",
    "like": "👍",
    "dislike": "👎",
    "happy": "😄",
    "sad": "😢",
    "clap": "👏",
    "raise": "✋",
    "raise hand": "✋" // Added a common variation just in case
};

async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true; 
    webcam = new tmImage.Webcam(400, 400, flip); 
    await webcam.setup(); 
    await webcam.play();
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").appendChild(webcam.canvas);
    labelContainer = document.getElementById("label-container");
    
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
        const div = document.createElement("div");
        div.className = "badge bg-light text-dark border";
        labelContainer.appendChild(div);
    }
}

async function loop() {
    webcam.update(); 
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    
    let highestProb = 0;
    let currentBestAction = "";

    for (let i = 0; i < maxPredictions; i++) {
        const prob = prediction[i].probability;
        const label = prediction[i].className;

        labelContainer.childNodes[i].innerHTML = label + ": " + prob.toFixed(2);

        if (prob > highestProb) {
            highestProb = prob;
            currentBestAction = label;
        }
    }

    // THIS IS THE MAGIC FIX: Convert to lowercase and strip out hidden spaces
    const cleanAction = currentBestAction.toLowerCase().trim();

    // Check if confidence is > 90% and it's not the neutral/background class
    if (highestProb > 0.90 && cleanAction !== "neutral" && cleanAction !== "background") {
        const now = Date.now();
        
        if (cleanAction !== lastDetectedReaction) {
            logToChat(currentBestAction); // Keep original casing for the chat log
            showEffect(cleanAction);      // Pass the lowercase version to the emoji spawner
            lastDetectedReaction = cleanAction; 
            lastEmojiTime = now;
        } 
        else if (now - lastEmojiTime > 1500) {
            showEffect(cleanAction);
            lastEmojiTime = now;
        }
    } 
    else if (highestProb > 0.90 && (cleanAction === "neutral" || cleanAction === "background")) {
        lastDetectedReaction = "neutral";
    }
}

function showEffect(reaction) {
    const emojiSymbol = emojiMap[reaction];
    
    // Safety check: Let us know in the console if a label is missing from the map
    if (!emojiSymbol) {
        console.log("No emoji mapped for this Teachable Machine label:", reaction);
        return;
    }

    const overlay = document.getElementById("effect-overlay");
    if (!overlay) return; 

    const burstCount = Math.floor(Math.random() * 3) + 3; 

    for (let i = 0; i < burstCount; i++) {
        const emoji = document.createElement("div");
        emoji.innerText = emojiSymbol;
        emoji.className = "emoji-effect";
        
        const randomLeft = 10 + (Math.random() * 70);
        emoji.style.left = `${randomLeft}%`;
        emoji.style.animationDelay = `${Math.random() * 0.3}s`;

        overlay.appendChild(emoji);

        setTimeout(() => {
            emoji.remove();
        }, 2500);
    }
}

function logToChat(reaction) {
    const chatBox = document.getElementById("chat-box");
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const entry = document.createElement("div");
    entry.className = "log-entry";
    
    let actionText = "";
    const lowerReaction = reaction.toLowerCase();
    
    if (lowerReaction.includes("raise") || lowerReaction.includes("clap")) {
        actionText = `performed a <b>${reaction}</b> gesture`;
    } else {
        actionText = `expressed a <b>${reaction}</b> sentiment`;
    }

    entry.innerHTML = `<span class="text-muted small">[${timeString}]</span> <br> <strong>User</strong> ${actionText}.`;
    chatBox.prepend(entry);
}