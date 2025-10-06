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
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from google.api_core.client_options import ClientOptions
from google.cloud import storage, texttospeech
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
try:
    tts_client = texttospeech.TextToSpeechClient()
    speech_client_options = ClientOptions(api_endpoint=f"{LOCATION}-speech.googleapis.com")
    speech_client = SpeechClient(client_options=speech_client_options)
    storage_client = storage.Client()
    logging.info("Google Cloud clients initialized successfully.")
except Exception as e:
    logging.critical(f"Error initializing Google Cloud clients: {e}", exc_info=True)
    logging.critical("Please ensure your Google Cloud credentials are configured correctly.")
    tts_client = None
    speech_client = None
    storage_client = None

# --- Pydantic Models ---
class SynthesizeRequest(BaseModel):
    text: str

class HighScore(BaseModel):
    name: str
    score: int

class ScoreRequest(BaseModel):
    song_key: str
    words: list

class SaveScoreRequest(BaseModel):
    name: str
    score_id: str

# --- GCS High Score Helper Functions ---
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


# --- Scoring and Text Helper Functions ---
def normalize_text(text: str) -> str:
    """Normalize text by lowercasing and removing punctuation."""
    return text.lower().replace(r"[^\w\s]", "").strip()

def process_words(words):
    """Helper function to process word timings."""
    return [
        {
            "word": w["word"].lower().replace(r"[^\w\s]", "").strip(),
            "startTime": float(w.get("startOffset", "0s").replace("s", "")),
            "endTime": float(w.get("endOffset", "0s").replace("s", "")),
        }
        for w in words
    ]

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

# --- Data ---
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

