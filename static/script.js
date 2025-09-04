document.addEventListener("DOMContentLoaded", () => {
  // --- High Score Logic ---
  const HIGH_SCORES_KEY = "chirp-high-scores-v2";
  const MAX_HIGH_SCORES = 10;

  const HIGH_SCORES_KEY_LEARNING = "chirp-high-scores-learning";

  function getHighScores() {
    try {
      const scoresJSON = localStorage.getItem(HIGH_SCORES_KEY);
      if (scoresJSON) {
        return JSON.parse(scoresJSON);
      }
    } catch (e) {
      console.error("Could not parse high scores from localStorage", e);
      return getDefaultHighScores(); // Fallback
    }
    return getDefaultHighScores();
  }

  function saveHighScores(scores) {
    try {
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
    } catch (e) {
      console.error("Could not save high scores to localStorage", e);
    }
  }

  function saveHighScoresLearning(scores) {
    try {
      localStorage.setItem(HIGH_SCORES_KEY_LEARNING, JSON.stringify(scores));
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

  function displayHighScores() {
    const highScores = getHighScores();
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
  const modalScoreTextLearning = document.getElementById("modal-score-text-learning");
  const playerNameInputLearning = document.getElementById("player-name-input-learning");
  const saveButtonLearning = document.getElementById("modal-save-button-learning");
  const cancelButtonLearning = document.getElementById("modal-cancel-button-learning");
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
    checkAndSaveHighScoreLearning(score, name)
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
  cancelButtonLearning.addEventListener("click", handleCancelLearning)

  // Also allow submitting with Enter key
  playerNameInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      handleSave();
    }
  });

  async function checkAndSaveHighScore(newScore) {
    const highScores = getHighScores();
    const lowestScore =
      highScores.length < MAX_HIGH_SCORES ? 0 : highScores[highScores.length - 1].score;

    if (newScore > lowestScore) {
      const name = await showModal(newScore); // Replaces prompt
      if (name) {
        const newEntry = { name: name, score: newScore };
        highScores.push(newEntry);
        highScores.sort((a, b) => b.score - a.score); // Sort descending
        const updatedHighScores = highScores.slice(0, MAX_HIGH_SCORES);
        saveHighScores(updatedHighScores);
        displayHighScores(); // Update the table
      }
    }
  }

  function checkAndSaveHighScoreLearning(newScore, name) {
    const highScores = getHighScoresLearning();
    const lowestScore =
      highScores.length < MAX_HIGH_SCORES ? 0 : highScores[highScores.length - 1].score;
  
    if (newScore > lowestScore) {
        const newEntry = { name: name, score: newScore };
        highScores.push(newEntry);
        highScores.sort((a, b) => b.score - a.score); // Sort descending
        const updatedHighScores = highScores.slice(0, MAX_HIGH_SCORES);
        saveHighScoresLearning(updatedHighScores);
        displayHighScoresLearning(); // Update the table
    }
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

  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  function processWords(words) {
    return words.map((w) => ({
      ...w,
      word: normalizeText(w.word),
      startTime: parseFloat(w.startOffset || "0s"),
      endTime: parseFloat(w.endOffset || "0s"),
    }));
  }

  const songRefrains = {
    aranha: {
      time: 18,
      language: "pt-BR",
      text: `A dona aranha subiu pela parede\nVeio a chuva forte e a derrubou\nJá passou a chuva e o sol já vai surgindo\nE a dona aranha continua a subir`,
      words: processWords([
        {
          startOffset: "0.800s",
          endOffset: "1.200s",
          word: "A",
        },
        {
          startOffset: "1.240s",
          endOffset: "1.680s",
          word: "dona",
        },
        {
          startOffset: "1.680s",
          endOffset: "2.440s",
          word: "aranha",
        },
        {
          startOffset: "2.440s",
          endOffset: "2.960s",
          word: "subiu",
        },
        {
          startOffset: "2.960s",
          endOffset: "3.440s",
          word: "pela",
        },
        {
          startOffset: "3.440s",
          endOffset: "4.440s",
          word: "parede,",
        },
        {
          startOffset: "4.760s",
          endOffset: "5.080s",
          word: "veio",
        },
        {
          startOffset: "5.080s",
          endOffset: "5.160s",
          word: "a",
        },
        {
          startOffset: "5.160s",
          endOffset: "5.640s",
          word: "chuva",
        },
        {
          startOffset: "5.640s",
          endOffset: "6.880s",
          word: "forte",
        },
        {
          startOffset: "6.880s",
          endOffset: "7.040s",
          word: "e",
        },
        {
          startOffset: "7.040s",
          endOffset: "7.160s",
          word: "a",
        },
        {
          startOffset: "7.160s",
          endOffset: "7.960s",
          word: "derrubou.",
        },
        {
          startOffset: "8.720s",
          endOffset: "8.880s",
          word: "Já",
        },
        {
          startOffset: "8.880s",
          endOffset: "9.480s",
          word: "passou",
        },
        {
          startOffset: "9.480s",
          endOffset: "9.560s",
          word: "a",
        },
        {
          startOffset: "9.560s",
          endOffset: "10.480s",
          word: "chuva",
        },
        {
          startOffset: "10.480s",
          endOffset: "10.520s",
          word: "e",
        },
        {
          startOffset: "10.520s",
          endOffset: "10.560s",
          word: "o",
        },
        {
          startOffset: "10.760s",
          endOffset: "10.960s",
          word: "sol",
        },
        {
          startOffset: "10.960s",
          endOffset: "11.160s",
          word: "já",
        },
        {
          startOffset: "11.160s",
          endOffset: "11.360s",
          word: "vai",
        },
        {
          startOffset: "11.360s",
          endOffset: "12.400s",
          word: "surgindo",
        },
        {
          startOffset: "12.800s",
          endOffset: "13.040s",
          word: "e",
        },
        {
          startOffset: "13.040s",
          endOffset: "13.160s",
          word: "a",
        },
        {
          startOffset: "13.160s",
          endOffset: "13.600s",
          word: "dona",
        },
        {
          startOffset: "13.600s",
          endOffset: "14.160s",
          word: "aranha",
        },
        {
          startOffset: "14.160s",
          endOffset: "15.280s",
          word: "continua",
        },
        {
          startOffset: "15.280s",
          endOffset: "15.400s",
          word: "a",
        },
        {
          startOffset: "15.400s",
          endOffset: "16s",
          word: "subir.",
        },
      ]),
    },
    atirei: {
      time: 20,
      language: "pt-BR",
      text: `Atirei o pau no gato-to\nMas o gato-to, não morreu-reu-reu\nDona chica-ca admirou-se-se do miau\nDo miau que o gato deu - miau!`,
      words: processWords([
        {
          startOffset: "1.240s",
          endOffset: "2.520s",
          word: "Atirei",
        },
        {
          startOffset: "2.520s",
          endOffset: "2.600s",
          word: "o",
        },
        {
          startOffset: "2.600s",
          endOffset: "3s",
          word: "pau",
        },
        {
          startOffset: "3s",
          endOffset: "3.160s",
          word: "no",
        },
        {
          startOffset: "3.160s",
          endOffset: "4.200s",
          word: "gato,",
        },
        {
          startOffset: "4.240s",
          endOffset: "4.640s",
          word: "to,",
        },
        {
          startOffset: "4.640s",
          endOffset: "5.160s",
          word: "mas",
        },
        {
          startOffset: "5.160s",
          endOffset: "5.280s",
          word: "o",
        },
        {
          startOffset: "5.280s",
          endOffset: "6.320s",
          word: "gato",
        },
        {
          startOffset: "6.360s",
          endOffset: "6.680s",
          word: "to",
        },
        {
          startOffset: "6.680s",
          endOffset: "7.160s",
          word: "não",
        },
        {
          startOffset: "7.160s",
          endOffset: "7.880s",
          word: "morreu.",
        },
        {
          startOffset: "7.960s",
          endOffset: "8.400s",
          word: "reu,",
        },
        {
          startOffset: "8.440s",
          endOffset: "8.960s",
          word: "reu",
        },
        {
          startOffset: "9s",
          endOffset: "9.440s",
          word: "Dona",
        },
        {
          startOffset: "9.920s",
          endOffset: "10.220s",
          word: "Chica",
        },
        {
          startOffset: "10.220s",
          endOffset: "10.320s",
          word: "ca",
        },
        {
          startOffset: "10.920s",
          endOffset: "11.920s",
          word: "admirou",
        },
        {
          startOffset: "12.200s",
          endOffset: "12.320s",
          word: "se",
        },
        {
          startOffset: "12.320s",
          endOffset: "12.400s",
          word: "se",
        },
        {
          startOffset: "13.160s",
          endOffset: "13.480s",
          word: "Do",
        },
        {
          startOffset: "13.480s",
          endOffset: "14.200s",
          word: "miau,",
        },
        {
          startOffset: "14.240s",
          endOffset: "14.560s",
          word: "do",
        },
        {
          startOffset: "14.560s",
          endOffset: "15s",
          word: "miau",
        },
        {
          startOffset: "15s",
          endOffset: "15.200s",
          word: "que",
        },
        {
          startOffset: "15.200s",
          endOffset: "15.280s",
          word: "o",
        },
        {
          startOffset: "15.280s",
          endOffset: "15.760s",
          word: "gato",
        },
        {
          startOffset: "15.760s",
          endOffset: "16.200s",
          word: "deu.",
        },
        {
          startOffset: "16.280s",
          endOffset: "17.880s",
          word: "Miau.",
        },
      ]),
    },
    cravo: {
      time: 21,
      language: "pt-BR",
      text: `O cravo brigou com a rosa\nDebaixo de uma sacada\nO cravo saiu ferido\nE a rosa, despedaçada`,
      words: processWords([
        {
          startOffset: "1.240s",
          endOffset: "1.680s",
          word: "O",
        },
        {
          startOffset: "1.680s",
          endOffset: "2.800s",
          word: "cravo",
        },
        {
          startOffset: "2.800s",
          endOffset: "3.560s",
          word: "brigou",
        },
        {
          startOffset: "3.560s",
          endOffset: "3.760s",
          word: "com",
        },
        {
          startOffset: "3.760s",
          endOffset: "3.920s",
          word: "a",
        },
        {
          startOffset: "3.920s",
          endOffset: "5.080s",
          word: "rosa,",
        },
        {
          startOffset: "5.520s",
          endOffset: "7.240s",
          word: "debaixo",
        },
        {
          startOffset: "7.240s",
          endOffset: "7.400s",
          word: "de",
        },
        {
          startOffset: "7.400s",
          endOffset: "7.920s",
          word: "uma",
        },
        {
          startOffset: "7.920s",
          endOffset: "9.880s",
          word: "sacada,",
        },
        {
          startOffset: "10.040s",
          endOffset: "10.560s",
          word: "o",
        },
        {
          startOffset: "10.560s",
          endOffset: "11.680s",
          word: "cravo",
        },
        {
          startOffset: "11.680s",
          endOffset: "12.440s",
          word: "saiu",
        },
        {
          startOffset: "12.440s",
          endOffset: "14.400s",
          word: "ferido",
        },
        {
          startOffset: "14.440s",
          endOffset: "14.640s",
          word: "e",
        },
        {
          startOffset: "14.640s",
          endOffset: "15.120s",
          word: "a",
        },
        {
          startOffset: "15.120s",
          endOffset: "16.240s",
          word: "rosa",
        },
        {
          startOffset: "16.240s",
          endOffset: "18.960s",
          word: "despedaçada.",
        },
      ]),
    },
    jingle: {
      time: 7,
      language: "en-US",
      text: `Jingle bells, jingle bells\nJingle all the way\nOh what fun it is to ride\nIn a one horse open sleigh - hey!`,
      words: processWords([
        {
          startOffset: "0s",
          endOffset: "0.600s",
          word: "Jingle",
        },
        {
          startOffset: "0.600s",
          endOffset: "1.200s",
          word: "bells,",
        },
        {
          startOffset: "1.200s",
          endOffset: "1.720s",
          word: "jingle",
        },
        {
          startOffset: "1.720s",
          endOffset: "2.320s",
          word: "bells,",
        },
        {
          startOffset: "2.320s",
          endOffset: "3s",
          word: "jingle",
        },
        {
          startOffset: "3s",
          endOffset: "3.320s",
          word: "all",
        },
        {
          startOffset: "3.320s",
          endOffset: "3.520s",
          word: "the",
        },
        {
          startOffset: "3.520s",
          endOffset: "3.720s",
          word: "way.",
        },
        {
          startOffset: "4.720s",
          endOffset: "4.760s",
          word: "Oh,",
        },
        {
          startOffset: "4.760s",
          endOffset: "4.840s",
          word: "what",
        },
        {
          startOffset: "4.840s",
          endOffset: "4.920s",
          word: "fun",
        },
        {
          startOffset: "4.920s",
          endOffset: "4.960s",
          word: "it",
        },
        {
          startOffset: "4.960s",
          endOffset: "5.040s",
          word: "is",
        },
        {
          startOffset: "5.040s",
          endOffset: "5.080s",
          word: "to",
        },
        {
          startOffset: "5.080s",
          endOffset: "5.200s",
          word: "ride",
        },
        {
          startOffset: "5.200s",
          endOffset: "5.230s",
          word: "in",
        },
        {
          startOffset: "5.230s",
          endOffset: "5.280s",
          word: "a",
        },
        {
          startOffset: "5.280s",
          endOffset: "5.400s",
          word: "one",
        },
        {
          startOffset: "5.400s",
          endOffset: "5.520s",
          word: "horse",
        },
        {
          startOffset: "5.520s",
          endOffset: "5.680s",
          word: "open",
        },
        {
          startOffset: "5.680s",
          endOffset: "5.760s",
          word: "sleigh.",
        },
        {
          startOffset: "5.760s",
          endOffset: "5.800s",
          word: "Hey",
        },
      ]),
    },
    old: {
      time: 17,
      language: "en-US",
      text: `Old MacDonald had a farm\nE I E I O\nAnd on that farm he had a pig\nE I E I O\nWith an oink oink here\nAnd an oink oink there\nHere an oink there an oink\nEverywhere an oink oink`,
      words: processWords([
        {
          startOffset: "0s",
          endOffset: "0.360s",
          word: "Old",
        },
        {
          startOffset: "0.360s",
          endOffset: "1.280s",
          word: "MacDonald",
        },
        {
          startOffset: "1.280s",
          endOffset: "1.680s",
          word: "had",
        },
        {
          startOffset: "1.680s",
          endOffset: "1.840s",
          word: "a",
        },
        {
          startOffset: "1.840s",
          endOffset: "2.440s",
          word: "farm.",
        },
        {
          startOffset: "2.560s",
          endOffset: "2.960s",
          word: "E",
        },
        {
          startOffset: "2.960s",
          endOffset: "3.160s",
          word: "i",
        },
        {
          startOffset: "3.160s",
          endOffset: "3.480s",
          word: "e",
        },
        {
          startOffset: "3.480s",
          endOffset: "3.800s",
          word: "i",
        },
        {
          startOffset: "3.800s",
          endOffset: "4.280s",
          word: "o.",
        },
        {
          startOffset: "4.720s",
          endOffset: "5.080s",
          word: "And",
        },
        {
          startOffset: "5.080s",
          endOffset: "5.320s",
          word: "on",
        },
        {
          startOffset: "5.320s",
          endOffset: "5.640s",
          word: "that",
        },
        {
          startOffset: "5.640s",
          endOffset: "6s",
          word: "farm",
        },
        {
          startOffset: "6s",
          endOffset: "6.240s",
          word: "he",
        },
        {
          startOffset: "6.240s",
          endOffset: "6.640s",
          word: "had",
        },
        {
          startOffset: "6.640s",
          endOffset: "6.760s",
          word: "a",
        },
        {
          startOffset: "6.760s",
          endOffset: "7.400s",
          word: "pig.",
        },
        {
          startOffset: "7.560s",
          endOffset: "7.960s",
          word: "E",
        },
        {
          startOffset: "7.960s",
          endOffset: "8.240s",
          word: "i",
        },
        {
          startOffset: "8.240s",
          endOffset: "8.560s",
          word: "e",
        },
        {
          startOffset: "8.560s",
          endOffset: "8.880s",
          word: "i",
        },
        {
          startOffset: "8.880s",
          endOffset: "9.360s",
          word: "o.",
        },
        {
          startOffset: "9.680s",
          endOffset: "9.880s",
          word: "With",
        },
        {
          startOffset: "9.880s",
          endOffset: "10.040s",
          word: "an",
        },
        {
          startOffset: "10.040s",
          endOffset: "10.360s",
          word: "oink",
        },
        {
          startOffset: "10.360s",
          endOffset: "10.640s",
          word: "oink",
        },
        {
          startOffset: "10.640s",
          endOffset: "10.960s",
          word: "here",
        },
        {
          startOffset: "10.960s",
          endOffset: "11.120s",
          word: "and",
        },
        {
          startOffset: "11.120s",
          endOffset: "11.280s",
          word: "an",
        },
        {
          startOffset: "11.280s",
          endOffset: "11.600s",
          word: "oink",
        },
        {
          startOffset: "11.600s",
          endOffset: "11.880s",
          word: "oink",
        },
        {
          startOffset: "11.880s",
          endOffset: "12.320s",
          word: "there.",
        },
        {
          startOffset: "12.480s",
          endOffset: "12.680s",
          word: "Here",
        },
        {
          startOffset: "12.680s",
          endOffset: "12.840s",
          word: "an",
        },
        {
          startOffset: "12.840s",
          endOffset: "13.120s",
          word: "oink",
        },
        {
          startOffset: "13.120s",
          endOffset: "13.360s",
          word: "there",
        },
        {
          startOffset: "13.360s",
          endOffset: "13.480s",
          word: "an",
        },
        {
          startOffset: "13.480s",
          endOffset: "13.800s",
          word: "oink",
        },
        {
          startOffset: "13.800s",
          endOffset: "14.280s",
          word: "everywhere",
        },
        {
          startOffset: "14.280s",
          endOffset: "14.400s",
          word: "an",
        },
        {
          startOffset: "14.400s",
          endOffset: "14.720s",
          word: "oink",
        },
        {
          startOffset: "14.720s",
          endOffset: "15s",
          word: "oink",
        },
      ]),
    },
    peixe: {
      time: 20,
      language: "pt-BR",
      text: `Como pode um peixe vivo\nViver fora da água fria\nComo pode um peixe vivo\nViver fora da água fria\nComo poderei viver\nComo poderei viver\nSem a tua, sem a tua\nSem a tua companhia`,
      words: processWords([
        { endOffset: "1.040s", word: "Como", confidence: 0.48399335 },
        {
          startOffset: "1.040s",
          endOffset: "1.520s",
          word: "pode",
        },
        {
          startOffset: "1.520s",
          endOffset: "1.600s",
          word: "um",
        },
        {
          startOffset: "1.600s",
          endOffset: "2.120s",
          word: "peixe",
        },
        {
          startOffset: "2.120s",
          endOffset: "2.680s",
          word: "vivo",
        },
        {
          startOffset: "2.680s",
          endOffset: "3.160s",
          word: "viver",
        },
        {
          startOffset: "3.160s",
          endOffset: "3.720s",
          word: "fora",
        },
        {
          startOffset: "3.720s",
          endOffset: "3.880s",
          word: "da",
        },
        {
          startOffset: "3.880s",
          endOffset: "4.240s",
          word: "água",
        },
        {
          startOffset: "4.240s",
          endOffset: "4.760s",
          word: "fria?",
        },
        {
          startOffset: "4.760s",
          endOffset: "5.320s",
          word: "Como",
        },
        {
          startOffset: "5.320s",
          endOffset: "5.760s",
          word: "pode",
        },
        {
          startOffset: "5.760s",
          endOffset: "5.800s",
          word: "um",
        },
        {
          startOffset: "5.800s",
          endOffset: "6.400s",
          word: "peixe",
        },
        {
          startOffset: "6.400s",
          endOffset: "6.960s",
          word: "vivo",
        },
        {
          startOffset: "6.960s",
          endOffset: "7.440s",
          word: "viver",
        },
        {
          startOffset: "7.440s",
          endOffset: "8s",
          word: "fora",
        },
        {
          startOffset: "8s",
          endOffset: "8.160s",
          word: "da",
        },
        {
          startOffset: "8.160s",
          endOffset: "8.560s",
          word: "água",
        },
        {
          startOffset: "8.560s",
          endOffset: "8.960s",
          word: "fria?",
        },
        {
          startOffset: "9.440s",
          endOffset: "9.560s",
          word: "Como",
        },
        {
          startOffset: "10.080s",
          endOffset: "10.560s",
          word: "poderei",
        },
        {
          startOffset: "10.560s",
          endOffset: "11.360s",
          word: "viver?",
        },
        {
          startOffset: "11.560s",
          endOffset: "11.800s",
          word: "Como",
        },
        {
          startOffset: "11.800s",
          endOffset: "12.720s",
          word: "poderei",
        },
        {
          startOffset: "12.720s",
          endOffset: "13.400s",
          word: "viver?",
        },
        {
          startOffset: "13.400s",
          endOffset: "13.760s",
          word: "Sem",
        },
        {
          startOffset: "13.760s",
          endOffset: "13.920s",
          word: "a",
        },
        {
          startOffset: "13.920s",
          endOffset: "14.440s",
          word: "tua,",
        },
        {
          startOffset: "14.440s",
          endOffset: "14.840s",
          word: "sem",
        },
        {
          startOffset: "14.840s",
          endOffset: "14.960s",
          word: "a",
        },
        {
          startOffset: "14.960s",
          endOffset: "15.520s",
          word: "tua,",
        },
        {
          startOffset: "15.520s",
          endOffset: "15.880s",
          word: "sem",
        },
        {
          startOffset: "15.880s",
          endOffset: "16.040s",
          word: "a",
        },
        {
          startOffset: "16.040s",
          endOffset: "16.600s",
          word: "tua",
        },
        {
          startOffset: "16.600s",
          endOffset: "17.560s",
          word: "companhia.",
        },
      ]),
    },
    sapo: {
      time: 10,
      language: "pt-BR",
      text: `Sapo cururu, na beira do rio\nQuando o sapo canta, maninha\nÉ porque tem frio`,
      words: processWords([
        {
          startOffset: "0.320s",
          endOffset: "0.840s",
          word: "Sapo",
        },
        {
          startOffset: "0.840s",
          endOffset: "1.840s",
          word: "cururu,",
        },
        {
          startOffset: "2.600s",
          endOffset: "3s",
          word: "na",
        },
        {
          startOffset: "3s",
          endOffset: "3.440s",
          word: "beira",
        },
        {
          startOffset: "3.440s",
          endOffset: "3.720s",
          word: "do",
        },
        {
          startOffset: "3.720s",
          endOffset: "4.160s",
          word: "rio,",
        },
        {
          startOffset: "4.840s",
          endOffset: "5.280s",
          word: "quando",
        },
        {
          startOffset: "5.280s",
          endOffset: "5.320s",
          word: "o",
        },
        {
          startOffset: "5.480s",
          endOffset: "6s",
          word: "sapo",
        },
        {
          startOffset: "6s",
          endOffset: "6.440s",
          word: "canta",
        },
        {
          startOffset: "6.440s",
          endOffset: "7.280s",
          word: "maninha,",
        },
        {
          startOffset: "7.280s",
          endOffset: "7.400s",
          word: "é",
        },
        {
          startOffset: "7.400s",
          endOffset: "8s",
          word: "porque",
        },
        {
          startOffset: "8s",
          endOffset: "8.280s",
          word: "tem",
        },
        {
          startOffset: "8.280s",
          endOffset: "8.800s",
          word: "frio.",
        },
      ]),
    },
    spider: {
      time: 17,
      language: "en-US",
      text: `Itsy-bitsy spider, went up the water spout\nDown came the rain and washed the spider out\nOut came the sunshine and dried up all the rain`,
      words: processWords([
        {
          startOffset: "0.280s",
          endOffset: "1.400s",
          word: "Itsy-bitsy",
        },
        {
          startOffset: "1.400s",
          endOffset: "2.520s",
          word: "spider",
        },
        {
          startOffset: "2.520s",
          endOffset: "2.840s",
          word: "went",
        },
        {
          startOffset: "2.840s",
          endOffset: "3.160s",
          word: "up",
        },
        {
          startOffset: "3.160s",
          endOffset: "3.400s",
          word: "the",
        },
        {
          startOffset: "3.400s",
          endOffset: "3.960s",
          word: "water",
        },
        {
          startOffset: "3.960s",
          endOffset: "4.680s",
          word: "spout.",
        },
        {
          startOffset: "5.320s",
          endOffset: "5.960s",
          word: "Down",
        },
        {
          startOffset: "5.960s",
          endOffset: "6.400s",
          word: "came",
        },
        {
          startOffset: "6.400s",
          endOffset: "6.600s",
          word: "the",
        },
        {
          startOffset: "6.600s",
          endOffset: "7.240s",
          word: "rain",
        },
        {
          startOffset: "7.680s",
          endOffset: "7.960s",
          word: "and",
        },
        {
          startOffset: "7.960s",
          endOffset: "8.360s",
          word: "washed",
        },
        {
          startOffset: "8.360s",
          endOffset: "8.480s",
          word: "the",
        },
        {
          startOffset: "8.480s",
          endOffset: "9.320s",
          word: "spider",
        },
        {
          startOffset: "9.320s",
          endOffset: "9.920s",
          word: "out.",
        },
        {
          startOffset: "10.640s",
          endOffset: "11.120s",
          word: "Out",
        },
        {
          startOffset: "11.120s",
          endOffset: "11.560s",
          word: "came",
        },
        {
          startOffset: "11.560s",
          endOffset: "11.720s",
          word: "the",
        },
        {
          startOffset: "11.720s",
          endOffset: "12.880s",
          word: "sunshine",
        },
        {
          startOffset: "12.880s",
          endOffset: "13.040s",
          word: "and",
        },
        {
          startOffset: "13.040s",
          endOffset: "13.520s",
          word: "dried",
        },
        {
          startOffset: "13.520s",
          endOffset: "13.760s",
          word: "up",
        },
        {
          startOffset: "13.760s",
          endOffset: "14.080s",
          word: "all",
        },
        {
          startOffset: "14.080s",
          endOffset: "14.320s",
          word: "the",
        },
        {
          startOffset: "14.320s",
          endOffset: "15.200s",
          word: "rain.",
        },
      ]),
    },
    wish: {
      time: 13,
      language: "en-US",
      text: `We wish you a Merry Christmas\nWe wish you a Merry Christmas\nWe wish you a Merry Christmas\nAnd a happy new year`,
      words: processWords([
        {
          startOffset: "0.640s",
          endOffset: "1.080s",
          word: "We",
        },
        {
          startOffset: "1.080s",
          endOffset: "1.560s",
          word: "wish",
        },
        {
          startOffset: "1.560s",
          endOffset: "1.800s",
          word: "you",
        },
        {
          startOffset: "1.800s",
          endOffset: "1.920s",
          word: "a",
        },
        {
          startOffset: "1.920s",
          endOffset: "2.360s",
          word: "Merry",
        },
        {
          startOffset: "2.360s",
          endOffset: "3.280s",
          word: "Christmas.",
        },
        {
          startOffset: "3.280s",
          endOffset: "3.680s",
          word: "We",
        },
        {
          startOffset: "3.680s",
          endOffset: "4.160s",
          word: "wish",
        },
        {
          startOffset: "4.160s",
          endOffset: "4.360s",
          word: "you",
        },
        {
          startOffset: "4.360s",
          endOffset: "4.520s",
          word: "a",
        },
        {
          startOffset: "4.520s",
          endOffset: "4.960s",
          word: "Merry",
        },
        {
          startOffset: "4.960s",
          endOffset: "5.840s",
          word: "Christmas.",
        },
        {
          startOffset: "5.880s",
          endOffset: "6.280s",
          word: "We",
        },
        {
          startOffset: "6.280s",
          endOffset: "6.760s",
          word: "wish",
        },
        {
          startOffset: "6.760s",
          endOffset: "7s",
          word: "you",
        },
        {
          startOffset: "7s",
          endOffset: "7.120s",
          word: "a",
        },
        {
          startOffset: "7.120s",
          endOffset: "7.520s",
          word: "Merry",
        },
        {
          startOffset: "7.520s",
          endOffset: "8.440s",
          word: "Christmas",
        },
        {
          startOffset: "8.480s",
          endOffset: "8.760s",
          word: "and",
        },
        {
          startOffset: "8.760s",
          endOffset: "8.880s",
          word: "a",
        },
        {
          startOffset: "8.880s",
          endOffset: "9.680s",
          word: "happy",
        },
        {
          startOffset: "9.680s",
          endOffset: "10.120s",
          word: "new",
        },
        {
          startOffset: "10.120s",
          endOffset: "11s",
          word: "year.",
        },
      ]),
    },
  };

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
      currentSongKey = option.dataset.value; // Update the current song key

      const songData = songRefrains[currentSongKey];

      // Set the recording duration and update UI
      recordingDuration = songData.time || 15;
      countdownText.textContent = recordingDuration;

      // Update the refrain text display
      if (songData && songData.text) {
        refrainOutput.textContent = songData.text;
        refrainOutput.classList.add("visible");
      } else {
        refrainOutput.classList.remove("visible");
      }

      // Enable the button
      captionButton.disabled = false;

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

  function startRecordingTimer() {
    let remainingTime = recordingDuration;

    const updateTimer = () => {
      countdownText.textContent = remainingTime;
      const progressPercentage = (remainingTime / recordingDuration) * 100;
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
          const language = songRefrains[currentSongKey]?.language || "en-US"; // Default to en-US
          const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
          const wsUrl = `${wsProtocol}${window.location.host}/listen?language_code=${language}`;
          socket = new WebSocket(wsUrl);

          socket.onopen = () => {
            captionOutput.textContent = "Connected. Please start singing.";
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
            stopRecordingTimer(); // Ensure timer is hidden on close
            captionButton.textContent = start_singing;
            captionButton.disabled = false; // Re-enable button

            // --- Perform Scoring ---
            const originalRefrain = songRefrains[currentSongKey];
            if (originalRefrain && finalWords.length > 0) {
                            const score = calculateScore(finalWords, originalRefrain);
              checkAndSaveHighScore(score.overallScore);
              let scoreHtml =
                `Score: <span class="score-value">${score.overallScore}/100</span><br>` +
                `(Accuracy: <span class="score-value">${score.accuracyScore}</span>, Confidence: <span class="score-value">${score.confidenceScore}</span>`;

              if (score.timingScore !== undefined) {
                scoreHtml += `, Timing: <span class="score-value">${score.timingScore}</span>)`;
              } else if (score.rhythmScore !== undefined) {
                scoreHtml += `, Rhythm: <span class="score-value">${score.rhythmScore}</span>)`;
              } else {
                scoreHtml += `)`;
              }
              captionOutput.textContent = finalTranscript;
              finalScoreOutput.innerHTML = scoreHtml; // Use innerHTML to render spans
              finalScoreOutput.style.display = "block"; // Show the container
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
  const listenBtn = document.getElementById('listen-btn');
  const checkBtn = document.getElementById('check-btn');
  const feedbackEl = document.getElementById('feedback');
  const audioPlayer = document.getElementById('audio-player');
  const answerInput = document.getElementById('answer-input');
  const playAgainBtn = document.getElementById('play-again-btn');

  let currentPhrase = '';
  let playerName = '';
  let isFetching = false;
  let roundTimerStart = 0;
  let recentRounds = [];

  listenBtn.addEventListener("click", playsound);
  checkBtn.addEventListener('click', checkAnswer);
  playAgainBtn.addEventListener('click', resetGame);

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
                      newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
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
    listenBtn.textContent = 'Carregando...';

    try {
          const response = await fetch('/api/new-phrase');
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json();
          currentPhrase = data.phrase;
          synthesizeAndPlay(currentPhrase);
      } catch (error) {
          console.error('Error fetching new phrase:', error);
          feedbackEl.textContent = 'Erro ao buscar frase.';
      } finally {
          isFetching = false;
          listenBtn.disabled = false;
          listenBtn.textContent = 'Ouvir a Frase';
      }
  }

  async function synthesizeAndPlay(text) {
      try {
        const response = await fetch('/api/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text }),
        });
        if (!response.ok) throw new Error('Failed to synthesize audio');
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        audioPlayer.play();
      } catch (error) {
        console.error('Error synthesizing audio:', error);
        feedbackEl.textContent = 'Erro ao gerar áudio.';
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
        const accuracyScore = Math.max(0, 80 - (distance * 5));
        const timeBonus = Math.max(0, 20 - (responseTime * 2));
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
        playAgainBtn.style.display = 'block';

        const scoreLearning = Math.round(accuracyScore)  + Math.round(timeBonus);

        modalScoreTextLearning.textContent = `You scored ${scoreLearning} points! Enter your name to save your score.`;
        scoreLearningInput.value = scoreLearning;
        playerNameInputLearning.value = "";
        modalLearning.style.display = "flex";
        playerNameInputLearning.focus();
    }

    function resetGame() {
        feedbackEl.innerHTML = '';
        answerInput.value = '';
        playAgainBtn.style.display = 'none';
        listenBtn.disabled = false;
    }
});
