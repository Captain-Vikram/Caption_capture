import requests
import json
from tabulate import tabulate

def get_models():
    url = "http://127.0.0.1:1234/v1/models"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        return f"Error: {response.text}"

def chat_completion(prompt, model_name="meta-llama-3.1-8b-instruct", temperature=0.7, context=None):
    url = "http://127.0.0.1:1234/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    
    messages = context if context else []
    messages.append({"role": "user", "content": prompt})
    
    data = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 200,
        "stream": False
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        result = response.json()
        return result["choices"][0]["message"]["content"]
    else:
        return f"Error: {response.text}"

def text_completion(prompt, model_name="meta-llama-3.1-8b-instruct", temperature=0.7):
    url = "http://127.0.0.1:1234/v1/completions"
    headers = {"Content-Type": "application/json"}
    data = {
        "model": model_name,
        "prompt": prompt,
        "temperature": temperature,
        "max_tokens": -1,
        "stream": False
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        result = response.json()
        return result["choices"][0]["text"]
    else:
        return f"Error: {response.text}"

def text_embedding(text):
    url = "http://127.0.0.1:1234/v1/embeddings"
    headers = {"Content-Type": "application/json"}
    data = {
        "model": "text-embedding-nomic-embed-text-v1.5",
        "input": text
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        result = response.json()
        return result["data"][0]["embedding"]
    else:
        return f"Error: {response.text}"

import re

def analyze_speech_and_score(speech_text, additional_prompt):
    """Analyze the provided speech text and generate a score."""
    prompt = f"Analyze the following speech text: {speech_text}. {additional_prompt}. Provide a score between 0 and 10 based on clarity, relevance, and technical depth. ONLY and ONLY a score between 0 and 10 will be accepted."
    
    response = chat_completion(prompt)

    try:
        response_json = json.loads(response) if isinstance(response, str) else response
        response_text = response_json["choices"][0]["message"]["content"].strip()
    except (json.JSONDecodeError, KeyError, TypeError):
        response_text = str(response).strip()


    # Try to extract a numerical score from the response
    try:
        score_match = re.search(r"\b\d+(?:\.\d+)?\b", response_text)  # Look for any number
        if score_match:
            score = float(score_match.group(0))
            return min(max(score, 0), 10)  # Clamp score between 0 and 10
        
        return 7.5  # Default score if no number is found
    except Exception:
        return "N/A"