song_refrains = {
    "aranha": {
      "time": 18,
      "language": "pt-BR",
      "text": "A dona aranha subiu pela parede\nVeio a chuva forte e a derrubou\nJá passou a chuva e o sol já vai surgindo\nE a dona aranha continua a subir",
      "words": process_words([
        {"startOffset": "0.800s", "endOffset": "1.200s", "word": "A"},
        {"startOffset": "1.240s", "endOffset": "1.680s", "word": "dona"},
        {"startOffset": "1.680s", "endOffset": "2.440s", "word": "aranha"},
        {"startOffset": "2.440s", "endOffset": "2.960s", "word": "subiu"},
        {"startOffset": "2.960s", "endOffset": "3.440s", "word": "pela"},
        {"startOffset": "3.440s", "endOffset": "4.440s", "word": "parede,"},
        {"startOffset": "4.760s", "endOffset": "5.080s", "word": "veio"},
        {"startOffset": "5.080s", "endOffset": "5.160s", "word": "a"},
        {"startOffset": "5.160s", "endOffset": "5.640s", "word": "chuva"},
        {"startOffset": "5.640s", "endOffset": "6.880s", "word": "forte"},
        {"startOffset": "6.880s", "endOffset": "7.040s", "word": "e"},
        {"startOffset": "7.040s", "endOffset": "7.160s", "word": "a"},
        {"startOffset": "7.160s", "endOffset": "7.960s", "word": "derrubou."},
        {"startOffset": "8.720s", "endOffset": "8.880s", "word": "Já"},
        {"startOffset": "8.880s", "endOffset": "9.480s", "word": "passou"},
        {"startOffset": "9.480s", "endOffset": "9.560s", "word": "a"},
        {"startOffset": "9.560s", "endOffset": "10.480s", "word": "chuva"},
        {"startOffset": "10.480s", "endOffset": "10.520s", "word": "e"},
        {"startOffset": "10.520s", "endOffset": "10.560s", "word": "o"},
        {"startOffset": "10.760s", "endOffset": "10.960s", "word": "sol"},
        {"startOffset": "10.960s", "endOffset": "11.160s", "word": "já"},
        {"startOffset": "11.160s", "endOffset": "11.360s", "word": "vai"},
        {"startOffset": "11.360s", "endOffset": "12.400s", "word": "surgindo"},
        {"startOffset": "12.800s", "endOffset": "13.040s", "word": "e"},
        {"startOffset": "13.040s", "endOffset": "13.160s", "word": "a"},
        {"startOffset": "13.160s", "endOffset": "13.600s", "word": "dona"},
        {"startOffset": "13.600s", "endOffset": "14.160s", "word": "aranha"},
        {"startOffset": "14.160s", "endOffset": "15.280s", "word": "continua"},
        {"startOffset": "15.280s", "endOffset": "15.400s", "word": "a"},
        {"startOffset": "15.400s", "endOffset": "16s", "word": "subir."},
      ]),
    },
    "atirei": {
      "time": 20,
      "language": "pt-BR",
      "text": "Atirei o pau no gato-to\nMas o gato-to, não morreu-reu-reu\nDona chica-ca admirou-se-se do miau\nDo miau que o gato deu - miau!",
      "words": process_words([
        {"startOffset": "1.240s", "endOffset": "2.520s", "word": "Atirei"},
        {"startOffset": "2.520s", "endOffset": "2.600s", "word": "o"},
        {"startOffset": "2.600s", "endOffset": "3s", "word": "pau"},
        {"startOffset": "3s", "endOffset": "3.160s", "word": "no"},
        {"startOffset": "3.160s", "endOffset": "4.200s", "word": "gato,"},
        {"startOffset": "4.240s", "endOffset": "4.640s", "word": "to,"},
        {"startOffset": "4.640s", "endOffset": "5.160s", "word": "mas"},
        {"startOffset": "5.160s", "endOffset": "5.280s", "word": "o"},
        {"startOffset": "5.280s", "endOffset": "6.320s", "word": "gato"},
        {"startOffset": "6.360s", "endOffset": "6.680s", "word": "to"},
        {"startOffset": "6.680s", "endOffset": "7.160s", "word": "não"},
        {"startOffset": "7.160s", "endOffset": "7.880s", "word": "morreu."},
        {"startOffset": "7.960s", "endOffset": "8.400s", "word": "reu,"},
        {"startOffset": "8.440s", "endOffset": "8.960s", "word": "reu"},
        {"startOffset": "9s", "endOffset": "9.440s", "word": "Dona"},
        {"startOffset": "9.920s", "endOffset": "10.220s", "word": "Chica"},
        {"startOffset": "10.220s", "endOffset": "10.320s", "word": "ca"},
        {"startOffset": "10.920s", "endOffset": "11.920s", "word": "admirou"},
        {"startOffset": "12.200s", "endOffset": "12.320s", "word": "se"},
        {"startOffset": "12.320s", "endOffset": "12.400s", "word": "se"},
        {"startOffset": "13.160s", "endOffset": "13.480s", "word": "Do"},
        {"startOffset": "13.480s", "endOffset": "14.200s", "word": "miau,"},
        {"startOffset": "14.240s", "endOffset": "14.560s", "word": "do"},
        {"startOffset": "14.560s", "endOffset": "15s", "word": "miau"},
        {"startOffset": "15s", "endOffset": "15.200s", "word": "que"},
        {"startOffset": "15.200s", "endOffset": "15.280s", "word": "o"},
        {"startOffset": "15.280s", "endOffset": "15.760s", "word": "gato"},
        {"startOffset": "15.760s", "endOffset": "16.200s", "word": "deu."},
        {"startOffset": "16.280s", "endOffset": "17.880s", "word": "Miau."},
      ]),
    },
    "cravo": {
      "time": 21,
      "language": "pt-BR",
      "text": "O cravo brigou com a rosa\nDebaixo de uma sacada\nO cravo saiu ferido\nE a rosa, despedaçada",
      "words": process_words([
        {"startOffset": "1.240s", "endOffset": "1.680s", "word": "O"},
        {"startOffset": "1.680s", "endOffset": "2.800s", "word": "cravo"},
        {"startOffset": "2.800s", "endOffset": "3.560s", "word": "brigou"},
        {"startOffset": "3.560s", "endOffset": "3.760s", "word": "com"},
        {"startOffset": "3.760s", "endOffset": "3.920s", "word": "a"},
        {"startOffset": "3.920s", "endOffset": "5.080s", "word": "rosa,"},
        {"startOffset": "5.520s", "endOffset": "7.240s", "word": "debaixo"},
        {"startOffset": "7.240s", "endOffset": "7.400s", "word": "de"},
        {"startOffset": "7.400s", "endOffset": "7.920s", "word": "uma"},
        {"startOffset": "7.920s", "endOffset": "9.880s", "word": "sacada,"},
        {"startOffset": "10.040s", "endOffset": "10.560s", "word": "o"},
        {"startOffset": "10.560s", "endOffset": "11.680s", "word": "cravo"},
        {"startOffset": "11.680s", "endOffset": "12.440s", "word": "saiu"},
        {"startOffset": "12.440s", "endOffset": "14.400s", "word": "ferido"},
        {"startOffset": "14.440s", "endOffset": "14.640s", "word": "e"},
        {"startOffset": "14.640s", "endOffset": "15.120s", "word": "a"},
        {"startOffset": "15.120s", "endOffset": "16.240s", "word": "rosa"},
        {"startOffset": "16.240s", "endOffset": "18.960s", "word": "despedaçada."},
      ]),
    },
    "jingle": {
      "time": 7,
      "language": "en-US",
      "text": "Jingle bells, jingle bells\nJingle all the way\nOh what fun it is to ride\nIn a one horse open sleigh - hey!",
      "words": process_words([
        {"startOffset": "0s", "endOffset": "0.600s", "word": "Jingle"},
        {"startOffset": "0.600s", "endOffset": "1.200s", "word": "bells,"},
        {"startOffset": "1.200s", "endOffset": "1.720s", "word": "jingle"},
        {"startOffset": "1.720s", "endOffset": "2.320s", "word": "bells,"},
        {"startOffset": "2.320s", "endOffset": "3s", "word": "jingle"},
        {"startOffset": "3s", "endOffset": "3.320s", "word": "all"},
        {"startOffset": "3.320s", "endOffset": "3.520s", "word": "the"},
        {"startOffset": "3.520s", "endOffset": "3.720s", "word": "way."},
        {"startOffset": "4.720s", "endOffset": "4.760s", "word": "Oh,"},
        {"startOffset": "4.760s", "endOffset": "4.840s", "word": "what"},
        {"startOffset": "4.840s", "endOffset": "4.920s", "word": "fun"},
        {"startOffset": "4.920s", "endOffset": "4.960s", "word": "it"},
        {"startOffset": "4.960s", "endOffset": "5.040s", "word": "is"},
        {"startOffset": "5.040s", "endOffset": "5.080s", "word": "to"},
        {"startOffset": "5.080s", "endOffset": "5.200s", "word": "ride"},
        {"startOffset": "5.200s", "endOffset": "5.230s", "word": "in"},
        {"startOffset": "5.230s", "endOffset": "5.280s", "word": "a"},
        {"startOffset": "5.280s", "endOffset": "5.400s", "word": "one"},
        {"startOffset": "5.400s", "endOffset": "5.520s", "word": "horse"},
        {"startOffset": "5.520s", "endOffset": "5.680s", "word": "open"},
        {"startOffset": "5.680s", "endOffset": "5.760s", "word": "sleigh."},
        {"startOffset": "5.760s", "endOffset": "5.800s", "word": "Hey"},
      ]),
    },
    "old": {
      "time": 17,
      "language": "en-US",
      "text": "Old MacDonald had a farm\nE I E I O\nAnd on that farm he had a pig\nE I E I O\nWith an oink oink here\nAnd an oink oink there\nHere an oink there an oink\nEverywhere an oink oink",
      "words": process_words([
        {"startOffset": "0s", "endOffset": "0.360s", "word": "Old"},
        {"startOffset": "0.360s", "endOffset": "1.280s", "word": "MacDonald"},
        {"startOffset": "1.280s", "endOffset": "1.680s", "word": "had"},
        {"startOffset": "1.680s", "endOffset": "1.840s", "word": "a"},
        {"startOffset": "1.840s", "endOffset": "2.440s", "word": "farm."},
        {"startOffset": "2.560s", "endOffset": "2.960s", "word": "E"},
        {"startOffset": "2.960s", "endOffset": "3.160s", "word": "i"},
        {"startOffset": "3.160s", "endOffset": "3.480s", "word": "e"},
        {"startOffset": "3.480s", "endOffset": "3.800s", "word": "i"},
        {"startOffset": "3.800s", "endOffset": "4.280s", "word": "o."},
        {"startOffset": "4.720s", "endOffset": "5.080s", "word": "And"},
        {"startOffset": "5.080s", "endOffset": "5.320s", "word": "on"},
        {"startOffset": "5.320s", "endOffset": "5.640s", "word": "that"},
        {"startOffset": "5.640s", "endOffset": "6s", "word": "farm"},
        {"startOffset": "6s", "endOffset": "6.240s", "word": "he"},
        {"startOffset": "6.240s", "endOffset": "6.640s", "word": "had"},
        {"startOffset": "6.640s", "endOffset": "6.760s", "word": "a"},
        {"startOffset": "6.760s", "endOffset": "7.400s", "word": "pig."},
        {"startOffset": "7.560s", "endOffset": "7.960s", "word": "E"},
        {"startOffset": "7.960s", "endOffset": "8.240s", "word": "i"},
        {"startOffset": "8.240s", "endOffset": "8.560s", "word": "e"},
        {"startOffset": "8.560s", "endOffset": "8.880s", "word": "i"},
        {"startOffset": "8.880s", "endOffset": "9.360s", "word": "o."},
        {"startOffset": "9.680s", "endOffset": "9.880s", "word": "With"},
        {"startOffset": "9.880s", "endOffset": "10.040s", "word": "an"},
        {"startOffset": "10.040s", "endOffset": "10.360s", "word": "oink"},
        {"startOffset": "10.360s", "endOffset": "10.640s", "word": "oink"},
        {"startOffset": "10.640s", "endOffset": "10.960s", "word": "here"},
        {"startOffset": "10.960s", "endOffset": "11.120s", "word": "and"},
        {"startOffset": "11.120s", "endOffset": "11.280s", "word": "an"},
        {"startOffset": "11.280s", "endOffset": "11.600s", "word": "oink"},
        {"startOffset": "11.600s", "endOffset": "11.880s", "word": "oink"},
        {"startOffset": "11.880s", "endOffset": "12.320s", "word": "there."},
        {"startOffset": "12.480s", "endOffset": "12.680s", "word": "Here"},
        {"startOffset": "12.680s", "endOffset": "12.840s", "word": "an"},
        {"startOffset": "12.840s", "endOffset": "13.120s", "word": "oink"},
        {"startOffset": "13.120s", "endOffset": "13.360s", "word": "there"},
        {"startOffset": "13.360s", "endOffset": "13.480s", "word": "an"},
        {"startOffset": "13.480s", "endOffset": "13.800s", "word": "oink"},
        {"startOffset": "13.800s", "endOffset": "14.280s", "word": "everywhere"},
        {"startOffset": "14.280s", "endOffset": "14.400s", "word": "an"},
        {"startOffset": "14.400s", "endOffset": "14.720s", "word": "oink"},
        {"startOffset": "14.720s", "endOffset": "15s", "word": "oink"},
      ]),
    },
    "peixe": {
      "time": 20,
      "language": "pt-BR",
      "text": "Como pode um peixe vivo\nViver fora da água fria\nComo pode um peixe vivo\nViver fora da água fria\nComo poderei viver\nComo poderei viver\nSem a tua, sem a tua\nSem a tua companhia",
      "words": process_words([
        { "endOffset": "1.040s", "word": "Como", "confidence": 0.48399335 },
        {"startOffset": "1.040s", "endOffset": "1.520s", "word": "pode"},
        {"startOffset": "1.520s", "endOffset": "1.600s", "word": "um"},
        {"startOffset": "1.600s", "endOffset": "2.120s", "word": "peixe"},
        {"startOffset": "2.120s", "endOffset": "2.680s", "word": "vivo"},
        {"startOffset": "2.680s", "endOffset": "3.160s", "word": "viver"},
        {"startOffset": "3.160s", "endOffset": "3.720s", "word": "fora"},
        {"startOffset": "3.720s", "endOffset": "3.880s", "word": "da"},
        {"startOffset": "3.880s", "endOffset": "4.240s", "word": "água"},
        {"startOffset": "4.240s", "endOffset": "4.760s", "word": "fria?"},
        {"startOffset": "4.760s", "endOffset": "5.320s", "word": "Como"},
        {"startOffset": "5.320s", "endOffset": "5.760s", "word": "pode"},
        {"startOffset": "5.760s", "endOffset": "5.800s", "word": "um"},
        {"startOffset": "5.800s", "endOffset": "6.400s", "word": "peixe"},
        {"startOffset": "6.400s", "endOffset": "6.960s", "word": "vivo"},
        {"startOffset": "6.960s", "endOffset": "7.440s", "word": "viver"},
        {"startOffset": "7.440s", "endOffset": "8s", "word": "fora"},
        {"startOffset": "8s", "endOffset": "8.160s", "word": "da"},
        {"startOffset": "8.160s", "endOffset": "8.560s", "word": "água"},
        {"startOffset": "8.560s", "endOffset": "8.960s", "word": "fria?"},
        {"startOffset": "9.440s", "endOffset": "9.560s", "word": "Como"},
        {"startOffset": "10.080s", "endOffset": "10.560s", "word": "poderei"},
        {"startOffset": "10.560s", "endOffset": "11.360s", "word": "viver?"},
        {"startOffset": "11.560s", "endOffset": "11.800s", "word": "Como"},
        {"startOffset": "11.800s", "endOffset": "12.720s", "word": "poderei"},
        {"startOffset": "12.720s", "endOffset": "13.400s", "word": "viver?"},
        {"startOffset": "13.400s", "endOffset": "13.760s", "word": "Sem"},
        {"startOffset": "13.760s", "endOffset": "13.920s", "word": "a"},
        {"startOffset": "13.920s", "endOffset": "14.440s", "word": "tua,"},
        {"startOffset": "14.440s", "endOffset": "14.840s", "word": "sem"},
        {"startOffset": "14.840s", "endOffset": "14.960s", "word": "a"},
        {"startOffset": "14.960s", "endOffset": "15.520s", "word": "tua,"},
        {"startOffset": "15.520s", "endOffset": "15.880s", "word": "sem"},
        {"startOffset": "15.880s", "endOffset": "16.040s", "word": "a"},
        {"startOffset": "16.040s", "endOffset": "16.600s", "word": "tua"},
        {"startOffset": "16.600s", "endOffset": "17.560s", "word": "companhia."},
      ]),
    },
    "sapo": {
      "time": 10,
      "language": "pt-BR",
      "text": "Sapo cururu, na beira do rio\nQuando o sapo canta, maninha\nÉ porque tem frio",
      "words": process_words([
        {"startOffset": "0.320s", "endOffset": "0.840s", "word": "Sapo"},
        {"startOffset": "0.840s", "endOffset": "1.840s", "word": "cururu,"},
        {"startOffset": "2.600s", "endOffset": "3s", "word": "na"},
        {"startOffset": "3s", "endOffset": "3.440s", "word": "beira"},
        {"startOffset": "3.440s", "endOffset": "3.720s", "word": "do"},
        {"startOffset": "3.720s", "endOffset": "4.160s", "word": "rio,"},
        {"startOffset": "4.840s", "endOffset": "5.280s", "word": "quando"},
        {"startOffset": "5.280s", "endOffset": "5.320s", "word": "o"},
        {"startOffset": "5.480s", "endOffset": "6s", "word": "sapo"},
        {"startOffset": "6s", "endOffset": "6.440s", "word": "canta"},
        {"startOffset": "6.440s", "endOffset": "7.280s", "word": "maninha,"},
        {"startOffset": "7.280s", "endOffset": "7.400s", "word": "é"},
        {"startOffset": "7.400s", "endOffset": "8s", "word": "porque"},
        {"startOffset": "8s", "endOffset": "8.280s", "word": "tem"},
        {"startOffset": "8.280s", "endOffset": "8.800s", "word": "frio."},
      ]),
    },
    "spider": {
      "time": 17,
      "language": "en-US",
      "text": "Itsy-bitsy spider, went up the water spout\nDown came the rain and washed the spider out\nOut came the sunshine and dried up all the rain",
      "words": process_words([
        {"startOffset": "0.280s", "endOffset": "1.400s", "word": "Itsy-bitsy"},
        {"startOffset": "1.400s", "endOffset": "2.520s", "word": "spider"},
        {"startOffset": "2.520s", "endOffset": "2.840s", "word": "went"},
        {"startOffset": "2.840s", "endOffset": "3.160s", "word": "up"},
        {"startOffset": "3.160s", "endOffset": "3.400s", "word": "the"},
        {"startOffset": "3.400s", "endOffset": "3.960s", "word": "water"},
        {"startOffset": "3.960s", "endOffset": "4.680s", "word": "spout."},
        {"startOffset": "5.320s", "endOffset": "5.960s", "word": "Down"},
        {"startOffset": "5.960s", "endOffset": "6.400s", "word": "came"},
        {"startOffset": "6.400s", "endOffset": "6.600s", "word": "the"},
        {"startOffset": "6.600s", "endOffset": "7.240s", "word": "rain"},
        {"startOffset": "7.680s", "endOffset": "7.960s", "word": "and"},
        {"startOffset": "7.960s", "endOffset": "8.360s", "word": "washed"},
        {"startOffset": "8.360s", "endOffset": "8.480s", "word": "the"},
        {"startOffset": "8.480s", "endOffset": "9.320s", "word": "spider"},
        {"startOffset": "9.320s", "endOffset": "9.920s", "word": "out."},
        {"startOffset": "10.640s", "endOffset": "11.120s", "word": "Out"},
        {"startOffset": "11.120s", "endOffset": "11.560s", "word": "came"},
        {"startOffset": "11.560s", "endOffset": "11.720s", "word": "the"},
        {"startOffset": "11.720s", "endOffset": "12.880s", "word": "sunshine"},
        {"startOffset": "12.880s", "endOffset": "13.040s", "word": "and"},
        {"startOffset": "13.040s", "endOffset": "13.520s", "word": "dried"},
        {"startOffset": "13.520s", "endOffset": "13.760s", "word": "up"},
        {"startOffset": "13.760s", "endOffset": "14.080s", "word": "all"},
        {"startOffset": "14.080s", "endOffset": "14.320s", "word": "the"},
        {"startOffset": "14.320s", "endOffset": "15.200s", "word": "rain."},
      ]),
    },
    "wish": {
      "time": 13,
      "language": "en-US",
      "text": "We wish you a Merry Christmas\nWe wish you a Merry Christmas\nWe wish you a Merry Christmas\nAnd a happy new year",
      "words": process_words([
        {"startOffset": "0.640s", "endOffset": "1.080s", "word": "We"},
        {"startOffset": "1.080s", "endOffset": "1.560s", "word": "wish"},
        {"startOffset": "1.560s", "endOffset": "1.800s", "word": "you"},
        {"startOffset": "1.800s", "endOffset": "1.920s", "word": "a"},
        {"startOffset": "1.920s", "endOffset": "2.360s", "word": "Merry"},
        {"startOffset": "2.360s", "endOffset": "3.280s", "word": "Christmas."},
        {"startOffset": "3.280s", "endOffset": "3.680s", "word": "We"},
        {"startOffset": "3.680s", "endOffset": "4.160s", "word": "wish"},
        {"startOffset": "4.160s", "endOffset": "4.360s", "word": "you"},
        {"startOffset": "4.360s", "endOffset": "4.520s", "word": "a"},
        {"startOffset": "4.520s", "endOffset": "4.960s", "word": "Merry"},
        {"startOffset": "4.960s", "endOffset": "5.840s", "word": "Christmas."},
        {"startOffset": "5.880s", "endOffset": "6.280s", "word": "We"},
        {"startOffset": "6.280s", "endOffset": "6.760s", "word": "wish"},
        {"startOffset": "6.760s", "endOffset": "7s", "word": "you"},
        {"startOffset": "7s", "endOffset": "7.120s", "word": "a"},
        {"startOffset": "7.120s", "endOffset": "7.520s", "word": "Merry"},
        {"startOffset": "7.520s", "endOffset": "8.440s", "word": "Christmas"},
        {"startOffset": "8.480s", "endOffset": "8.760s", "word": "and"},
        {"startOffset": "8.760s", "endOffset": "8.880s", "word": "a"},
        {"startOffset": "8.880s", "endOffset": "9.680s", "word": "happy"},
        {"startOffset": "9.680s", "endOffset": "10.120s", "word": "new"},
        {"startOffset": "10.120s", "endOffset": "11s", "word": "year."},
      ]),
    },
}

# =================================================================================
# --- HTTP Routes ---
# =================================================================================

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
    return JSONResponse(content=song)

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
        logging.error(f"Error in Google TTS API: {e}", exc_info=True)
        return JSONResponse(content={"error": "Failed to synthesize speech"}, status_code=500)

# =================================================================================
# --- WebSocket Logic ---
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
        logging.info("gRPC stream producer started.")

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
        # Don't close the connection here, let the client decide when to close.
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


# --- Server Startup ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
