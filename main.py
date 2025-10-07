import asyncio
import json
import logging
import os
import queue
from typing import Dict

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from song_data import song_refrains
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from google.api_core.client_options import ClientOptions
from google.cloud import storage
from google.cloud.speech_v2 import (
    RecognitionConfig,
    RecognitionFeatures,
    SpeechClient,
    StreamingRecognitionConfig,
    StreamingRecognitionFeatures,
    StreamingRecognizeRequest,
    ExplicitDecodingConfig,
)
import uuid
from pydantic import BaseModel

# --- Server-side cache for scores ---
# This is a simple in-memory cache. In a production/scaled environment,
# you would replace this with a more robust solution like Redis or Memcached.
score_cache: Dict[str, int] = {}

# --- Configuration ---
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT")
LOCATION = "us-central1"
RECOGNIZER_NAME = f"projects/{PROJECT_ID}/locations/{LOCATION}/recognizers/_"
 
# GCS configuration for high scores
HIGH_SCORES_BUCKET = os.environ.get("HIGH_SCORES_BUCKET")
HIGH_SCORES_FILE_NAME = os.environ.get("HIGH_SCORES_FILE", "high_scores.json")
MAX_HIGH_SCORES = 10

# --- FastAPI App Initialization ---
logging.basicConfig(level=logging.INFO)
app = FastAPI()
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# --- Mount static directories and templates ---
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- Google Cloud Clients ---
speech_client_options = ClientOptions(api_endpoint=f"{LOCATION}-speech.googleapis.com")
speech_client = SpeechClient(client_options=speech_client_options)
storage_client = storage.Client()
logging.info("Google Cloud clients initialized successfully.")

class HighScore(BaseModel):
    name: str
    score: int

class ScoreRequest(BaseModel):
    song_key: str
    words: list

class SaveScoreRequest(BaseModel):
    name: str
    score_id: str

def _get_gcs_blob():
    """Helper to get the GCS blob object."""
    if not HIGH_SCORES_BUCKET:
        logging.error("HIGH_SCORES_BUCKET environment variable not set.")
        return None
    if not storage_client:
        logging.error("Storage client not initialized.")
        return None
    bucket = storage_client.bucket(HIGH_SCORES_BUCKET)
    return bucket.blob(HIGH_SCORES_FILE_NAME)

def get_high_scores():
    """Reads high scores from Google Cloud Storage."""
    blob = _get_gcs_blob()
    if not blob:
        return []
    try:
        if not blob.exists():
            logging.info("High scores file not found in GCS, returning empty list.")
            return []
        content = blob.download_as_string()
        return json.loads(content)
    except Exception as e:
        logging.error(f"Failed to read high scores from GCS: {e}")
        return []

def save_high_scores(scores):
    """Saves high scores to Google Cloud Storage."""
    blob = _get_gcs_blob()
    if not blob:
        return
    try:
        content = json.dumps(scores, indent=4)
        blob.upload_from_string(content, content_type="application/json")
        logging.info(f"Successfully saved high scores to gs://{HIGH_SCORES_BUCKET}/{HIGH_SCORES_FILE_NAME}")
    except Exception as e:
        logging.error(f"Failed to save high scores to GCS: {e}")

def normalize_text(text: str) -> str:
    """Normalize text by lowercasing and removing punctuation."""
    return text.lower().replace(r"[^\w\s]", "").strip()

def calculate_detailed_score(user_words: list, original_words: list) -> dict:
    """Calculate a detailed score based on timing, accuracy, and confidence."""
    if not user_words or not original_words:
        return {
            "overallScore": 0,
            "confidenceScore": 0,
            "accuracyScore": 0,
            "timingScore": 0,
        }

    user_start_time = user_words[0]["startTime"]
    original_start_time = original_words[0]["startTime"]

    normalized_user_words = [
        {
            **w,
            "word": normalize_text(w["word"]),
            "relativeStart": w["startTime"] - user_start_time,
        }
        for w in user_words
    ]

    normalized_original_words = [
        {
            **w,
            "word": normalize_text(w["word"]),
            "relativeStart": w["startTime"] - original_start_time,
        }
        for w in original_words
    ]

    matches = 0
    total_confidence = 0
    total_timing_error = 0
    max_timing_error = 1.0
    original_index = 0

    for user_word in normalized_user_words:
        for j in range(original_index, len(normalized_original_words)):
            if user_word["word"] == normalized_original_words[j]["word"]:
                original_word = normalized_original_words[j]
                matches += 1
                total_confidence += user_word["confidence"]
                timing_error = abs(user_word["relativeStart"] - original_word["relativeStart"])
                total_timing_error += timing_error
                original_index = j + 1
                break

    accuracy_score = (matches / len(original_words)) * 100 if original_words else 0
    avg_confidence = total_confidence / matches if matches > 0 else 0
    confidence_score = avg_confidence * 100

    timing_score = 0
    if matches > 0:
        avg_timing_error = total_timing_error / matches
        timing_score = max(0, (1 - avg_timing_error / max_timing_error) * 100)

    overall_score = min(
        100,
        accuracy_score * 0.5 + confidence_score * 0.3 + timing_score * 0.2,
    )

    return {
        "overallScore": round(overall_score),
        "confidenceScore": round(confidence_score),
        "accuracyScore": round(accuracy_score),
        "timingScore": round(timing_score),
    }

