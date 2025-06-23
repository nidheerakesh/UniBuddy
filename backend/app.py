# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
app = Flask(__name__)
CORS(app) 

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

TONE_PROMPTS = {
    "neutral": "",
    "friendly": "Adopt a friendly and approachable tone.",
    "formal": "Maintain a formal and professional tone.",
    "humorous": "Add a touch of humor.",
}

LANGUAGE_PROMPTS = {
    "english": "Explain in clear English.",
    "hindi": "Explain in Hindi.",
    "spanish": "Explain in Spanish.",
    # Add more languages as needed
}

MODE_PROMPTS = {
    "5": "Explain this as if you are talking to a very young child (5-year-old). Use extremely simple words, very short sentences. Avoid any jargon or complex ideas completely. Be super simple.",
    "10": "Explain this in a way that a 10-year-old could easily understand. Use clear, straightforward language, give simple analogies or examples, and avoid overly complex terms. Focus on the main idea and make it accessible.",
    "15": "Explain this as you would to a curious student. Provide a clear, concise, and accurate explanation. You can use some scientific or technical terms if necessary, but make sure to briefly explain them if they might be unfamiliar. Aim for a good balance of detail and clarity, suitable for a bright student.",
    "genz": "You are the user's genz friend . Use contemporary language, relatable examples, and a tone that is engaging and relevant to younger audiences. Avoid overly formal language and connect with current trends or cultural references.",
    "nerd": "You are a college guide. give educational advice, academic insights, and career guidance. Use a tone that is knowledgeable yet approachable, suitable for someone seeking to deepen their understanding of a subject or explore academic opportunities."
}

@app.route('/')
def index():
    return "Backend is running!"

@app.route('/explain', methods=['POST'])
def explain():
    data = request.get_json()
    user_prompt = data.get('prompt')
    conversation_history = data.get('history', [])
    selected_language = data.get('language', 'english')
    selected_tone = data.get('tone', 'neutral')
    selected_mode = data.get('mode', '10')
    is_first_turn = data.get('is_first_turn', False)

    if not user_prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        model = genai.GenerativeModel('gemini-1.5-flash-002')

        lang_modifier = LANGUAGE_PROMPTS.get(selected_language, "")
        tone_modifier = TONE_PROMPTS.get(selected_tone, "")
        mode_modifier = MODE_PROMPTS.get(selected_mode, "")

        initial_turn_instruction = "Your reply should be short but long enough for the concept to be clear"
        follow_up_turn_instruction = "Continue the explanation or elaborate as requested, maintaining context from previous messages. Avoid conversational filler."

        system_instruction_parts = []
        system_instruction_parts.append("You are an AI assistant specialized in explaining concepts clearly.")
        system_instruction_parts.append("Format your responses using Markdown for better readability (e.g., bold, italics, bullet points, code blocks).") # NEW LINE
        if lang_modifier:
            system_instruction_parts.append(lang_modifier)
        if tone_modifier:
            system_instruction_parts.append(tone_modifier)
        if mode_modifier:
            system_instruction_parts.append(mode_modifier)
            
        if is_first_turn:
             system_instruction_parts.append(initial_turn_instruction)
        else:
             system_instruction_parts.append(follow_up_turn_instruction)

        full_gemini_prompt = []
        full_gemini_prompt.append(" ".join(system_instruction_parts))

        for msg in conversation_history:
            full_gemini_prompt.append(f"{msg['role'].capitalize()}: {msg['text']}")
        
        full_gemini_prompt.append(f"User: {user_prompt}")
        
        prompt_for_gemini = "\n".join(full_gemini_prompt)

        response = model.generate_content(prompt_for_gemini)
        explanation = response.candidates[0].content.parts[0].text
        return jsonify({"explanation": explanation}), 200

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
