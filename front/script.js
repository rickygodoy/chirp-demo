document.addEventListener("DOMContentLoaded", () => {
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
      startTime: parseFloat(w.startOffset),
      endTime: parseFloat(w.endOffset),
    }));
  }

  const songRefrains = {
    "hotel-california": {
      text: `Welcome to the Hotel California\nSuch a lovely place (such a lovely place), such a lovely face`,
      words: processWords([
        {
          startOffset: "1.120s",
          endOffset: "1.520s",
          word: "Welcome",
          confidence: 0.57869446,
        },
        {
          startOffset: "1.520s",
          endOffset: "1.760s",
          word: "to",
          confidence: 0.6914779,
        },
        {
          startOffset: "1.760s",
          endOffset: "1.960s",
          word: "the",
          confidence: 0.66414154,
        },
        {
          startOffset: "1.960s",
          endOffset: "2.920s",
          word: "hotel",
          confidence: 0.47806403,
        },
        {
          startOffset: "2.920s",
          endOffset: "4.360s",
          word: "California.",
          confidence: 0.6076948,
        },
        {
          startOffset: "6.640s",
          endOffset: "6.920s",
          word: "Such",
          confidence: 0.8000884,
        },
        {
          startOffset: "6.920s",
          endOffset: "6.960s",
          word: "a",
          confidence: 0.800502,
        },
        {
          startOffset: "6.960s",
          endOffset: "7.640s",
          word: "lovely",
          confidence: 0.66628623,
        },
        {
          startOffset: "7.640s",
          endOffset: "8.240s",
          word: "place.",
          confidence: 0.6815639,
        },
        {
          startOffset: "8.240s",
          endOffset: "8.640s",
          word: "Such",
          confidence: 0.7269194,
        },
        {
          startOffset: "8.640s",
          endOffset: "8.680s",
          word: "a",
          confidence: 0.8859668,
        },
        {
          startOffset: "8.680s",
          endOffset: "9.280s",
          word: "lovely",
          confidence: 0.7817678,
        },
        {
          startOffset: "9.280s",
          endOffset: "9.920s",
          word: "place.",
          confidence: 0.7867407,
        },
        {
          startOffset: "9.920s",
          endOffset: "10.200s",
          word: "Such",
          confidence: 0.5348571,
        },
        {
          startOffset: "10.200s",
          endOffset: "10.280s",
          word: "a",
          confidence: 0.78996915,
        },
        {
          startOffset: "10.280s",
          endOffset: "10.920s",
          word: "lovely",
          confidence: 0.78227997,
        },
        {
          startOffset: "10.920s",
          endOffset: "11.560s",
          word: "face.",
          confidence: 0.706933,
        },
      ]),
    },
    "hey-jude": {
      text: `Hey, Jude, don't make it bad\nTake a sad song and make it better`,
      words: processWords([
        {
          startOffset: "0.160s",
          endOffset: "0.880s",
          word: "Hey",
          confidence: 0.65248877,
        },
        {
          startOffset: "0.880s",
          endOffset: "2.080s",
          word: "Jude,",
          confidence: 0.5315359,
        },
        {
          startOffset: "2.960s",
          endOffset: "3.400s",
          word: "don't",
          confidence: 0.9884302,
        },
        {
          startOffset: "3.400s",
          endOffset: "3.880s",
          word: "make",
          confidence: 0.91488606,
        },
        {
          startOffset: "3.880s",
          endOffset: "4.200s",
          word: "it",
          confidence: 0.8968845,
        },
        {
          startOffset: "4.200s",
          endOffset: "5.600s",
          word: "bad.",
          confidence: 0.74136114,
        },
        {
          startOffset: "6.640s",
          endOffset: "7.120s",
          word: "Take",
          confidence: 0.92715263,
        },
        {
          startOffset: "7.120s",
          endOffset: "7.320s",
          word: "a",
          confidence: 0.92081827,
        },
        {
          startOffset: "7.320s",
          endOffset: "8.200s",
          word: "sad",
          confidence: 0.791841,
        },
        {
          startOffset: "8.200s",
          endOffset: "9.560s",
          word: "song",
          confidence: 0.73631114,
        },
        {
          startOffset: "9.560s",
          endOffset: "9.880s",
          word: "and",
          confidence: 0.88916713,
        },
        {
          startOffset: "9.880s",
          endOffset: "10.400s",
          word: "make",
          confidence: 0.93542194,
        },
        {
          startOffset: "10.400s",
          endOffset: "10.680s",
          word: "it",
          confidence: 0.9077727,
        },
        {
          startOffset: "10.680s",
          endOffset: "12.480s",
          word: "better.",
          confidence: 0.7740014,
        },
      ]),
    },
    "we-are-the-champions": {
      text: "We are the champions, my friends\nAnd we'll keep on fighting 'til the end",
      words: processWords([{"startOffset":"0.040s","endOffset":"0.280s","word":"We","confidence":0.4668064},{"startOffset":"1.480s","endOffset":"1.680s","word":"are","confidence":0.60303694},{"startOffset":"1.680s","endOffset":"1.840s","word":"the","confidence":0.6217474},{"startOffset":"1.840s","endOffset":"3.280s","word":"champions,","confidence":0.6972384},{"startOffset":"3.480s","endOffset":"3.760s","word":"my","confidence":0.9673665},{"startOffset":"3.760s","endOffset":"5.560s","word":"friend.","confidence":0.58818644},{"startOffset":"7.320s","endOffset":"7.640s","word":"And","confidence":0.85433483},{"startOffset":"7.640s","endOffset":"8.880s","word":"we'll","confidence":0.83976525},{"startOffset":"8.880s","endOffset":"9.320s","word":"keep","confidence":0.80760604},{"startOffset":"9.320s","endOffset":"9.560s","word":"on","confidence":0.820934},{"startOffset":"9.560s","endOffset":"10.800s","word":"fighting","confidence":0.615745},{"startOffset":"11.080s","endOffset":"11.360s","word":"till","confidence":0.8044917},{"startOffset":"11.360s","endOffset":"11.640s","word":"the","confidence":0.79413277},{"startOffset":"11.640s","endOffset":"13.240s","word":"end.","confidence":0.6770756}]),
    },
    "die-with-a-smile": {
      text: "If the world was ending, I'd wanna be next to you\nIf the party was over and our time on Earth was through",
      words: processWords([{"startOffset":"0.520s","endOffset":"0.880s","word":"If","confidence":0.55994964},{"startOffset":"0.880s","endOffset":"1.120s","word":"the","confidence":0.49848804},{"startOffset":"1.120s","endOffset":"1.960s","word":"world","confidence":0.56419206},{"startOffset":"1.960s","endOffset":"2.320s","word":"was","confidence":0.59152925},{"startOffset":"2.560s","endOffset":"3.480s","word":"ending,","confidence":0.7066257},{"startOffset":"3.560s","endOffset":"3.840s","word":"I","confidence":0.68406445},{"startOffset":"3.840s","endOffset":"4.120s","word":"want","confidence":0.655856},{"startOffset":"4.120s","endOffset":"4.240s","word":"to","confidence":0.882652},{"startOffset":"4.240s","endOffset":"4.480s","word":"be","confidence":0.81118363},{"startOffset":"4.480s","endOffset":"5.360s","word":"next","confidence":0.6532067},{"startOffset":"5.400s","endOffset":"5.680s","word":"to","confidence":0.84712785},{"startOffset":"5.680s","endOffset":"6.880s","word":"you.","confidence":0.69807184},{"startOffset":"7.240s","endOffset":"7.400s","word":"If","confidence":0.73863554},{"startOffset":"7.400s","endOffset":"7.480s","word":"the","confidence":0.6739867},{"startOffset":"7.920s","endOffset":"8.520s","word":"party","confidence":0.78129953},{"startOffset":"8.520s","endOffset":"8.920s","word":"was","confidence":0.69297487},{"startOffset":"8.960s","endOffset":"9.840s","word":"over","confidence":0.6556026},{"startOffset":"9.880s","endOffset":"10.120s","word":"and","confidence":0.6781423},{"startOffset":"10.120s","endOffset":"10.400s","word":"our","confidence":0.5095954},{"startOffset":"10.400s","endOffset":"10.960s","word":"time","confidence":0.6786925},{"startOffset":"10.960s","endOffset":"11.080s","word":"on","confidence":0.63941103},{"startOffset":"11.480s","endOffset":"11.560s","word":"earth","confidence":0.58176357},{"startOffset":"11.960s","endOffset":"12.320s","word":"was","confidence":0.7223852},{"startOffset":"12.320s","endOffset":"12.880s","word":"through.","confidence":0.4855806}]),
    },
    "flowers": {
      text: "I can buy myself flowers\nWrite my name in the sand\nTalk to myself for hours\nSay things you don't understand",
      words: processWords([{"startOffset":"0.320s","endOffset":"0.560s","word":"I","confidence":0.71311253},{"startOffset":"0.560s","endOffset":"0.840s","word":"can","confidence":0.71535504},{"startOffset":"0.840s","endOffset":"1.120s","word":"buy","confidence":0.33463502},{"startOffset":"1.120s","endOffset":"1.520s","word":"myself","confidence":0.63115848},{"startOffset":"1.520s","endOffset":"3.480s","word":"flowers.","confidence":0.5463495},{"startOffset":"4.360s","endOffset":"4.720s","word":"Write","confidence":0.8576216},{"startOffset":"4.720s","endOffset":"4.920s","word":"my","confidence":0.87087053},{"startOffset":"4.920s","endOffset":"5.320s","word":"name","confidence":0.939588},{"startOffset":"5.320s","endOffset":"5.560s","word":"in","confidence":0.819954},{"startOffset":"5.560s","endOffset":"7.480s","word":"sand.","confidence":0.747089},{"startOffset":"8.200s","endOffset":"8.520s","word":"Talk","confidence":0.86496115},{"startOffset":"8.520s","endOffset":"8.720s","word":"to","confidence":0.8716344},{"startOffset":"8.720s","endOffset":"9.520s","word":"myself","confidence":0.7936557},{"startOffset":"9.520s","endOffset":"9.760s","word":"for","confidence":0.7106862},{"startOffset":"9.760s","endOffset":"11.600s","word":"hours.","confidence":0.7490677},{"startOffset":"12.240s","endOffset":"12.480s","word":"Say","confidence":0.85443443},{"startOffset":"12.480s","endOffset":"12.840s","word":"things","confidence":0.9039715},{"startOffset":"12.840s","endOffset":"13s","word":"you","confidence":0.87324065},{"startOffset":"13s","endOffset":"13.640s","word":"don't","confidence":0.88804704},{"startOffset":"13.640s","endOffset":"15.480s","word":"understand.","confidence":0.77045786}]),
    },
    "shake-it-off": {
      text: "'Cause the players gonna play (play, play, play, play)\nAnd the haters gonna hate (hate, hate, hate, hate)\nBaby, I'm just gonna shake (shake, shake, shake, shake)\nI shake it off, I shake it off",
      words: processWords([{"startOffset":"0.200s","endOffset":"0.440s","word":"Cause","confidence":0.48732},{"startOffset":"0.440s","endOffset":"0.560s","word":"the","confidence":0.9080738},{"startOffset":"0.560s","endOffset":"1s","word":"player's","confidence":0.8504094},{"startOffset":"1s","endOffset":"1.320s","word":"gonna","confidence":0.6028106},{"startOffset":"1.320s","endOffset":"1.640s","word":"play,","confidence":0.6514136},{"startOffset":"1.640s","endOffset":"2.040s","word":"play,","confidence":0.9182372},{"startOffset":"2.040s","endOffset":"2.400s","word":"play,","confidence":0.81878775},{"startOffset":"2.400s","endOffset":"2.800s","word":"play,","confidence":0.9377523},{"startOffset":"2.800s","endOffset":"3.280s","word":"play.","confidence":0.74779224},{"startOffset":"3.280s","endOffset":"3.440s","word":"And","confidence":0.8792152},{"startOffset":"3.440s","endOffset":"3.560s","word":"the","confidence":0.8218417},{"startOffset":"3.560s","endOffset":"3.960s","word":"haters","confidence":0.86554193},{"startOffset":"3.960s","endOffset":"4.320s","word":"gonna","confidence":0.8594691},{"startOffset":"4.320s","endOffset":"4.720s","word":"hate,","confidence":0.876114},{"startOffset":"4.720s","endOffset":"5.120s","word":"hate,","confidence":0.9499217},{"startOffset":"5.120s","endOffset":"5.480s","word":"hate,","confidence":0.9530709},{"startOffset":"5.480s","endOffset":"5.880s","word":"hate,","confidence":0.89712787},{"startOffset":"5.880s","endOffset":"6.240s","word":"hate,","confidence":0.8295778},{"startOffset":"6.240s","endOffset":"6.600s","word":"baby.","confidence":0.8871305},{"startOffset":"6.600s","endOffset":"6.760s","word":"I'm","confidence":0.89362544},{"startOffset":"6.760s","endOffset":"6.960s","word":"just","confidence":0.9450283},{"startOffset":"6.960s","endOffset":"7.280s","word":"gonna","confidence":0.8353841},{"startOffset":"7.280s","endOffset":"7.680s","word":"shake,","confidence":0.90584975},{"startOffset":"7.680s","endOffset":"8.080s","word":"shake,","confidence":0.89143443},{"startOffset":"8.080s","endOffset":"8.440s","word":"shake,","confidence":0.97114575},{"startOffset":"8.440s","endOffset":"8.840s","word":"shake,","confidence":0.8891611},{"startOffset":"8.840s","endOffset":"9.320s","word":"shake.","confidence":0.7689632},{"startOffset":"9.600s","endOffset":"9.840s","word":"Shake","confidence":0.94640446},{"startOffset":"9.840s","endOffset":"10s","word":"it","confidence":0.77859044},{"startOffset":"10s","endOffset":"10.080s","word":"off.","confidence":0.5872044},{"startOffset":"10.560s","endOffset":"10.960s","word":"Shake","confidence":0.93606955},{"startOffset":"10.960s","endOffset":"11.120s","word":"it","confidence":0.7719918},{"startOffset":"11.120s","endOffset":"11.200s","word":"off.","confidence":0.780211}]),
    },
    "evidencias": {
      text: "E nessa loucura de dizer que não te quero\nVou negando as aparências\nDisfarçando as evidências",
      words: processWords([{"startOffset":"1.360s","endOffset":"1.600s","word":"E","confidence":0.70469546},{"startOffset":"1.600s","endOffset":"2.200s","word":"nessa","confidence":0.8585737},{"startOffset":"2.200s","endOffset":"3.280s","word":"loucura","confidence":0.7852982},{"startOffset":"3.520s","endOffset":"3.640s","word":"de","confidence":0.8580651},{"startOffset":"3.640s","endOffset":"4.120s","word":"dizer","confidence":0.9825194},{"startOffset":"4.120s","endOffset":"4.280s","word":"que","confidence":0.9496012},{"startOffset":"4.280s","endOffset":"4.560s","word":"não","confidence":0.8809275},{"startOffset":"4.560s","endOffset":"4.720s","word":"te","confidence":0.9834612},{"startOffset":"4.720s","endOffset":"5.760s","word":"quero,","confidence":0.815038},{"startOffset":"5.920s","endOffset":"6.080s","word":"vou","confidence":0.9305195},{"startOffset":"6.080s","endOffset":"6.640s","word":"negando","confidence":0.99198896},{"startOffset":"6.640s","endOffset":"6.800s","word":"as","confidence":0.85482216},{"startOffset":"6.800s","endOffset":"8.120s","word":"aparências,","confidence":0.8098265},{"startOffset":"8.360s","endOffset":"9.080s","word":"disfarçando","confidence":0.91415167},{"startOffset":"9.080s","endOffset":"9.240s","word":"as","confidence":0.7937284},{"startOffset":"9.240s","endOffset":"10.480s","word":"evidências.","confidence":0.8606412}]),
    },
    "pais-e-filhos": {
      text: "É preciso amar\nAs pessoas como se não houvesse amanhã\nPorque se você parar pra pensar",
      words: processWords([{"startOffset":"0.240s","endOffset":"0.480s","word":"É","confidence":0.8207496},{"startOffset":"0.480s","endOffset":"1.560s","word":"preciso","confidence":0.7762518},{"startOffset":"1.560s","endOffset":"4.240s","word":"amar","confidence":0.45182404},{"startOffset":"4.240s","endOffset":"4.480s","word":"as","confidence":0.80113554},{"startOffset":"4.480s","endOffset":"5.440s","word":"pessoas","confidence":0.8256066},{"startOffset":"5.440s","endOffset":"6.040s","word":"como","confidence":0.9082742},{"startOffset":"6.040s","endOffset":"6.400s","word":"se","confidence":0.9266483},{"startOffset":"6.400s","endOffset":"6.920s","word":"não","confidence":0.7326519},{"startOffset":"6.920s","endOffset":"7.880s","word":"houvesse","confidence":0.8042709},{"startOffset":"7.880s","endOffset":"9.240s","word":"amanhã,","confidence":0.599242},{"startOffset":"10.360s","endOffset":"10.880s","word":"porque","confidence":0.8042851},{"startOffset":"10.880s","endOffset":"11.280s","word":"se","confidence":0.9649434},{"startOffset":"11.280s","endOffset":"11.920s","word":"você","confidence":0.8638656},{"startOffset":"11.920s","endOffset":"12.760s","word":"parar","confidence":0.5254164},{"startOffset":"14.680s","endOffset":"14.960s","word":"para","confidence":0.7795591},{"startOffset":"14.960s","endOffset":"16.680s","word":"pensar","confidence":0.465469}]),
    },
    "eu-sei-de-cor": {
      text: "Deixa, deixa mesmo de ser importante\nVai deixando a gente pra outra hora\nE quando se der conta, já passou\nQuando olhar pra trás, já fui embora",
      words: processWords([{"endOffset":"1.440s","word":"Deixa,","confidence":0.6445414},{"startOffset":"1.880s","endOffset":"2.360s","word":"deixa","confidence":0.8115953},{"startOffset":"2.360s","endOffset":"2.880s","word":"mesmo","confidence":0.8698161},{"startOffset":"2.880s","endOffset":"3.120s","word":"de","confidence":0.8724436},{"startOffset":"3.120s","endOffset":"3.440s","word":"ser","confidence":0.83004314},{"startOffset":"3.440s","endOffset":"5.240s","word":"importante.","confidence":0.69771075},{"startOffset":"5.800s","endOffset":"6.040s","word":"Vai","confidence":0.8263536},{"startOffset":"6.040s","endOffset":"6.600s","word":"deixando","confidence":0.9272254},{"startOffset":"6.600s","endOffset":"6.680s","word":"a","confidence":0.8525402},{"startOffset":"6.680s","endOffset":"7.200s","word":"gente","confidence":0.93019706},{"startOffset":"7.200s","endOffset":"7.360s","word":"para","confidence":0.8341232},{"startOffset":"7.360s","endOffset":"7.760s","word":"outra","confidence":0.7752662},{"startOffset":"7.760s","endOffset":"8.640s","word":"hora.","confidence":0.66225755},{"startOffset":"9.360s","endOffset":"9.600s","word":"E","confidence":0.94132656},{"startOffset":"9.600s","endOffset":"10.080s","word":"quando","confidence":0.83863896},{"startOffset":"10.080s","endOffset":"10.320s","word":"se","confidence":0.9870329},{"startOffset":"10.320s","endOffset":"10.560s","word":"der","confidence":0.7924602},{"startOffset":"10.560s","endOffset":"11s","word":"conta","confidence":0.8162539},{"startOffset":"11s","endOffset":"11.160s","word":"já","confidence":0.84962445},{"startOffset":"11.160s","endOffset":"12.280s","word":"passou.","confidence":0.7258565},{"startOffset":"12.760s","endOffset":"13.360s","word":"Quando","confidence":0.7623989},{"startOffset":"13.360s","endOffset":"13.720s","word":"olhar","confidence":0.8277939},{"startOffset":"13.720s","endOffset":"13.960s","word":"para","confidence":0.8124879},{"startOffset":"13.960s","endOffset":"14.320s","word":"trás","confidence":0.8929513},{"startOffset":"14.320s","endOffset":"14.480s","word":"já","confidence":0.8434086},{"startOffset":"14.480s","endOffset":"14.800s","word":"fui","confidence":0.65481204},{"startOffset":"14.800s","endOffset":"16.240s","word":"embora.","confidence":0.67799985}]),
    },
    "o-sol": {
      text: "E se quiser saber\nPra onde eu vou\nPra onde tenha sol\nÉ pra lá que eu vou",
      words: processWords([{"startOffset":"0.720s","endOffset":"1.040s","word":"E","confidence":0.71286696},{"startOffset":"1.040s","endOffset":"1.440s","word":"se","confidence":0.9518642},{"startOffset":"1.440s","endOffset":"2.160s","word":"quiser","confidence":0.7649679},{"startOffset":"2.160s","endOffset":"2.880s","word":"saber","confidence":0.83823067},{"startOffset":"2.880s","endOffset":"3.320s","word":"para","confidence":0.68404037},{"startOffset":"3.320s","endOffset":"4.040s","word":"onde","confidence":0.8266268},{"startOffset":"4.040s","endOffset":"4.360s","word":"eu","confidence":0.8877309},{"startOffset":"4.360s","endOffset":"5.240s","word":"vou,","confidence":0.69192016},{"startOffset":"6.120s","endOffset":"6.360s","word":"para","confidence":0.8116446},{"startOffset":"6.360s","endOffset":"6.880s","word":"onde","confidence":0.9538643},{"startOffset":"6.880s","endOffset":"7.320s","word":"tenha","confidence":0.7631075},{"startOffset":"7.320s","endOffset":"8.200s","word":"sol,","confidence":0.6957217},{"startOffset":"9.360s","endOffset":"9.600s","word":"é","confidence":0.9323613},{"startOffset":"9.600s","endOffset":"9.880s","word":"para","confidence":0.9477288},{"startOffset":"9.880s","endOffset":"10.200s","word":"lá","confidence":0.8654167},{"startOffset":"10.200s","endOffset":"10.320s","word":"que","confidence":0.97153014},{"startOffset":"10.320s","endOffset":"10.520s","word":"eu","confidence":0.91018695},{"startOffset":"10.520s","endOffset":"11.040s","word":"vou.","confidence":0.87512565}]),
    },
    "velha-infancia": {
      text: "Eu gosto de você\nE gosto de ficar com você\nMeu riso é tão feliz contigo\nO meu melhor amigo é o meu amor",
      words: processWords([{"startOffset":"1.280s","endOffset":"1.720s","word":"Eu","confidence":0.73230064},{"startOffset":"1.720s","endOffset":"2.720s","word":"gosto","confidence":0.6242135},{"startOffset":"2.720s","endOffset":"3.320s","word":"de","confidence":0.6898675},{"startOffset":"3.320s","endOffset":"4.400s","word":"você","confidence":0.57682914},{"startOffset":"5.560s","endOffset":"6s","word":"e","confidence":0.7379964},{"startOffset":"6s","endOffset":"7s","word":"gosto","confidence":0.64123833},{"startOffset":"7s","endOffset":"7.400s","word":"de","confidence":0.71839803},{"startOffset":"7.400s","endOffset":"8.120s","word":"ficar","confidence":0.6550942},{"startOffset":"8.120s","endOffset":"8.400s","word":"com","confidence":0.7119775},{"startOffset":"8.400s","endOffset":"9.560s","word":"você.","confidence":0.74310356},{"startOffset":"9.720s","endOffset":"10.240s","word":"Meu","confidence":0.8043847},{"startOffset":"10.240s","endOffset":"10.920s","word":"riso","confidence":0.721241},{"startOffset":"10.920s","endOffset":"10.960s","word":"é","confidence":0.715841},{"startOffset":"11.320s","endOffset":"11.640s","word":"tão","confidence":0.9265206},{"startOffset":"11.640s","endOffset":"12.160s","word":"feliz","confidence":0.9498914},{"startOffset":"12.160s","endOffset":"13.800s","word":"contigo,","confidence":0.67291784},{"startOffset":"13.840s","endOffset":"13.960s","word":"o","confidence":0.8243349},{"startOffset":"13.960s","endOffset":"14.320s","word":"meu","confidence":0.88601303},{"startOffset":"14.320s","endOffset":"15.120s","word":"melhor","confidence":0.7500941},{"startOffset":"15.120s","endOffset":"16.080s","word":"amigo","confidence":0.70985645},{"startOffset":"16.080s","endOffset":"16.280s","word":"é","confidence":0.67967314},{"startOffset":"16.280s","endOffset":"16.320s","word":"o","confidence":0.6542626},{"startOffset":"16.680s","endOffset":"17.040s","word":"meu","confidence":0.9001742},{"startOffset":"17.040s","endOffset":"18s","word":"amor.","confidence":0.74795353}]),
    },
  };

  const captionButton = document.getElementById("caption-button");
  const captionOutput = document.getElementById("caption-output");
  const refrainOutput = document.getElementById("refrain-output");
  const songSelect = document.querySelector(".custom-select");
  const songSelectTrigger = songSelect.querySelector(".select-trigger");
  const songOptions = songSelect.querySelectorAll(".option");
  const selectedText = songSelectTrigger.querySelector("span");

  // Timer and Progress Bar elements
  const timerContainer = document.getElementById("timer-container");
  const countdownText = document.getElementById("countdown-text");
  const progressBar = document.getElementById("progress-bar");

  // Timer variables
  let countdownInterval;
  const RECORDING_DURATION = 15; // seconds

  // Set initial state for the timer
  countdownText.textContent = RECORDING_DURATION;

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
    let remainingTime = RECORDING_DURATION;

    const updateTimer = () => {
      countdownText.textContent = remainingTime;
      const progressPercentage = (remainingTime / RECORDING_DURATION) * 100;
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
    countdownText.textContent = RECORDING_DURATION;
  }

  captionButton.addEventListener("click", async () => {
    if (captionButton.textContent === start_singing) {
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
            stopRecordingTimer(); // Ensure timer is hidden on close
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
