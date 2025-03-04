// Listen for messages from content.js or popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download") {
        // Trigger the download of the transcript file
        chrome.downloads.download({
            url: message.url, // The blob URL of the transcript
            filename: "Meet_Transcript_" + new Date().toISOString().replace(/:/g, "-") + ".txt", // Filename with timestamp
            saveAs: true // Prompt the user to save the file
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error("Download failed:", chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError });
            } else {
                console.log("Download started with ID:", downloadId);
                sendResponse({ success: true });
            }
        });
        return true; // Keep the message channel open for async response
    }
});