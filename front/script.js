document.addEventListener("DOMContentLoaded", () => {
  const songRefrains = {
    "bohemian-rhapsody": `Mama, ooh\nDidn't mean to make you cry\nIf I'm not back again this time tomorrow\nCarry on, carry on`,
    "smells-like-teen-spirit": `With the lights out, it's less dangerous\nHere we are now, entertain us\nI feel stupid and contagious`,
    "hotel-california": {
      text: `Welcome to the Hotel California\nSuch a lovely place (such a lovely place), such a lovely face`,
      words: [{"startOffset":"1.120s","endOffset":"1.520s","word":"Welcome","confidence":0.57869446},{"startOffset":"1.520s","endOffset":"1.760s","word":"to","confidence":0.6914779},{"startOffset":"1.760s","endOffset":"1.960s","word":"the","confidence":0.66414154},{"startOffset":"1.960s","endOffset":"2.920s","word":"hotel","confidence":0.47806403},{"startOffset":"2.920s","endOffset":"4.360s","word":"California.","confidence":0.6076948},{"startOffset":"6.640s","endOffset":"6.920s","word":"Such","confidence":0.8000884},{"startOffset":"6.920s","endOffset":"6.960s","word":"a","confidence":0.800502},{"startOffset":"6.960s","endOffset":"7.640s","word":"lovely","confidence":0.66628623},{"startOffset":"7.640s","endOffset":"8.240s","word":"place.","confidence":0.6815639},{"startOffset":"8.240s","endOffset":"8.640s","word":"Such","confidence":0.7269194},{"startOffset":"8.640s","endOffset":"8.680s","word":"a","confidence":0.8859668},{"startOffset":"8.680s","endOffset":"9.280s","word":"lovely","confidence":0.7817678},{"startOffset":"9.280s","endOffset":"9.920s","word":"place.","confidence":0.7867407},{"startOffset":"9.920s","endOffset":"10.200s","word":"Such","confidence":0.5348571},{"startOffset":"10.200s","endOffset":"10.280s","word":"a","confidence":0.78996915},{"startOffset":"10.280s","endOffset":"10.920s","word":"lovely","confidence":0.78227997},{"startOffset":"10.920s","endOffset":"11.560s","word":"face.","confidence":0.706933}].map(w => ({
            ...w,
            word: normalizeText(w.word),
            startTime: parseFloat(w.startOffset),
            endTime: parseFloat(w.endOffset),
        })),
    },
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
      const refrainData = songRefrains[songKey];

      // Check if it's the new object format or the old string
      const refrainText =
        typeof refrainData === "object" ? refrainData.text : refrainData;

      if (refrainText) {
        refrainOutput.textContent = refrainText;
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

  function calculateScore(userWords, originalRefrainData) {
  // If we have the detailed timing data for the original song, use the new method
  if (typeof originalRefrainData === "object" && originalRefrainData.words) {
    return calculateDetailedScore(userWords, originalRefrainData.words);
  } else {
    // Fallback to the old rhythm-based scoring for other songs
    return calculateRhythmScore(userWords, originalRefrainData);
  }
}

function calculateDetailedScore(userWords, originalWords) {
  if (userWords.length === 0 || originalWords.length === 0) {
    return {
      overallScore: 0,
      confidenceScore: 0,
      accuracyScore: 0,
      timingScore: 0,
    };
  }

  // 1. Normalize start times for both sequences
  const userStartTime = userWords[0].startTime;
  const originalStartTime = originalWords[0].startTime;

  const normalizedUserWords = userWords.map((w) => ({
    ...w,
    word: normalizeText(w.word),
    relativeStart: w.startTime - userStartTime,
  }));

  const normalizedOriginalWords = originalWords.map((w) => ({
    ...w,
    // word is already pre-normalized in the data structure
    relativeStart: w.startTime - originalStartTime,
  }));

  // 2. Align words and calculate metrics
  let matches = 0;
  let totalConfidence = 0;
  let totalTimingError = 0;
  const maxTimingError = 1.0; // Max timing error in seconds for a word to get a timing score of 0

  let originalIndex = 0;
  for (const userWord of normalizedUserWords) {
    // Find the user's word in the remaining original words
    for (let j = originalIndex; j < normalizedOriginalWords.length; j++) {
      if (userWord.word === normalizedOriginalWords[j].word) {
        const originalWord = normalizedOriginalWords[j];
        matches++;
        totalConfidence += userWord.confidence;

        const timingError = Math.abs(
          userWord.relativeStart - originalWord.relativeStart,
        );
        totalTimingError += timingError;

        originalIndex = j + 1; // Move to the next word to enforce order
        break; // Found match, move to the next user word
      }
    }
  }

  // --- 3. Calculate final scores (0-100) ---

  // Accuracy: Percentage of correctly sung words
  const accuracyScore = (matches / originalWords.length) * 100;

  // Confidence: Average confidence of the words that were matched
  const avgConfidence = matches > 0 ? totalConfidence / matches : 0;
  const confidenceScore = avgConfidence * 100;

  // Timing: Lower average error is better.
  let timingScore = 0;
  if (matches > 0) {
    const avgTimingError = totalTimingError / matches;
    // Scale the score. If avg error is 0, score is 100. If avg error is >= maxTimingError, score is 0.
    timingScore = Math.max(0, (1 - avgTimingError / maxTimingError) * 100);
  }

  // 4. Overall Score (weighted average)
  const overallScore = Math.min(
    100,
    accuracyScore * 0.5 + // 50%
      confidenceScore * 0.3 + // 30%
      timingScore * 0.2, // 20%
  );

  return {
    overallScore: Math.round(overallScore),
    confidenceScore: Math.round(confidenceScore),
    accuracyScore: Math.round(accuracyScore),
    timingScore: Math.round(timingScore), // The new score component
  };
}

// Renamed original function to be used as a fallback
function calculateRhythmScore(userWords, originalRefrain) {
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
        captionButton.disabled = false; // Re-enable button

        // --- Perform Scoring ---
        const songKey = songSelect.dataset.value;
        const originalRefrain = songRefrains[songKey];
        if (originalRefrain && finalWords.length > 0) {
          const score = calculateScore(finalWords, originalRefrain);
          let scoreText =
            `Score: ${score.overallScore}/100\n` +
            ` (Accuracy: ${score.accuracyScore}, Confidence: ${score.confidenceScore}`;

          if (score.timingScore !== undefined) {
            scoreText += `, Timing: ${score.timingScore})`;
          } else if (score.rhythmScore !== undefined) {
            scoreText += `, Rhythm: ${score.rhythmScore})`;
          } else {
            scoreText += `)`;
          }
          captionOutput.textContent = `${finalTranscript}\n\n${scoreText}`;
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
    } else {
      // User clicked "Stop Singing"
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
