import os
import random
from flask import Flask, render_template, jsonify, request, send_file
from google.cloud import texttospeech
import io

app = Flask(__name__)

# --- Configuração do Cliente Google Cloud TTS ---
# As credenciais são detectadas automaticamente se você configurou o gcloud CLI
# ou se a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS está definida.
try:
    tts_client = texttospeech.TextToSpeechClient()
except Exception as e:
    print(f"Erro ao inicializar o cliente Text-to-Speech: {e}")
    print("Certifique-se de que suas credenciais do Google Cloud estão configuradas.")
    tts_client = None

# --- Lista de Frases ---
phrases = [
    # Frases Curtas e Comuns
    "Hello world",
    "How are you",
    "What is your name",
    "Good morning",
    "Thank you very much",
    "Excuse me please",
    "I am sorry",
    "Have a nice day",
    "The sky is blue",
    "I love to travel",

    # Frases de Comprimento Médio
    "The quick brown fox jumps over the lazy dog",
    "An apple a day keeps the doctor away",
    "Never underestimate the power of a good book",
    "The early bird catches the worm",
    "Actions speak louder than words",
    "Where there is a will, there is a way",
    "Technology has changed the world we live in",
    "I am looking forward to the weekend",
    "She sells seashells by the seashore",
    "To be or not to be, that is the question",
    "Every cloud has a silver lining",
    "The best way to predict the future is to create it",
    "Honesty is the best policy",
    "You can't judge a book by its cover",
    "The pen is mightier than the sword",

    # Frases Mais Longas e Complexas
    "In the middle of difficulty lies opportunity",
    "The only thing we have to fear is fear itself",
    "That which does not kill us makes us stronger",
    "Ask not what your country can do for you, ask what you can do for your country",
    "The journey of a thousand miles begins with a single step",
    "All that glitters is not gold",
    "A picture is worth a thousand words",
    "Beauty is in the eye of the beholder",
    "Curiosity killed the cat, but satisfaction brought it back",
    "Don't count your chickens before they hatch",
    "Fortune favors the bold",
    "If it ain't broke, don't fix it",
    "Knowledge is power",
    "Laughter is the best medicine",
    "Practice makes perfect",
    "The squeaky wheel gets the grease",
    "Time and tide wait for no man",
    "Two heads are better than one",
    "When in Rome, do as the Romans do",
    "You can lead a horse to water, but you can't make it drink",
    "A watched pot never boils",
    "Beggars can't be choosers",
    "Hope for the best, but prepare for the worst",
    "There's no place like home"
]

# --- Rotas da API ---

@app.route("/")
def index():
    """Serve a página principal do jogo."""
    return render_template("index.html")

@app.route("/api/new-phrase")
def new_phrase():
    """Fornece uma nova frase aleatória."""
    phrase = random.choice(phrases)
    return jsonify({"phrase": phrase})

@app.route("/api/synthesize", methods=["POST"])
def synthesize_speech():
    """Gera áudio a partir de um texto usando Google TTS."""
    if not tts_client:
        return jsonify({"error": "TTS Client not initialized"}), 500

    data = request.get_json()
    text = data.get("text")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    synthesis_input = texttospeech.SynthesisInput(text=text)

    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Chirp3-HD-Charon"
    )

    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    try:
        response = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        # Retorna o áudio como um arquivo para o navegador
        return send_file(
            io.BytesIO(response.audio_content),
            mimetype="audio/mpeg",
            as_attachment=False
        )
    except Exception as e:
        print(f"Erro na API do Google TTS: {e}")
        return jsonify({"error": "Failed to synthesize speech"}), 500

if __name__ == "__main__":
    # O Flask irá rodar na porta 5000 por padrão.
    app.run(debug=True)