from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS  # Import the CORS module

from LLM import analyze_speech_and_score

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/analyze', methods=['POST', 'OPTIONS'])  # Added OPTIONS method
def analyze():
    # For preflight OPTIONS requests
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    data = request.json
    speech_text = data.get('speech_text')
    additional_prompt = data.get('additional_prompt')
    if not speech_text or not additional_prompt:
        return jsonify({'error': 'Invalid input'}), 400

    result = analyze_speech_and_score(speech_text, additional_prompt)
    return jsonify({"score": result})

if __name__ == '__main__':
    app.run(port=5000)