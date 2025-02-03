let transcript = [];
let observer;

// Function to capture captions dynamically
function captureCaptions(mutationsList) {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            let captions = document.querySelectorAll('[jsname="YSxPC"] .VbkSUe span');
            if (captions.length > 0) {
                let text = Array.from(captions).map(el => el.innerText.trim()).join(' ');
                let time = new Date().toLocaleTimeString();
                if (text && (!transcript.length || transcript[transcript.length - 1].text !== text)) {
                    transcript.push({ time, text });
                    console.log(`[${time}] ${text}`);
                }
            }
        }
    }
}

// Function to start observing captions
function startObserving() {
    let captionsContainer = document.querySelector('.iOzk7');
    if (captionsContainer) {
        observer = new MutationObserver(captureCaptions);
        observer.observe(captionsContainer, { childList: true, subtree: true });
        console.log("Started observing captions.");
    } else {
        console.log("Captions container not found. Make sure captions are enabled.");
    }
}

// Function to stop observing and save transcript
function stopObserving() {
    if (observer) {
        observer.disconnect();
        console.log("Stopped observing captions.");
        let blob = new Blob([JSON.stringify(transcript, null, 2)], { type: "text/plain" });
        let url = URL.createObjectURL(blob);
        chrome.runtime.sendMessage({ action: "download", url: url });
    }
}

// Listen for start/stop messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start") {
        startObserving();
    } else if (message.action === "stop") {
        stopObserving();
    }
});
