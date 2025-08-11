import asyncio
from google.api_core.client_options import ClientOptions
import websockets
import json
import queue
from google.cloud.speech_v2 import (
    ExplicitDecodingConfig,
    RecognitionFeatures,
    SpeechClient,
    StreamingRecognitionConfig,
    StreamingRecognitionFeatures,
    StreamingRecognizeRequest,
    RecognitionConfig,
)

PORT = 3001
PROJECT_ID = "rgodoy-sandbox"
LOCATION = "us-central1"
LANGUAGE_CODE = "en-US"
RECOGNIZER_NAME = f"projects/{PROJECT_ID}/locations/{LOCATION}/recognizers/_"

# --- WebSocket and Speech API Handling ---

async def receive_from_client(websocket, audio_queue: queue.Queue):
    """Listens for audio on the websocket and puts it into a thread-safe queue."""
    loop = asyncio.get_running_loop()
    try:
        async for message in websocket:
            await loop.run_in_executor(None, audio_queue.put, message)
    except websockets.exceptions.ConnectionClosedError:
        print("Client connection closed.")
    except Exception as e:
        print(f"Error receiving from client: {e}")
    finally:
        # Use run_in_executor to put the sentinel value in the queue
        await loop.run_in_executor(None, audio_queue.put, None)

def audio_request_generator(audio_queue: queue.Queue, recognizer, config):
    """
    A synchronous generator that yields requests for the Google Speech API.
    It blocks waiting for audio chunks from the queue.
    """
    # 1. Send the initial configuration request.
    yield StreamingRecognizeRequest(recognizer=recognizer, streaming_config=config)

    # 2. Stream audio chunks from the queue.
    while True:
        audio_chunk = audio_queue.get() # This is a blocking call
        if audio_chunk is None:
            break
        yield StreamingRecognizeRequest(audio=audio_chunk)

def run_grpc_stream(audio_queue: queue.Queue, websocket, loop: asyncio.AbstractEventLoop):
    """
    This function runs in a separate thread and handles the blocking
    Google Speech API call.
    """
    try:
        # Define the streaming configuration
        streaming_config = StreamingRecognitionConfig(
            config=RecognitionConfig(
                explicit_decoding_config=ExplicitDecodingConfig(
                    encoding="LINEAR16",
                    sample_rate_hertz=16000,
                    audio_channel_count=1
                ),
                language_codes=[LANGUAGE_CODE],
                features=RecognitionFeatures(
                    enable_word_time_offsets=True,
                    enable_word_confidence=True,
                    enable_automatic_punctuation=True
                ),
                model="chirp_2"
            ),
            streaming_features=StreamingRecognitionFeatures(interim_results=True),
        )

        # Create the synchronous generator for API requests
        requests = audio_request_generator(audio_queue, RECOGNIZER_NAME, streaming_config)

        # Initialize the Speech client and start the streaming recognition
        client_options_var = ClientOptions(
            api_endpoint=f"{LOCATION}-speech.googleapis.com"
        )
        speech_client = SpeechClient(client_options=client_options_var)
        # This is a blocking call that yields responses
        stream = speech_client.streaming_recognize(requests=requests)

        print("Started Google Speech V2 stream in a separate thread.")

        # Process responses from the API and send them back to the client
        for response in stream:
            for result in response.results:
                if not result.alternatives:
                    continue

                print(result)

                # Create a list of word details from the first alternative
                words_list = []
                if result.alternatives and result.alternatives[0].words:
                    for word_info in result.alternatives[0].words:
                        words_list.append({
                            "word": word_info.word,
                            "startTime": word_info.start_offset.total_seconds(),
                            "endTime": word_info.end_offset.total_seconds(),
                            "confidence": word_info.confidence,
                        })

                message = json.dumps({
                    "transcript": result.alternatives[0].transcript,
                    "isFinal": result.is_final,
                    "words": words_list
                })
                # Schedule the send operation on the main event loop
                asyncio.run_coroutine_threadsafe(websocket.send(message), loop)
    except Exception as e:
        print(f"Error in gRPC stream: {e}")
    finally:
        print("Google Speech V2 stream ended.")


async def transcribe_handler(websocket):
    """
    Handles a single client WebSocket connection. This function orchestrates:
    1. An async task to receive audio from the client.
    2. A blocking task (in a thread) to handle the gRPC stream.
    """
    print(f"Client connected from {websocket.remote_address}.")
    audio_queue = queue.Queue()
    loop = asyncio.get_running_loop()

    try:
        # Task 1: Asynchronously receive audio from the websocket client
        receive_task = asyncio.create_task(receive_from_client(websocket, audio_queue))

        # Task 2: Run the blocking gRPC stream in a separate thread
        grpc_task = loop.run_in_executor(
            None, run_grpc_stream, audio_queue, websocket, loop
        )

        # Wait for both tasks to complete
        await asyncio.gather(receive_task, grpc_task)

    except websockets.exceptions.ConnectionClosedOK:
        print("Client disconnected gracefully.")
    except Exception as e:
        print(f"An error occurred in the main handler: {e}")
    finally:
        print("Transcription session ended.")

async def main():
    """Starts the WebSocket server."""
    print(f"Starting WebSocket server on ws://localhost:{PORT}")
    async with websockets.serve(transcribe_handler, "localhost", PORT):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer shut down.")