@app.get("/")
async def root(request: Request):
    """Serve the main HTML page."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/high-scores")
async def high_scores():
    """Provide the list of high scores."""
    scores = get_high_scores()
    return JSONResponse(content=scores[:MAX_HIGH_SCORES])

@app.post("/api/high-scores")
async def add_high_score(request: SaveScoreRequest):
    """Add a new high score from a cached score, efficiently."""
    score_id = request.score_id
    score_value = score_cache.get(score_id) # Renamed to avoid confusion

    if score_value is None:
        return JSONResponse(
            content={"error": "Invalid or expired score ID."},
            status_code=400,
        )

    # Invalidate the score_id immediately to prevent reuse
    del score_cache[score_id]

    scores = get_high_scores()

    # Check if the new score is high enough to be on the leaderboard
    if len(scores) >= MAX_HIGH_SCORES:
        # scores are sorted descending, so the last element is the lowest
        lowest_high_score = scores[-1].get("score", 0)
        if score_value <= lowest_high_score:
            logging.info(f"Score {score_value} is not high enough to make the leaderboard.")
            return JSONResponse(content={"status": "success, but score not high enough"})

    # If the score is high enough or the board isn't full, add it
    new_high_score = HighScore(name=request.name, score=score_value)
    scores.append(new_high_score.dict())
    scores.sort(key=lambda s: s["score"], reverse=True)
    
    # Save the updated, truncated list
    save_high_scores(scores[:MAX_HIGH_SCORES])

    return JSONResponse(content={"status": "success"})

@app.get("/api/song/{song_key}")
async def get_song_data(song_key: str):
    """Provide the data for a specific song."""
    song = song_refrains.get(song_key)
    if not song:
        return JSONResponse(content={"error": "Song not found"}, status_code=404)
    
    song_for_client = song.copy()
    del song_for_client["words"]
    return JSONResponse(content=song_for_client)

@app.post("/api/score")
async def score(request: ScoreRequest):
    """Calculate the score for a given song and user words."""
    song_data = song_refrains.get(request.song_key)
    if not song_data:
        return JSONResponse(content={"error": "Song not found"}, status_code=404)

    score_details = calculate_detailed_score(request.words, song_data["words"])
    overall_score = score_details.get("overallScore", 0)

    # Generate a unique ID for this score and cache it for a short time
    score_id = str(uuid.uuid4())
    score_cache[score_id] = overall_score
    logging.info(f"Cached score {overall_score} with ID {score_id}")

    # Return the detailed score and the score_id to the client
    response_data = {**score_details, "score_id": score_id}
    return JSONResponse(content=response_data)


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
        logging.info("gRPC stream producer started.")

        for response in stream:
            for result in response.results:
                if not result.alternatives:
                    continue
                print(result.alternatives[0].words)
                words_list = [
                    {
                        "word": word.word,
                        "startTime": word.start_offset.seconds,
                        "endTime": word.end_offset.seconds,
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
        logging.error(f"Error in gRPC stream producer: {e}", exc_info=True)
    finally:
        results_queue.put_nowait(None)  # Sentinel value to signal end of stream
        logging.info("gRPC stream producer ended.")

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
                        logging.info("Received stop signal from client.")
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
        logging.warning("Client disconnected.")
    except Exception as e:
        logging.error(f"An error occurred in WebSocket handler: {e}", exc_info=True)
    finally:
        # Ensure the gRPC task is cleaned up
        if 'grpc_task' in locals() and not grpc_task.done():
            grpc_task.cancel()
        logging.info("Transcription session ended for a client.")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
