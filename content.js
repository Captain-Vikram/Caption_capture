// Initialize storage for captions with timestamps
let transcript = [];
let lastCaptionText = '';
let lastTimestamp = null;
let isCapturing = false; // Flag to track if we're actively capturing
let captionObserver = null; // Store the observer for later use

// Previous partial caption text for comparison

let lastLoggedCaption = '';
let debounceTimer = null;
const DEBOUNCE_DELAY = 1500; // 1.5 seconds

function processCaption(text, speakerName = null) {
    if (!isCapturing) return;

    // Only log if text has a significant change or ends with a punctuation mark
    if (text === lastLoggedCaption) return;
    if (!isSignificantChange(lastLoggedCaption, text)) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString();
        const captionEntry = speakerName && speakerName !== "You"
            ? `[${formattedTime}] ${speakerName}: ${text.trim()}`
            : `[${formattedTime}] You: ${text.trim()}`;

        transcript.push(captionEntry);
        lastLoggedCaption = text;
        console.log('Logged caption:', captionEntry);
        // Optionally, save transcript after every 10 entries or so
        if (transcript.length % 10 === 0) {
            saveTranscriptToStorage();
        }
    }, DEBOUNCE_DELAY);
}

function isSignificantChange(oldText, newText) {
    // Consider it significant if newText is longer and ends with a punctuation indicating completion
    const diff = newText.length - oldText.length;
    const sentenceComplete = /[.!?]$/.test(newText.trim());
    return diff > 3 || sentenceComplete;
}
// Save transcript to chrome.storage
function saveTranscriptToStorage() {
    const meetingId = getMeetingId();
    chrome.storage.local.set({
        [`transcript_${meetingId}`]: transcript,
        [`lastUpdated_${meetingId}`]: new Date().toISOString(),
        [`isCapturing_${meetingId}`]: isCapturing
    }, () => {
        console.log('Saved transcript to storage');
    });
}

// Get meeting ID from URL
function getMeetingId() {
    const url = window.location.href;
    const matches = url.match(/\/([a-zA-Z0-9\-_]+)(\?|$)/);
    return matches ? matches[1] : 'unknown_meeting';
}

// Try different selectors to find the caption container
function findCaptionContainer() {
    const selectors = [
        '.a4cQT.kV7vwc',          // Main caption container class
        '.DtJ7e',                 // Direct parent of the caption text
        '.iOzk7',                 // Another possible container class
        'div[jsname="YSxPC"]',    // Container with specific jsname attribute
        'div[jsname="tgaKEf"]',   // The actual text container
        '.bYevke.wY1pdd',         // Class combination for the text wrapper
        '.bh44bd.VbkSUe',         // Class combination for the text content
        '.iOzk7.XDPoIe',
        '.a4cQT',
        '[data-self-name]',
        '[aria-live="polite"]'
    ];

    for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container) {
            console.log(`Found caption container with selector: ${selector}`);
            return container;
        }
    }

    // If direct selectors fail, look for containers with spans that look like captions
    const potentialCaptionContainers = document.querySelectorAll('div:not([role="button"])');
    for (const container of potentialCaptionContainers) {
        // Check if it contains spans that look like captions
        if (container.querySelectorAll('span').length > 0 &&
            !container.querySelector('button') &&
            container.innerText.trim() &&
            container.offsetHeight > 0) {
            console.log('Found caption container by structure analysis');
            return container;
        }
    }

    console.warn('No caption container found');
    return null;
}

