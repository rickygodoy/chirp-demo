document.addEventListener("DOMContentLoaded", () => {
  const songRefrains = {
    "bohemian-rhapsody": `Mama, ooh\nDidn't mean to make you cry\nIf I'm not back again this time tomorrow\nCarry on, carry on`,
    "smells-like-teen-spirit": `With the lights out, it's less dangerous\nHere we are now, entertain us\nI feel stupid and contagious`,
    "hotel-california": `Welcome to the Hotel California\nSuch a lovely place, such a lovely face`,
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

  // This will accumulate the final transcript
  let finalTranscript = "";

  captionButton.addEventListener("click", async () => {
    if (captionButton.textContent === start_singing) {
      captionButton.textContent = stop_singing;
      captionOutput.textContent = "Connecting to server...";
      socket = new WebSocket("ws://localhost:3001");

      socket.onopen = () => {
        finalTranscript = ""; // Reset transcript on new connection
        captionOutput.textContent = "Connected. Please start speaking.";
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
          // Append the final transcript and a space
          finalTranscript += data.transcript + " ";
          captionOutput.textContent = finalTranscript;
        } else {
          // Display the interim transcript, appended to the final part
          captionOutput.textContent = finalTranscript + data.transcript;
        }
      };

      socket.onclose = () => {
        captionOutput.textContent = `Final Transcript: ${finalTranscript}`;
        captionButton.textContent = start_singing;
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
