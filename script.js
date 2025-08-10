function openTab(evt, tabName) {
    // Get all elements with class="tab-content" and hide them
    const tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tab-button" and remove the class "active"
    const tabbuttons = document.getElementsByClassName("tab-button");
    for (let i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

document.addEventListener('DOMContentLoaded', () => {

    // Module 1: The Creative Storyteller
    const storyInput = document.getElementById('story-input');
    const talkButton = document.getElementById('talk-button');
    const sttOutput = document.getElementById('stt-output');
    const voiceProfiles = document.querySelectorAll('.voice-profile');
    const ttsAudio = document.getElementById('tts-audio');

    talkButton.addEventListener('click', () => {
        sttOutput.textContent = `"${storyInput.value}"`;
    });

    voiceProfiles.forEach(profile => {
        profile.addEventListener('click', () => {
            const story = storyInput.value || "You haven't written a story yet.";
            const voice = profile.dataset.voice;
            // In a real application, this would call the TTS API.
            // For this demo, we'll use a placeholder audio or a web speech API.
            const utterance = new SpeechSynthesisUtterance(`${voice} reading: ${story}`);
            speechSynthesis.speak(utterance);
        });
    });

    // Module 2: The Real-Time Captioner
    const captionButton = document.getElementById('caption-button');
    const captionOutput = document.getElementById('caption-output');

    let socket;
    let audioContext;
    let processor;
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

    // Module 3: The Singing Contest
    const singButton = document.getElementById('sing-button');
    const singOutput = document.getElementById('sing-output');

    singButton.addEventListener('click', () => {
        singOutput.textContent = "Calculating score... You scored 95! Excellent match!";
    });

});