let lastCaption = '';
function captureCaption() {
    // Use the same container finder we use elsewhere
    const captionContainer = findCaptionContainer();
    if (captionContainer) {
        const currentCaption = captionContainer.innerText.trim();
        if (currentCaption && currentCaption !== lastCaption) {
            const timestamp = new Date().toLocaleTimeString();
            const speakerName = extractSpeakerName(captionContainer);
            const transcriptEntry = speakerName 
                ? `[${timestamp}] ${speakerName}: ${currentCaption}`
                : `[${timestamp}] Unknown: ${currentCaption}`;
            
            transcript.push(transcriptEntry);
            lastCaption = currentCaption;
        }
    }
}
// Extract speaker name if available
function extractSpeakerName(element) {
    const speakerSelectors = [
        '.KcIKyf',
        '[data-sender-name]',
        '[data-self-name]',
        '.zWfAib',
        '.NnTWjc',
        '.participant-name', // new selector for participant names
        'span[aria-label]'   // check aria-label attributes too
    ];

    for (const selector of speakerSelectors) {
        const speakerElement = element.querySelector(selector);
        if (speakerElement) {
            const name = speakerElement.innerText || 
                         speakerElement.getAttribute('data-sender-name') ||
                         speakerElement.getAttribute('data-self-name') ||
                         speakerElement.getAttribute('aria-label');
            if (name && name.trim().length > 0) return name.trim();
        }
    }

    // Additional fallback: try to find img alt text if available
    const imgElement = element.querySelector('img[alt]');
    if (imgElement && imgElement.alt && !imgElement.alt.toLowerCase().includes('profile')) {
        return imgElement.alt.trim();
    }
    return null;
}

// Function to start caption observation
function startCapturing() {
    if (isCapturing) return; // Already capturing

    isCapturing = true;
    console.log("Starting caption capture");

    // If we already have an observer set up, we just need to update the flag
    if (captionObserver) {
        saveTranscriptToStorage();
        return;
    }

    const captionCheckInterval = setInterval(() => {
        const captionContainer = findCaptionContainer();

        if (captionContainer) {
            clearInterval(captionCheckInterval);
            console.log('Caption container found, initializing observer');

            captionObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        // Get the latest captions
                        const textContainer = captionContainer.querySelector('.bh44bd') ||
                            captionContainer.querySelector('[jsname="tgaKEf"]');

                        if (textContainer) {
                            const spans = textContainer.querySelectorAll('span');
                            if (spans.length > 0) {
                                const text = Array.from(spans)
                                    .map(span => span.innerText.trim())
                                    .filter(Boolean)
                                    .join(' ');

                                if (text) {
                                    const speakerName = extractSpeakerName(captionContainer);
                                    processCaption(text, speakerName);
                                }
                            } else {
                                // Handle case where there might not be spans
                                const text = textContainer.innerText.trim();
                                if (text) {
                                    const speakerName = extractSpeakerName(captionContainer);
                                    processCaption(text, speakerName);
                                }
                            }
                        }
                    }
                });
            });

            captionObserver.observe(captionContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });

            console.log('Caption observer initialized');
        }
    }, 2000); // Check every 2 seconds until caption container is found
}

// Function to stop caption observation
function stopCapturing() {
    if (!isCapturing) return; // Not capturing

    isCapturing = false;
    console.log("Stopped caption capture");

    // Save the final state
    saveTranscriptToStorage();
}

// Function to check if the user has entered the meeting
function hasEnteredMeeting() {
    return document.querySelector('button[aria-label="Leave call"]') !== null ||
        document.querySelector('button[aria-label="Leave meeting"]') !== null;
}

// Function to enable captions
function enableCaptions() {
    const captionSelectors = [
        'button[aria-label*="captions"]',
        'button[aria-label*="subtitle"]',
        'button[aria-label*="CC"]',
        'button[data-tooltip*="caption"]',
        'button[data-tooltip*="subtitle"]'
    ];

    for (const selector of captionSelectors) {
        const captionButton = document.querySelector(selector);
        if (captionButton) {
            // Check if captions are not already enabled
            if (captionButton.getAttribute('aria-pressed') === 'false') {
                captionButton.click();
                console.log('Attempting to enable captions.');
                // Wait and verify if captions appear
                setTimeout(() => {
                    const captionContainer = findCaptionContainer();
                    if (!captionContainer || captionContainer.innerText.trim() === "") {
                        console.warn('Captions not detected. Retrying...');
                        captionButton.click();
                    } else {
                        console.log('Captions are active.');
                    }
                }, 2000); // check after 2 seconds
            } else {
                console.log('Captions are already enabled.');
            }
            return;
        }
    }
    console.warn('Caption button not found.');
}
// Wait until the user has entered the meeting
function waitForMeeting() {
    console.log('Waiting for meeting to start...');

    const checkInterval = setInterval(() => {
        if (hasEnteredMeeting()) {
            clearInterval(checkInterval);
            console.log('User has entered the meeting');

            // Load any existing transcript for this meeting
            const meetingId = getMeetingId();
            chrome.storage.local.get([
                `transcript_${meetingId}`,
                `isCapturing_${meetingId}`
            ], (result) => {
                if (result[`transcript_${meetingId}`]) {
                    transcript = result[`transcript_${meetingId}`];
                    console.log(`Loaded ${transcript.length} existing transcript entries`);
                }

                // Restore capturing state if it was previously set
                isCapturing = result[`isCapturing_${meetingId}`] || false;

                // Enable captions
                setTimeout(enableCaptions, 2000);

                // Start observing captions (but don't start capturing unless previously active)
                if (isCapturing) {
                    setTimeout(startCapturing, 3000);
                } else {
                    console.log('Capture is disabled. Click the Start button in the extension popup to begin capturing.');
                }
            });
        }
    }, 1000); // Check every second
}

