document.addEventListener('DOMContentLoaded', () => {

    // --- Module 2 Logic from here ---
    const captionButton = document.getElementById('caption-button');
    const captionOutput = document.getElementById('caption-output');
    
    let socket;
    let audioContext;
    let input;
    let globalStream;

    // This will accumulate the final transcript
    let finalTranscript = '';

    captionButton.addEventListener('click', async () => {
        if (captionButton.textContent === 'Start Captioning') {
            captionButton.textContent = 'Stop Captioning';
            captionOutput.textContent = 'Connecting to server...';
            socket = new WebSocket('ws://localhost:3001');

            socket.onopen = () => {
                finalTranscript = ''; // Reset transcript on new connection
                captionOutput.textContent = 'Connected. Please start speaking.';
                navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(async (stream) => {
                    globalStream = stream;
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // Load the audio processor worklet
                    await audioContext.audioWorklet.addModule('audio-processor.js');
                    const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

                    // The worklet will post messages with the processed audio buffer
                    workletNode.port.onmessage = (event) => {
                        if (socket.readyState === WebSocket.OPEN) {
                            // Send the Int16Array buffer from the worklet
                            socket.send(event.data);
                        }
                    };

                    input = audioContext.createMediaStreamSource(globalStream);
                    input.connect(workletNode);
                    workletNode.connect(audioContext.destination);

                }).catch((err) => {
                     console.error("Error getting audio stream:", err);
                     captionOutput.textContent = "Error: Could not access microphone. Please grant permission.";
                     captionButton.textContent = 'Start Captioning';
                });
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.isFinal) {
                    // Append the final transcript and a space
                    finalTranscript += data.transcript + ' ';
                    captionOutput.textContent = finalTranscript;
                } else {
                    // Display the interim transcript, appended to the final part
                    captionOutput.textContent = finalTranscript + data.transcript;
                }
            };

            socket.onclose = () => {
                captionOutput.textContent = `Connection closed. Final Transcript: ${finalTranscript}`;
                captionButton.textContent = 'Start Captioning';
            };

            socket.onerror = (err) => {
                console.error("WebSocket Error:", err);
                captionOutput.textContent = "Error: Could not connect to the server. Is it running?";
                captionButton.textContent = 'Start Captioning';
            }

        } else {
            captionButton.textContent = 'Start Captioning';
            if (globalStream) {
                globalStream.getTracks().forEach((track) => track.stop());
            }
            if (audioContext) {
                await audioContext.close();
            }
            if (socket) {
                socket.close();
            }
        }
    });
});
