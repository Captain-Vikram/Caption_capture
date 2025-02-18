// Update the status display with current transcript information
function updateStatus() {
    const statusElement = document.getElementById('status');
    const downloadButton = document.getElementById('download');
    const clearButton = document.getElementById('clear');
    const startButton = document.getElementById('start-btn');
    const stopButton = document.getElementById('stop-btn');
    const meetingInfoElement = document.getElementById('meeting-info');
    const recordingIndicator = document.getElementById('recording-indicator');

    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const currentTab = tabs[0];

        // Check if we're on a Google Meet page
        if (currentTab.url.includes('meet.google.com')) {
            // Send message to content script to get transcript status
            chrome.tabs.sendMessage(currentTab.id, { action: 'getTranscriptStatus' }, response => {
                if (chrome.runtime.lastError) {
                    // Handle error (extension not initialized on this page yet)
                    statusElement.textContent = 'No active meeting detected. Join a meeting to use this extension.';
                    downloadButton.disabled = true;
                    clearButton.disabled = true;
                    startButton.disabled = true;
                    stopButton.disabled = true;
                    recordingIndicator.classList.remove('active');
                    return;
                }

                if (response && response.meetingId) {
                    // Update button states based on capturing status
                    if (response.isCapturing) {
                        startButton.disabled = true;
                        stopButton.disabled = false;
                        recordingIndicator.classList.add('active');
                    } else {
                        startButton.disabled = false;
                        stopButton.disabled = true;
                        recordingIndicator.classList.remove('active');
                    }

                    // Update download and clear buttons based on transcript availability
                    if (response.count > 0) {
                        downloadButton.disabled = false;
                        clearButton.disabled = false;

                        // Update status message
                        if (response.isCapturing) {
                            statusElement.textContent = `${response.count} caption entries captured and recording in progress.`;
                        } else {
                            statusElement.textContent = `${response.count} caption entries captured. Click Start to continue recording.`;
                        }

                        // Get saved meeting data
                        chrome.storage.local.get([`lastUpdated_${response.meetingId}`], result => {
                            const lastUpdated = result[`lastUpdated_${response.meetingId}`];
                            if (lastUpdated) {
                                const date = new Date(lastUpdated);
                                meetingInfoElement.textContent = `Meeting ID: ${response.meetingId}\nLast updated: ${date.toLocaleString()}`;
                            } else {
                                meetingInfoElement.textContent = `Meeting ID: ${response.meetingId}`;
                            }
                        });
                    } else {
                        downloadButton.disabled = true;
                        clearButton.disabled = true;

                        if (response.isCapturing) {
                            statusElement.textContent = 'Capture started. Waiting for captions...';
                        } else {
                            statusElement.textContent = 'Ready to capture. Click Start when you want to begin recording captions.';
                        }

                        meetingInfoElement.textContent = response.meetingId
                            ? `Meeting ID: ${response.meetingId}`
                            : '';
                    }
                } else {
                    // Unable to get proper response
                    statusElement.textContent = 'Waiting for meeting to be fully loaded...';
                    downloadButton.disabled = true;
                    clearButton.disabled = true;
                    startButton.disabled = true;
                    stopButton.disabled = true;
                    recordingIndicator.classList.remove('active');
                }
            });
        } else {
            // Not on a Google Meet page
            statusElement.textContent = 'Please open Google Meet to use this extension.';
            downloadButton.disabled = true;
            clearButton.disabled = true;
            startButton.disabled = true;
            stopButton.disabled = true;
            recordingIndicator.classList.remove('active');
        }
    });
}

// Start capturing captions
function startCapturing() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startCapturing' }, response => {
            if (response && response.success) {
                updateStatus();
            } else {
                // Handle error
                document.getElementById('status').textContent = 'Failed to start capturing. Please check if captions are enabled.';
            }
        });
    });
}

// Stop capturing captions
function stopCapturing() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCapturing' }, response => {
            if (response && response.success) {
                updateStatus();
            } else {
                // Handle error
                document.getElementById('status').textContent = 'Failed to stop capturing.';
            }
        });
    });
}

// Download the transcript
function downloadTranscript() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'downloadTranscript' }, response => {
            if (response && response.url) {
                chrome.downloads.download({
                    url: response.url,
                    filename: response.filename || 'transcript.txt',
                    saveAs: true
                });
            } else {
                document.getElementById('status').textContent = 'No transcript available to download.';
            }
        });
    });
}

// Clear the transcript
function clearTranscript() {
    if (confirm('Are you sure you want to clear the current transcript? This cannot be undone.')) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'clearTranscript' }, response => {
                if (response && response.success) {
                    updateStatus();
                    document.getElementById('status').textContent = 'Transcript cleared successfully.';
                } else {
                    document.getElementById('status').textContent = 'Failed to clear transcript.';
                }
            });
        });
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    // Set up button click handlers
    document.getElementById('start-btn').addEventListener('click', startCapturing);
    document.getElementById('stop-btn').addEventListener('click', stopCapturing);
    document.getElementById('download').addEventListener('click', downloadTranscript);
    document.getElementById('clear').addEventListener('click', clearTranscript);

    // Update status immediately
    updateStatus();

    // Set up periodic status updates (less frequent to reduce CPU usage)
    setInterval(updateStatus, 3000);
});