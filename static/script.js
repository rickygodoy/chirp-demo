document.addEventListener("DOMContentLoaded", () => {
    let currentScoreId = null;

    async function getHighScores() {
        try {
            const response = await fetch("/api/high-scores");
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.error("Could not fetch high scores from server", e);
        }
        return [];
    }

    async function saveHighScore(name, score_id) {
        if (!score_id) {
            console.error("Cannot save high score without a score_id.");
            return;
        }
        try {
            await fetch("/api/high-scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, score_id }),
            });
        } catch (e) {
            console.error("Could not save high score to server", e);
        }
    }

    async function displayHighScores() {
        const highScores = await getHighScores();
        const tableBody = document.getElementById("high-scores-body");

        tableBody.innerHTML = "";

        if (highScores.length === 0) {
            const row = document.createElement("tr");
            row.innerHTML = `<td colspan="3" class="placeholder">No stars identified yet.</td>`;
            tableBody.appendChild(row);
        } else {
            highScores.forEach((entry, index) => {
                const row = document.createElement("tr");
                row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.name}</td>
        <td>${entry.score}</td>
      `;
                tableBody.appendChild(row);
            });
        }
    }

    displayHighScores();

    // --- Modal Logic ---
    const modal = document.getElementById("highscore-modal");
    const modalScoreText = document.getElementById("modal-score-text");
    const playerNameInput = document.getElementById("player-name-input");
    const saveButton = document.getElementById("modal-save-button");
    const cancelButton = document.getElementById("modal-cancel-button");

    let resolvePromise = null;

    function showModal(score) {
        modalScoreText.textContent = `You scored ${score} points! Enter your name to save your score.`;
        playerNameInput.value = "";
        modal.style.display = "flex";
        playerNameInput.focus();
        return new Promise((resolve) => {
            resolvePromise = resolve;
        });
    }

    function hideModal() {
        modal.style.display = "none";
    }

    function handleSave() {
        const name = playerNameInput.value.trim();
        if (name && resolvePromise) {
            resolvePromise(name);
        } else if (resolvePromise) {
            resolvePromise(null); // Resolve with null if name is empty
        }
        hideModal();
        resolvePromise = null; // Reset promise resolver
    }

    function handleCancel() {
        if (resolvePromise) {
            resolvePromise(null); // Resolve with null if cancelled
        }
        hideModal();
        resolvePromise = null;
    }

    saveButton.addEventListener("click", handleSave);
    cancelButton.addEventListener("click", handleCancel);

    // Also allow submitting with Enter key
    playerNameInput.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            handleSave();
        }
    });

    async function checkAndSaveHighScore(newScore) {
        // Always show the modal to ask for the user's name.
        // The backend will decide if the score makes it to the leaderboard.
        const name = await showModal(newScore);
        if (name) {
            // Use the globally stored currentScoreId
            await saveHighScore(name, currentScoreId);
            await displayHighScores();
        }
    }

    const captionButton = document.getElementById("caption-button");
    const captionOutput = document.getElementById("caption-output");
    const finalScoreOutput = document.getElementById("final-score-output");
    const refrainOutput = document.getElementById("refrain-output");
    const songSelect = document.querySelector(".custom-select");
    const songSelectTrigger = songSelect.querySelector(".select-trigger");
    const songOptions = songSelect.querySelectorAll(".option");
    const selectedText = songSelectTrigger.querySelector("span");

    // Timer and Progress Bar elements
    const countdownText = document.getElementById("countdown-text");
    const progressBar = document.getElementById("progress-bar");

    // Timer variables
    let countdownInterval;
    let recordingDuration = 15; // Default duration
    let currentSongKey = null; // To hold the currently selected song key
    let currentSongData = null;

    // By default, the button is disabled.
    captionButton.disabled = true;

    songSelectTrigger.addEventListener("click", () => {
        songSelect.classList.toggle("open");
    });

    songOptions.forEach((option) => {
        option.addEventListener("click", async () => {
            // Remove selected class from any previously selected option
            songOptions.forEach((opt) => opt.classList.remove("selected"));

            // Add selected class to the clicked option
            option.classList.add("selected");

            // Update the trigger text and stored value
            selectedText.textContent = option.textContent;
            songSelect.dataset.value = option.dataset.value;
            currentSongKey = option.dataset.value; // Update the current song key

            try {
                const response = await fetch(`/api/song/${currentSongKey}`);
                if (response.ok) {
                    currentSongData = await response.json();
                    // Set the recording duration and update UI
                    recordingDuration = currentSongData.time || 15;
                    countdownText.textContent = recordingDuration;

                    // Update the refrain text display
                    if (currentSongData && currentSongData.text) {
                        refrainOutput.textContent = currentSongData.text;
                        refrainOutput.classList.add("visible");
                    } else {
                        refrainOutput.classList.remove("visible");
                    }

                    // Enable the button
                    captionButton.disabled = false;
                } else {
                    console.error("Could not fetch song data");
                    captionButton.disabled = true;
                }
            } catch (e) {
                console.error("Error fetching song data", e);
                captionButton.disabled = true;
            }

            // Close the dropdown
            songSelect.classList.remove("open");
        });
    });

    // Close the dropdown if clicking outside of it
    window.addEventListener("click", (e) => {
        if (!songSelect.contains(e.target)) {
            songSelect.classList.remove("open");
        }
    });

    let socket;
    let audioContext;
    let input;
    let globalStream;

    const start_singing = "Start Singing";
    const stop_singing = "Stop Singing";

    // This will accumulate the final transcript and word details
    let finalTranscript = "";
    let finalWords = [];

    function startRecordingTimer() {
        let remainingTime = recordingDuration;

        const updateTimer = () => {
            countdownText.textContent = remainingTime;
            const progressPercentage =
                (remainingTime / recordingDuration) * 100;
            progressBar.style.width = `${progressPercentage}%`;
        };

        updateTimer(); // Initial display

        countdownInterval = setInterval(() => {
            remainingTime--;
            updateTimer();

            if (remainingTime < 0) {
                clearInterval(countdownInterval);
                // Automatically trigger the stop action
                if (captionButton.textContent === stop_singing) {
                    captionButton.click();
                }
            }
        }, 1000);
    }

    function stopRecordingTimer() {
        clearInterval(countdownInterval);
        progressBar.style.width = "100%"; // Reset for next time
        countdownText.textContent = recordingDuration;
    }

    captionButton.addEventListener("click", async () => {
        if (captionButton.textContent === start_singing) {
            // Hide score from previous rounds
            finalScoreOutput.style.display = "none";
            captionButton.disabled = true; // Disable button during countdown
            let countdown = 3;
            captionOutput.textContent = `Get ready... ${countdown}`;

            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    captionOutput.textContent = `Get ready... ${countdown}`;
                } else {
                    clearInterval(countdownInterval);
                    captionOutput.textContent = "Connecting...";
                    captionButton.textContent = stop_singing;
                    captionButton.disabled = false; // Re-enable button

                    // Start the recording timer
                    startRecordingTimer();

                    finalTranscript = ""; // Reset transcript
                    finalWords = []; // Reset words
                    const language = currentSongData?.language || "en-US"; // Default to en-US
                    const wsProtocol =
                        window.location.protocol === "https:"
                            ? "wss://"
                            : "ws://";
                    const wsUrl = `${wsProtocol}${window.location.host}/listen?language_code=${language}`;
                    socket = new WebSocket(wsUrl);

                    socket.onopen = () => {
                        captionOutput.textContent =
                            "Connected. Please start singing.";
                        navigator.mediaDevices
                            .getUserMedia({ audio: true, video: false })
                            .then(async (stream) => {
                                globalStream = stream;
                                audioContext = new (window.AudioContext ||
                                    window.webkitAudioContext)();

                                // Load the audio processor worklet
                                await audioContext.audioWorklet.addModule(
                                    "/static/audio-processor.js",
                                );
                                const workletNode = new AudioWorkletNode(
                                    audioContext,
                                    "audio-processor",
                                );

                                // The worklet will post messages with the processed audio buffer
                                workletNode.port.onmessage = (event) => {
                                    if (socket.readyState === WebSocket.OPEN) {
                                        // Send the Int16Array buffer from the worklet
                                        socket.send(event.data);
                                    }
                                };

                                input =
                                    audioContext.createMediaStreamSource(
                                        globalStream,
                                    );
                                input.connect(workletNode);
                                workletNode.connect(audioContext.destination);
                            })
                            .catch((err) => {
                                console.error(
                                    "Error getting audio stream:",
                                    err,
                                );
                                captionOutput.textContent =
                                    "Error: Could not access microphone. Please grant permission.";
                                captionButton.textContent = start_singing;
                            });
                    };

                    socket.onmessage = (event) => {
                        const data = JSON.parse(event.data);

                        console.log("received", data);

                        if (data.isFinal) {
                            // Accumulate final results
                            finalTranscript += data.transcript + " ";
                            finalWords.push(...data.words);
                            captionOutput.textContent = finalTranscript;
                        } else {
                            // Display the interim transcript, appended to the final part
                            captionOutput.textContent =
                                finalTranscript + data.transcript;
                        }
                    };

                    socket.onclose = async () => {
                        console.log("closed");
                        stopRecordingTimer(); // Ensure timer is hidden on close
                        captionButton.textContent = start_singing;
                        captionButton.disabled = false; // Re-enable button

                        // --- Perform Scoring ---
                        if (currentSongData && finalWords.length > 0) {
                            const response = await fetch("/api/score", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    song_key: currentSongKey,
                                    words: finalWords,
                                }),
                            });

                            if (response.ok) {
                                const scoreData = await response.json(); // Contains score and score_id
                                currentScoreId = scoreData.score_id; // Store the ID globally

                                let scoreHtml =
                                    `Score: <span class="score-value">${scoreData.overallScore}/100</span><br>` +
                                    `(Accuracy: <span class="score-value">${scoreData.accuracyScore}</span>, Confidence: <span class="score-value">${scoreData.confidenceScore}</span>`;

                                if (scoreData.timingScore !== undefined) {
                                    scoreHtml += `, Timing: <span class="score-value">${scoreData.timingScore}</span>)`;
                                } else if (
                                    scoreData.rhythmScore !== undefined
                                ) {
                                    scoreHtml += `, Rhythm: <span class="score-value">${scoreData.rhythmScore}</span>)`;
                                } else {
                                    scoreHtml += `)`;
                                }
                                captionOutput.textContent = finalTranscript;
                                finalScoreOutput.innerHTML = scoreHtml; // Use innerHTML to render spans
                                finalScoreOutput.style.display = "block"; // Show the container

                                // Defer the modal pop-up to allow the UI to repaint first
                                setTimeout(() => {
                                    checkAndSaveHighScore(
                                        scoreData.overallScore,
                                    );
                                }, 0);
                            } else {
                                console.error("Could not fetch score");
                            }
                        } else {
                            captionOutput.textContent = `${finalTranscript || "No audio detected :("}`;
                        }
                    };

                    socket.onerror = (err) => {
                        console.error("WebSocket Error:", err);
                        captionOutput.textContent =
                            "Error: Could not connect to the server. Is it running?";
                        captionButton.textContent = start_singing;
                        captionButton.disabled = false; // Re-enable button
                    };
                }
            }, 1000);
        } else {
            // User clicked "Stop Singing"
            stopRecordingTimer(); // Stop and hide the timer immediately
            captionButton.textContent = "Processing...";
            captionButton.disabled = true;

            // Stop the audio source locally
            if (globalStream) {
                globalStream.getTracks().forEach((track) => track.stop());
            }
            if (audioContext) {
                await audioContext.close();
            }

            // Signal the server that we are done sending audio
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ action: "stop" }));
            }
            // Now we wait for the server to process remaining audio and close the connection.
            // The socket.onclose event will handle the final scoring and UI reset.
        }
    });
});