// Start the process when the DOM is fully loaded
window.addEventListener('load', () => {
    console.log('Google Meet Transcript extension loaded');
    waitForMeeting();
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const meetingId = getMeetingId();

    if (request.action === 'startCapturing') {
        startCapturing();

        // Add timestamp when recording started
        if (transcript.length === 0 ||
            !transcript[transcript.length - 1].includes('--- Recording Started ---')) {
            transcript.push(`\n--- Recording Started at ${new Date().toLocaleString()} ---\n`);
        }

        saveTranscriptToStorage();
        sendResponse({ success: true, isCapturing: isCapturing });
        return true;

    } else if (request.action === 'stopCapturing') {
        stopCapturing();

        // Add timestamp when recording stopped
        transcript.push(`\n--- Recording Stopped at ${new Date().toLocaleString()} ---\n`);

        saveTranscriptToStorage();
        sendResponse({ success: true, isCapturing: isCapturing });
        return true;

    } // ... inside chrome.runtime.onMessage.addListener ...
} else if (request.action === 'downloadTranscript') {
    chrome.storage.local.get([`transcript_${meetingId}`], (result) => {
        const transcriptData = result[`transcript_${meetingId}`] || [];
        if (transcriptData.length > 0) {
            // Get meeting metadata
            const meetingTitle = document.querySelector('div[data-meeting-title]')?.innerText || 'Google Meet';
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // Create header with metadata
            const header = [
                `Meeting: ${meetingTitle}`,
                `Date: ${date}`,
                `Meeting ID: ${meetingId}`, // include once only
                `Number of entries: ${transcriptData.length}`,
                '-------------------------------------------',
                ''
            ].join('\n');

    } else if (request.action === 'getTranscriptStatus') {
        sendResponse({
            count: transcript.length,
            meetingId: meetingId,
            isCapturing: isCapturing
        });
        return true;

    } else if (request.action === 'clearTranscript') {
        // Clear transcript but keep status
        transcript = [];
        saveTranscriptToStorage();
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'downloadTranscript') {
        // Handle downloading transcript
        const meetingId = getMeetingId();
        chrome.storage.local.get([`transcript_${meetingId}`], (result) => {
            const transcriptData = result[`transcript_${meetingId}`] || [];
            if (transcriptData.length > 0) {
                // Get meeting metadata
                const meetingTitle = document.querySelector('div[data-meeting-title]')?.innerText || 'Google Meet';
                const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

                // Create header with metadata
                const header = [
                    `Meeting: ${meetingTitle}`,
                    `Date: ${date}`,
                    `Meeting ID: ${meetingId}`,
                    `Number of entries: ${transcriptData.length}`,
                    '-------------------------------------------',
                    ''
                ].join('\n');

                // Combine header with transcript
                const content = header + transcriptData.join('\n');

                // Create downloadable blob
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);

                // Send the blob URL to the background script for download
                chrome.runtime.sendMessage({ 
                    action: "download",
                    url: url
                }, (response) => {
                    if (response && response.success) {
                        console.log("Download initiated successfully");
                    } else {
                        console.error("Download failed:", response?.error);
                    }
                });
            } else {
                sendResponse({ url: null });
            }
        });
        return true; // Keep the messaging channel open
    }
});

// Save transcript when user leaves the page
window.addEventListener('beforeunload', () => {
    saveTranscriptToStorage();
});