import asyncio
import json
import queue
from typing import Dict

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from google.api_core.client_options import ClientOptions
from google.cloud.speech_v2 import (
    SpeechClient,
    StreamingRecognitionConfig,
    StreamingRecognizeRequest,
    RecognitionConfig,
    RecognitionFeatures,
    ExplicitDecodingConfig,
    StreamingRecognitionFeatures,
)

# --- Configuration ---
PORT = 3001
PROJECT_ID = "summit-demo-469118"
# PROJECT_ID = "rgodoy-sandbox"
LOCATION = "us-central1"

RECOGNIZER_NAME = f"projects/{PROJECT_ID}/locations/{LOCATION}/recognizers/_"

# --- FastAPI App Initialization ---
app = FastAPI()

# --- Transcription Logic (Producer-Consumer Pattern) ---

def audio_request_generator(audio_queue: queue.Queue, recognizer, config):
    """Yields audio chunks from the input queue to the gRPC stream."""
    yield StreamingRecognizeRequest(recognizer=recognizer, streaming_config=config)
    while True:
        chunk = audio_queue.get()
        if chunk is None:
            break
        yield StreamingRecognizeRequest(audio=chunk)

def run_grpc_stream(audio_queue: queue.Queue, results_queue: asyncio.Queue, language_code: str):
    """The Producer: runs the blocking gRPC stream and puts results in a queue."""
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
        client_options = ClientOptions(api_endpoint=f"{LOCATION}-speech.googleapis.com")
        speech_client = SpeechClient(client_options=client_options)
        stream = speech_client.streaming_recognize(requests=requests)

        print("gRPC stream producer started.")

        for response in stream:
            for result in response.results:
                if not result.alternatives:
                    continue
                words_list = []
                if result.alternatives and result.alternatives[0].words:
                    for word_info in result.alternatives[0].words:
                        words_list.append({
                            "word": word_info.word,
                            "startTime": word_info.start_offset.total_seconds(),
                            "endTime": word_info.end_offset.total_seconds(),
                            "confidence": word_info.confidence,
                        })
                message: Dict = {
                    "transcript": result.alternatives[0].transcript,
                    "isFinal": result.is_final,
                    "words": words_list
                }
                results_queue.put_nowait(message)

    except Exception as e:
        print(f"Error in gRPC stream producer: {e}")
    finally:
        # Put sentinel value to signal end of stream
        results_queue.put_nowait(None)
        print("gRPC stream producer ended.")

# --- API Endpoints ---

@app.get("/health")
async def health_check():
    return {"status": "OK"}

@app.websocket("/")
async def websocket_endpoint(websocket: WebSocket, language_code: str = "en-US"):
    await websocket.accept()
    print(f"WebSocket client connected with language_code: {language_code}")

    audio_queue = queue.Queue()       # Thread-safe queue for Client -> gRPC
    results_queue = asyncio.Queue() # Asyncio queue for gRPC -> Client

    async def receive_from_client():
        """Receives audio from client and puts it into the audio_queue."""
        try:
            while True:
                message = await websocket.receive()
                if "bytes" in message:
                    audio_queue.put(message["bytes"])
                elif "text" in message:
                    try:
                        data = json.loads(message["text"])
                        if data.get("action") == "stop":
                            print("Received stop signal from client.")
                            break
                    except json.JSONDecodeError:
                        pass # Ignore non-JSON text messages
        finally:
            audio_queue.put(None) # Signal gRPC stream to end

    async def send_to_client():
        """The Consumer: gets results from results_queue and sends to client."""
        while True:
            message = await results_queue.get()
            if message is None:
                break # End of stream
            await websocket.send_text(json.dumps(message))
        await websocket.close()

    loop = asyncio.get_running_loop()
    try:
        # Run the blocking gRPC producer in a thread pool
        grpc_task = loop.run_in_executor(
            None, run_grpc_stream, audio_queue, results_queue, language_code
        )

        # Run the asyncio producer and consumer
        await asyncio.gather(
            receive_from_client(),
            send_to_client(),
            grpc_task
        )

    except WebSocketDisconnect:
        print("Client disconnected unexpectedly.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        print("Transcription session ended.")

# --- Server Startup ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
