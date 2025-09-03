import asyncio
import io
import json
import logging
import os
import queue
import random
from typing import Dict

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from google.api_core.client_options import ClientOptions
from google.cloud import speech_v2, texttospeech
from google.cloud.speech_v2 import (
    RecognitionConfig,
    RecognitionFeatures,
    SpeechClient,
    StreamingRecognitionConfig,
    StreamingRecognitionFeatures,
    StreamingRecognizeRequest,
    ExplicitDecodingConfig,
)
from pydantic import BaseModel

# --- Configuration ---
PROJECT_ID = "rgodoy-sandbox"
LOCATION = "us-central1"
RECOGNIZER_NAME = f"projects/{PROJECT_ID}/locations/{LOCATION}/recognizers/_"

# --- FastAPI App Initialization ---
logging.basicConfig(level=logging.INFO)
app = FastAPI()
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# --- Mount static directories and templates ---
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# --- Google Cloud Clients ---
try:
    tts_client = texttospeech.TextToSpeechClient()
    speech_client_options = ClientOptions(api_endpoint=f"{LOCATION}-speech.googleapis.com")
    speech_client = SpeechClient(client_options=speech_client_options)
    print("Google Cloud clients initialized successfully.")
except Exception as e:
    print(f"Error initializing Google Cloud clients: {e}")
    print("Please ensure your Google Cloud credentials are configured correctly.")
    tts_client = None
    speech_client = None


# --- Phrase List (from original front-end) ---
phrases = [
    "Hello world", "How are you", "What is your name", "Good morning",
    "Thank you very much", "Excuse me please", "I am sorry", "Have a nice day",
    "The sky is blue", "I love to travel",
    "The quick brown fox jumps over the lazy dog",
    "An apple a day keeps the doctor away",
    "Never underestimate the power of a good book",
    "The early bird catches the worm", "Actions speak louder than words",
    "Where there is a will, there is a way", "Technology has changed the world we live in",
    "To be or not to be, that is the question", "Every cloud has a silver lining",
    "The best way to predict the future is to create it", "Honesty is the best policy",
    "In the middle of difficulty lies opportunity",
    "The only thing we have to fear is fear itself",
    "That which does not kill us makes us stronger",
    "The journey of a thousand miles begins with a single step",
]

# --- Pydantic Models ---
class SynthesizeRequest(BaseModel):
    text: str

# =================================================================================
# --- HTTP Routes (from original front-end) ---
# =================================================================================

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Serve the main application page."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/new-phrase")
async def new_phrase():
    """Provide a new random phrase."""
    return JSONResponse(content={"phrase": random.choice(phrases)})

@app.post("/api/synthesize")
async def synthesize_speech(request_data: SynthesizeRequest):
    """Generate audio from text using Google TTS."""
    if not tts_client:
        return JSONResponse(content={"error": "TTS Client not initialized"}, status_code=500)

    try:
        synthesis_input = texttospeech.SynthesisInput(text=request_data.text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US", name="en-US-Chirp3-HD-Charon"
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        response = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        return StreamingResponse(io.BytesIO(response.audio_content), media_type="audio/mpeg")
    except Exception as e:
        print(f"Error in Google TTS API: {e}")
        return JSONResponse(content={"error": "Failed to synthesize speech"}, status_code=500)

# =================================================================================
# --- WebSocket Logic (from original back-end) ---
# =================================================================================

def audio_request_generator(audio_queue: queue.Queue, recognizer, config):
    """Yields audio chunks from a queue to the gRPC stream."""
    yield StreamingRecognizeRequest(recognizer=recognizer, streaming_config=config)
    while True:
        chunk = audio_queue.get()
        if chunk is None:
            break
        yield StreamingRecognizeRequest(audio=chunk)

def run_grpc_stream(audio_queue: queue.Queue, results_queue: asyncio.Queue, language_code: str):
    """Runs the blocking gRPC stream and puts transcription results in a queue."""
    try:
        streaming_config = StreamingRecognitionConfig(
            config=RecognitionConfig(
                 explicit_decoding_config=ExplicitDecodingConfig(
                    encoding="LINEAR16",
                    sample_rate_hertz=16000,
                    audio_channel_count=1
                ),
                language_codes=[language_code],
                features=RecognitionFeatures(
                    enable_word_time_offsets=True,
                    enable_word_confidence=True,
                    enable_automatic_punctuation=True
                ),
                model="chirp_2"
            ),
            streaming_features=StreamingRecognitionFeatures(interim_results=True),
        )

        requests = audio_request_generator(audio_queue, RECOGNIZER_NAME, streaming_config)
        stream = speech_client.streaming_recognize(requests=requests)
        print("gRPC stream producer started.")

        for response in stream:
            for result in response.results:
                if not result.alternatives:
                    continue
                words_list = [
                    {
                        "word": word.word,
                        "startTime": word.start_offset.total_seconds(),
                        "endTime": word.end_offset.total_seconds(),
                        "confidence": word.confidence,
                    }
                    for word in result.alternatives[0].words
                ] if result.alternatives and result.alternatives[0].words else []

                message: Dict = {
                    "transcript": result.alternatives[0].transcript,
                    "isFinal": result.is_final,
                    "words": words_list,
                }
                results_queue.put_nowait(message)

    except Exception as e:
        print(f"Error in gRPC stream producer: {e}")
    finally:
        results_queue.put_nowait(None)  # Sentinel value to signal end of stream
        print("gRPC stream producer ended.")

@app.websocket("/listen")
async def websocket_endpoint(websocket: WebSocket, language_code: str = "en-US"):
    """Handle WebSocket connection for real-time transcription."""
    await websocket.accept()
    logging.info(f"Listener connected with language_code: {language_code}")

    audio_queue = queue.Queue()
    results_queue = asyncio.Queue()

    async def receive_from_client():
        """Receive audio from the client and put it into the audio_queue."""
        try:
            while True:
                message = await websocket.receive()
                if "bytes" in message:
                    audio_queue.put(message["bytes"])
                elif "text" in message:
                    data = json.loads(message["text"])
                    if data.get("action") == "stop":
                        print("Received stop signal from client.")
                        break
        finally:
            audio_queue.put(None)

    async def send_to_client():
        """Get transcription results from the results_queue and send to the client."""
        while True:
            message = await results_queue.get()
            if message is None:
                break
            await websocket.send_text(json.dumps(message))
        await websocket.close()

    loop = asyncio.get_running_loop()

    try:
        grpc_task = loop.run_in_executor(
            None, run_grpc_stream, audio_queue, results_queue, language_code
        )
        await asyncio.gather(receive_from_client(), send_to_client(), grpc_task)
    except WebSocketDisconnect:
        logging.warning("Client disconnected unexpectedly.")
    except Exception as e:
        logging.error(f"An error occurred in WebSocket handler: {e}", exc_info=True)
    finally:
        logging.info("Transcription session ended.")

# --- Server Startup ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
