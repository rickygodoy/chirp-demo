document.addEventListener("DOMContentLoaded", () => {
    
    let currentScoreId = null; // To hold the ID of the last calculated score

    const HIGH_SCORES_KEY_LEARNING = "chirp-high-scores-learning";

    async function getHighScores() {
        try {
            const response = await fetch("/api/high-scores");
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.error("Could not fetch high scores from server", e);
        }
        return getDefaultHighScores();
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

    function saveHighScoresLearning(scores) {
        try {
            localStorage.setItem(
                HIGH_SCORES_KEY_LEARNING,
                JSON.stringify(scores),
            );
        } catch (e) {
            console.error("Could not save high scores to localStorage", e);
        }
    }

    function getHighScoresLearning() {
        try {
            const scoresJSON = localStorage.getItem(HIGH_SCORES_KEY_LEARNING);
            if (scoresJSON) {
                return JSON.parse(scoresJSON);
            }
        } catch (error) {
            console.error("Could not parse high scores from localStorage", e);
            return getDefaultHighScores(); // Fallback
        }
        return getDefaultHighScores();
    }

    function getDefaultHighScores() {
        // Return an empty array when no scores are in localStorage
        return [];
    }

    async function displayHighScores() {
        const highScores = await getHighScores();
        const tableBody = document.getElementById("high-scores-body");
        if (!tableBody) return; // Exit if table isn't on the page

        tableBody.innerHTML = ""; // Clear existing scores

        if (highScores.length === 0) {
            const row = document.createElement("tr");
            // Use colspan="3" to span all columns (Rank, Name, Score)
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

    function displayHighScoresLearning() {
        const highScores = getHighScoresLearning();
        const tableBody = document.getElementById("high-scores-body-learning");

        if (!tableBody) return; // Exit if table isn't on the page

        tableBody.innerHTML = ""; // Clear existing scores

        if (highScores.length === 0) {
            const row = document.createElement("tr");
            row.innerHTML = `<td colspan="3" class="placeholder">No players identified yet.</td>`;
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

    // Display scores on initial load
    displayHighScores();
    displayHighScoresLearning();

    // --- Modal Logic ---
    const modal = document.getElementById("highscore-modal");
    const modalScoreText = document.getElementById("modal-score-text");
    const playerNameInput = document.getElementById("player-name-input");
    const saveButton = document.getElementById("modal-save-button");
    const cancelButton = document.getElementById("modal-cancel-button");

    const modalLearning = document.getElementById("highscore-modal-learning");
    const modalScoreTextLearning = document.getElementById(
        "modal-score-text-learning",
    );
    const playerNameInputLearning = document.getElementById(
        "player-name-input-learning",
    );
    const saveButtonLearning = document.getElementById(
        "modal-save-button-learning",
    );
    const cancelButtonLearning = document.getElementById(
        "modal-cancel-button-learning",
    );
    const scoreLearningInput = document.getElementById("score-learning");

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

    function handleSavelearning() {
        const name = playerNameInputLearning.value.trim();
        const score = scoreLearningInput.value.trim();
        checkAndSaveHighScoreLearning(score, name);
        modalLearning.style.display = "none";
        resolvePromise = null;
    }

    function handleCancel() {
        if (resolvePromise) {
            resolvePromise(null); // Resolve with null if cancelled
        }
        hideModal();
        resolvePromise = null;
    }

    function handleCancelLearning() {
        if (resolvePromise) {
            resolvePromise(null); // Resolve with null if cancelled
        }
        modalLearning.style.display = "none";
        resolvePromise = null;
    }

    saveButton.addEventListener("click", handleSave);
    cancelButton.addEventListener("click", handleCancel);

    saveButtonLearning.addEventListener("click", handleSavelearning);
    cancelButtonLearning.addEventListener("click", handleCancelLearning);

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
        await displayHighScores(); // Refresh the table from the server
    }
}

    function checkAndSaveHighScoreLearning(newScore, name) {
        const highScores = getHighScoresLearning();
        const newEntry = { name: name, score: newScore };
        highScores.push(newEntry);
        highScores.sort((a, b) => b.score - a.score); // Sort descending
        saveHighScoresLearning(highScores);
        displayHighScoresLearning(); // Update the table
    }

    // --- Tab Switching Logic ---
    const tabLinks = document.querySelectorAll(".tab-link");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const tabId = link.dataset.tab;

            // Deactivate all tabs
            tabLinks.forEach((l) => l.classList.remove("active"));
            tabPanes.forEach((p) => p.classList.remove("active"));

            // Activate the clicked tab
            link.classList.add("active");
            document.getElementById(tabId).classList.add("active");
        });
    });

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

                    // Start the 15-second recording timer
                    startRecordingTimer();

                    // --- Original logic starts here ---
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

                                checkAndSaveHighScore(scoreData.overallScore);

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

    // Game elements
    const listenBtn = document.getElementById("listen-btn");
    const checkBtn = document.getElementById("check-btn");
    const feedbackEl = document.getElementById("feedback");
    const audioPlayer = document.getElementById("audio-player");
    const answerInput = document.getElementById("answer-input");
    const playAgainBtn = document.getElementById("play-again-btn");

    let currentPhrase = "";
    let playerName = "";
    let isFetching = false;
    let roundTimerStart = 0;
    let recentRounds = [];

    listenBtn.addEventListener("click", playsound);
    checkBtn.addEventListener("click", checkAnswer);
    playAgainBtn.addEventListener("click", resetGame);

    const levenshtein = (s1, s2) => {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) costs[j] = j;
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue =
                            Math.min(Math.min(newValue, lastValue), costs[j]) +
                            1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    };

    async function playsound() {
        listenBtn.disabled = true;
        listenBtn.textContent = "Carregando...";

        try {
            const response = await fetch("/api/new-phrase");
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            currentPhrase = data.phrase;
            synthesizeAndPlay(currentPhrase);
        } catch (error) {
            console.error("Error fetching new phrase:", error);
            feedbackEl.textContent = "Erro ao buscar frase.";
        } finally {
            isFetching = false;
            listenBtn.disabled = false;
            listenBtn.textContent = "Ouvir a Frase";
        }
    }

    async function synthesizeAndPlay(text) {
        try {
            const response = await fetch("/api/synthesize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text }),
            });
            if (!response.ok) throw new Error("Failed to synthesize audio");
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            audioPlayer.play();
        } catch (error) {
            console.error("Error synthesizing audio:", error);
            feedbackEl.textContent = "Erro ao gerar áudio.";
        }
    }

    audioPlayer.onended = () => {
        roundTimerStart = new Date();
        answerInput.disabled = false;
        checkBtn.disabled = false;
        answerInput.focus();
    };

    function checkAnswer() {
        const responseTime = (new Date() - roundTimerStart) / 1000;
        const userAnswer = answerInput.value;

        const distance = levenshtein(userAnswer, currentPhrase);
        const accuracyScore = Math.max(0, 80 - distance * 5);
        const timeBonus = Math.max(0, 20 - responseTime * 2);
        const roundScore = Math.round(accuracyScore + timeBonus);

        feedbackEl.innerHTML = `
            <span class="round-score">Sua pontuação: ${roundScore}</span>
            <span class="breakdown">
                (Precisão: ${Math.round(accuracyScore)} + Bônus de Tempo: ${Math.round(timeBonus)})
            </span>
        `;

        listenBtn.disabled = true;
        checkBtn.disabled = true;
        answerInput.disabled = true;
        playAgainBtn.style.display = "block";

        const scoreLearning = Math.round(accuracyScore) + Math.round(timeBonus);

        modalScoreTextLearning.textContent = `You scored ${scoreLearning} points! Enter your name to save your score.`;
        scoreLearningInput.value = scoreLearning;
        playerNameInputLearning.value = "";
        modalLearning.style.display = "flex";
        playerNameInputLearning.focus();
    }

    function resetGame() {
        feedbackEl.innerHTML = "";
        answerInput.value = "";
        playAgainBtn.style.display = "none";
        listenBtn.disabled = false;
    }

    /* Call Analysis Logic */

    document
        .getElementById("analyze-sentiment-button")
        .addEventListener("click", function () {
            var analysisContainer =
                document.getElementById("analysis-container");
            var loadingSpinner = document.getElementById("loading-spinner");
            var analysisMessage = document.getElementById("analysis-message");
            var analyzeButton = document.getElementById(
                "analyze-sentiment-button",
            );
            var analysisTable = document.getElementById("analysis-table");

            // Hide button and show loading spinner
            analyzeButton.style.display = "none";
            analysisContainer.style.display = "block";
            loadingSpinner.style.display = "block";
            analysisMessage.style.display = "none";

            setTimeout(function () {
                // Hide loading spinner and show message
                loadingSpinner.style.display = "none";
                analysisTable.style.display = "block";
            }, 4000);
        });
});
