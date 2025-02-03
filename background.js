chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download") {
        chrome.downloads.download({
            url: message.url,
            filename: "Meet_Transcript_" + new Date().toISOString().replace(/:/g, "-") + ".txt",
            saveAs: true
        });
    }
});
