# Google Meet Captions & Participants Logger

## Overview
This Chrome extension captures **live captions** and **participant names** from Google Meet and saves them as a **transcript file with timestamps** for later review. It provides a simple popup interface to **start and stop** recording with a single click.

## Features
✅ **Real-time caption capture** from Google Meet.  
✅ **Automatic participant detection** (excluding yourself).  
✅ **Timestamps** added for accurate tracking.  
✅ **Saves transcript** as a downloadable text file.  
✅ **Easy to use** popup UI with start/stop buttons.  

## Installation
1. **Download or Clone** this repository.
2. Open **Google Chrome** and navigate to `chrome://extensions/`.
3. **Enable Developer Mode** (top-right corner).
4. Click **Load Unpacked** and select the project folder.
5. The extension icon will appear in the Chrome toolbar.

## Usage
1. Open **Google Meet** and start a meeting.
2. Click the extension icon and select **"Start Recording"**.
3. The extension will **capture captions & participants**.
4. Click **"Stop & Download"** to save the transcript as a text file.

## Files & Code Structure
- `manifest.json` – Configures the Chrome extension.
- `content.js` – Captures captions and participant names.
- `popup.html` – Provides the user interface.
- `popup.js` – Handles user interactions.
- `background.js` – Manages file downloads.
- `icon.png` – Icon for the extension.

## Future Enhancements
- Support for **multiple languages** in captions.
- **Custom filename format** for transcripts.
- **Cloud storage integration** for saving transcripts online.

## License
This project is licensed under the **MIT License**.

## Contributing
Feel free to **fork**, submit **pull requests**, or **open issues** to improve the extension!

