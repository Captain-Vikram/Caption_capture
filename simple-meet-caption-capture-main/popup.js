// Update the status display with current transcript information
function updateStatus() {
    const statusElement = document.getElementById('status');
    const downloadButton = document.getElementById('download');
    const clearButton = document.getElementById('clear');
    const analyzeButton = document.getElementById('analyze'); // Reference to analyze button
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
                    analyzeButton.disabled = true; // Disable analyze button
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

                    // Update download, clear, and analyze buttons based on transcript availability
                    if (response.count > 0) {
                        downloadButton.disabled = false;
                        clearButton.disabled = false;
                        analyzeButton.disabled = false; // Enable analyze button when transcript is available

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
                        analyzeButton.disabled = true; // Disable analyze button when no transcript

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
                    analyzeButton.disabled = true; // Disable analyze button
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
            analyzeButton.disabled = true; // Disable analyze button
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'downloadTranscript' }, (response) => {
            if (response && response.url) {
                // Send the blob URL to the background script for download
                chrome.runtime.sendMessage({ 
                    action: "download",
                    url: response.url
                }, (downloadResponse) => {
                    if (downloadResponse && downloadResponse.success) {
                        console.log("Download initiated successfully");
                    } else {
                        console.error("Download failed:", downloadResponse?.error);
                    }
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

// Show analysis popup
function showAnalysisPopup(analysis) {
    // Create popup elements
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    const popup = document.createElement('div');
    popup.style.backgroundColor = 'white';
    popup.style.borderRadius = '8px';
    popup.style.padding = '20px';
    popup.style.maxWidth = '80%';
    popup.style.maxHeight = '80%';
    popup.style.overflow = 'auto';
    popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';

    const title = document.createElement('h2');
    title.textContent = 'Transcript Analysis';
    title.style.color = '#1a73e8';
    title.style.marginTop = '0';

    const content = document.createElement('div');
    content.innerHTML = analysis.replace(/\n/g, '<br>');
    content.style.marginBottom = '20px';

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '8px 16px';
    closeButton.style.backgroundColor = '#f5f5f5';
    closeButton.style.border = '1px solid #ddd';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(overlay);

    // Assemble popup
    popup.appendChild(title);
    popup.appendChild(content);
    popup.appendChild(closeButton);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

// Analyze the transcript
function analyzeTranscript() {
    // Disable the analyze button and update status to show processing
    const analyzeButton = document.getElementById('analyze');
    const statusElement = document.getElementById('status');
    analyzeButton.disabled = true;
    statusElement.textContent = 'Analyzing transcript...';
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getTranscript' }, (response) => {
            if (response && response.transcript && response.transcript.length > 0) {
                const speechText = response.transcript.join('\n');
                const additionalPrompt = "Provide a detailed analysis of this meeting transcript. Include key topics discussed, action items identified, and an overall summary.";

                // Loading indicator in status
                statusElement.textContent = 'Sending to analysis server...';
                
                fetch('http://127.0.0.1:5000/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ speech_text: speechText, additional_prompt: additionalPrompt })
                })
                .then(res => res.json())
                .then(data => {
                    if (!data || data.error) {
                        throw new Error(data.error || "Invalid response from server");
                    }
                    analyzeButton.disabled = false;
                    statusElement.textContent = 'Analysis complete!';
                    showAnalysisPopup(data.analysis || `Analysis Score: ${data.score}`);
                })
                .catch(error => {
                    console.error('Error analyzing transcript:', error);
                    statusElement.textContent = 'Error analyzing transcript.';
                    analyzeButton.disabled = false;
                    alert('Analysis failed: ' + error.message);
                });
            } else {
                statusElement.textContent = 'No transcript available to analyze.';
                analyzeButton.disabled = false;
            }
        });
    });
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    // Set up button click handlers
    document.getElementById('start-btn').addEventListener('click', startCapturing);
    document.getElementById('stop-btn').addEventListener('click', stopCapturing);
    document.getElementById('download').addEventListener('click', downloadTranscript);
    document.getElementById('clear').addEventListener('click', clearTranscript);
    document.getElementById('analyze').addEventListener('click', analyzeTranscript);

    // Update status immediately
    updateStatus();

    // Set up periodic status updates (less frequent to reduce CPU usage)
    setInterval(updateStatus, 3000);
});