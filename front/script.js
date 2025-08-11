document.addEventListener("DOMContentLoaded", () => {
  const songRefrains = {
    "bohemian-rhapsody": `Mama, ooh\nDidn't mean to make you cry\nIf I'm not back again this time tomorrow\nCarry on, carry on`,
    "smells-like-teen-spirit": `With the lights out, it's less dangerous\nHere we are now, entertain us\nI feel stupid and contagious`,
    "hotel-california": `Welcome to the Hotel California\nSuch a lovely place (such a lovely place), such a lovely face`,
    "billie-jean": `Billie Jean is not my lover\nShe's just a girl, who claims that I am the one\nBut the kid is not my son`,
    "stairway-to-heaven": `When she gets there she knows\nIf the stores are all closed\nWith a word she can get what she came for`,
  };

  const captionButton = document.getElementById("caption-button");
  const captionOutput = document.getElementById("caption-output");
  const refrainOutput = document.getElementById("refrain-output");
  const songSelect = document.querySelector(".custom-select");
  const songSelectTrigger = songSelect.querySelector(".select-trigger");
  const songOptions = songSelect.querySelectorAll(".option");
  const selectedText = songSelectTrigger.querySelector("span");

  // By default, the button is disabled.
  captionButton.disabled = true;

  songSelectTrigger.addEventListener("click", () => {
    songSelect.classList.toggle("open");
  });

  songOptions.forEach((option) => {
    option.addEventListener("click", () => {
      // Remove selected class from any previously selected option
      songOptions.forEach((opt) => opt.classList.remove("selected"));

      // Add selected class to the clicked option
      option.classList.add("selected");

      // Update the trigger text and stored value
      selectedText.textContent = option.textContent;
      songSelect.dataset.value = option.dataset.value;

      // Enable the button
      captionButton.disabled = false;

      const songKey = option.dataset.value;
      const refrain = songRefrains[songKey];

      if (refrain) {
        refrainOutput.textContent = refrain;
        refrainOutput.classList.add("visible");
      } else {
        refrainOutput.classList.remove("visible");
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

  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  function calculateScore(userWords, originalRefrain) {
    if (userWords.length === 0) {
      return {
        overallScore: 0,
        confidenceScore: 0,
        accuracyScore: 0,
        rhythmScore: 0,
      };
    }

    const originalWords = normalizeText(originalRefrain).split(/\s+/);
    const sungWords = userWords.map((w) => normalizeText(w.word));

    // Simple alignment and scoring
    let matches = 0;
    let totalConfidence = 0;
    const pauseDurations = [];

    let originalIndex = 0;
    for (let i = 0; i < userWords.length; i++) {
      // Find the best match in the original text
      let found = false;
      for (let j = originalIndex; j < originalWords.length; j++) {
        if (sungWords[i] === originalWords[j]) {
          matches++;
          totalConfidence += userWords[i].confidence;
          originalIndex = j + 1;
          found = true;
          break;
        }
      }
      // Calculate pauses between consecutive words
      if (i > 0) {
        const pause = userWords[i].startTime - userWords[i - 1].endTime;
        if (pause > 0) {
          // Only consider positive pauses
          pauseDurations.push(pause);
        }
      }
    }

    // --- Score Calculation ---

    // 1. Accuracy Score (0-100)
    const accuracyScore = (matches / originalWords.length) * 100;

    // 2. Confidence Score (0-100)
    const avgConfidence = matches > 0 ? totalConfidence / matches : 0;
    const confidenceScore = avgConfidence * 100;

    // 3. Rhythm Score (0-100)
    let rhythmScore = 0;
    if (pauseDurations.length > 1) {
      const meanPause =
        pauseDurations.reduce((a, b) => a + b, 0) / pauseDurations.length;
      const variance =
        pauseDurations
          .map((p) => Math.pow(p - meanPause, 2))
          .reduce((a, b) => a + b, 0) / pauseDurations.length;
      const stdDev = Math.sqrt(variance);
      // Inverse of standard deviation, scaled to 0-100. A lower std dev (more consistent rhythm) is better.
      // The scaling factor (e.g., 0.5) is arbitrary and can be tuned.
      rhythmScore = Math.max(0, 100 - (stdDev / 0.5) * 100);
    } else if (pauseDurations.length > 0) {
      rhythmScore = 80; // High score for a single, consistent pause
    }

    // 4. Overall Score (weighted average)
    const overallScore = Math.min(
      100,
      accuracyScore * 0.5 + // 50% weight
        confidenceScore * 0.3 + // 30% weight
        rhythmScore * 0.2, // 20% weight
    );

    return {
      overallScore: Math.round(overallScore),
      confidenceScore: Math.round(confidenceScore),
      accuracyScore: Math.round(accuracyScore),
      rhythmScore: Math.round(rhythmScore),
    };
  }

  captionButton.addEventListener("click", async () => {
    if (captionButton.textContent === start_singing) {
      captionButton.textContent = stop_singing;
      captionOutput.textContent = "Connecting to server...";
      finalTranscript = ""; // Reset transcript
      finalWords = []; // Reset words
      socket = new WebSocket("ws://localhost:3001");

      socket.onopen = () => {
        captionOutput.textContent = "Connected. Please start singing.";
        navigator.mediaDevices
          .getUserMedia({ audio: true, video: false })
          .then(async (stream) => {
            globalStream = stream;
            audioContext = new (window.AudioContext ||
              window.webkitAudioContext)();

            // Load the audio processor worklet
            await audioContext.audioWorklet.addModule("audio-processor.js");
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

            input = audioContext.createMediaStreamSource(globalStream);
            input.connect(workletNode);
            workletNode.connect(audioContext.destination);
          })
          .catch((err) => {
            console.error("Error getting audio stream:", err);
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
          captionOutput.textContent = finalTranscript + data.transcript;
        }
      };

      socket.onclose = () => {
        captionButton.textContent = start_singing;

        // --- Perform Scoring ---
        const songKey = songSelect.dataset.value;
        const originalRefrain = songRefrains[songKey];
        if (originalRefrain && finalWords.length > 0) {
          const score = calculateScore(finalWords, originalRefrain);
          captionOutput.textContent =
            `${finalTranscript}\n\nScore: ${score.overallScore}/100\n` +
            ` (Accuracy: ${score.accuracyScore}, Confidence: ${score.confidenceScore}, Rhythm: ${score.rhythmScore})`;
        } else {
          captionOutput.textContent = `${finalTranscript || "No audio detected :("}`;
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        captionOutput.textContent =
          "Error: Could not connect to the server. Is it running?";
        captionButton.textContent = start_singing;
      };
    } else {
      captionButton.textContent = start_singing;
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
