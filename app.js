(() => {
  "use strict";

  const config = window.MALLO_SHOWCASE_CONFIG || {};
  const apiBaseUrl = String(config.API_BASE_URL || "").replace(/\/$/, "");
  const requestTimeoutMs = Number(config.REQUEST_TIMEOUT_MS) || 90000;
  const maxRecordingSec = Number(config.MAX_RECORDING_SEC) || 60;

  const studio = document.querySelector(".studio");
  const recordButton = document.querySelector("#recordButton");
  const recordHint = document.querySelector("#recordHint");
  const timer = document.querySelector("#timer");
  const statusPanel = document.querySelector("#statusPanel");
  const statusTitle = document.querySelector("#statusTitle");
  const statusDetail = document.querySelector("#statusDetail");
  const resultPanel = document.querySelector("#resultPanel");
  const transcription = document.querySelector("#transcription");
  const inferenceLatency = document.querySelector("#inferenceLatency");
  const audioDuration = document.querySelector("#audioDuration");
  const roundTripLatency = document.querySelector("#roundTripLatency");
  const errorBox = document.querySelector("#errorBox");

  let mediaRecorder = null;
  let stream = null;
  let chunks = [];
  let timerId = null;
  let startedAt = 0;
  let state = "idle";

  const supportedMimeType = () => [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ].find((type) => window.MediaRecorder?.isTypeSupported(type)) || "";

  function setState(next, detail = "") {
    state = next;
    studio.dataset.state = next;
    statusPanel.dataset.state = next;
    const states = {
      idle: ["준비됨", "버튼을 누르고 한국어로 말해 주세요", "녹음 시작", "녹음 시작"],
      listening: ["Listening", "음성을 듣고 있습니다", "녹음 종료", "녹음 종료"],
      processing: ["Processing", "Mallo STT가 음성을 처리하고 있습니다", "처리 중", "처리 중"],
      done: ["Done", "전사가 완료되었습니다", "다시 녹음", "다시 녹음"],
      error: ["오류", detail || "요청을 완료하지 못했습니다", "다시 시도", "다시 시도"],
    };
    const [title, defaultDetail, hint, label] = states[next];
    statusTitle.textContent = title;
    statusDetail.textContent = detail || defaultDetail;
    recordHint.textContent = hint;
    recordButton.setAttribute("aria-label", label);
    recordButton.disabled = next === "processing";
  }

  function setError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    setState("error", message);
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function updateTimer() {
    const elapsed = Math.min((performance.now() - startedAt) / 1000, maxRecordingSec);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, "0");
    timer.textContent = `${minutes}:${seconds}`;
    timer.dateTime = `PT${Math.floor(elapsed)}S`;
    if (elapsed >= maxRecordingSec) stopRecording();
  }

  async function startRecording() {
    clearError();
    resultPanel.hidden = true;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("이 브라우저는 마이크 녹음을 지원하지 않습니다. 최신 Chrome, Edge 또는 Safari를 사용해 주세요.");
      return;
    }
    if (!apiBaseUrl) {
      setError("Inference backend 주소가 아직 설정되지 않았습니다. config.js의 API_BASE_URL을 설정해 주세요.");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      chunks = [];
      const mimeType = supportedMimeType();
      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      mediaRecorder.addEventListener("stop", submitRecording, { once: true });
      mediaRecorder.start(250);
      startedAt = performance.now();
      timer.textContent = "00:00";
      timerId = window.setInterval(updateTimer, 200);
      setState("listening");
    } catch (error) {
      const denied = error?.name === "NotAllowedError";
      setError(denied
        ? "마이크 권한이 거부되었습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요."
        : "마이크를 시작할 수 없습니다. 다른 앱이 마이크를 사용 중인지 확인해 주세요.");
      releaseStream();
    }
  }

  function releaseStream() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  function stopRecording() {
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
    releaseStream();
    setState("processing");
  }

  async function submitRecording() {
    const mimeType = mediaRecorder?.mimeType || chunks[0]?.type || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });
    mediaRecorder = null;
    chunks = [];
    if (!blob.size) {
      setError("녹음된 음성이 없습니다. 다시 시도해 주세요.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);
    const form = new FormData();
    form.append("audio", blob, `recording.${mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm"}`);
    const requestStarted = performance.now();

    try {
      const response = await fetch(`${apiBaseUrl}/transcribe`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      let payload = {};
      try { payload = await response.json(); } catch { /* handled below */ }
      if (!response.ok) throw new Error(payload.detail || `서버 오류 (${response.status})`);
      const roundTripMs = performance.now() - requestStarted;
      transcription.textContent = payload.text || "음성을 인식하지 못했습니다.";
      inferenceLatency.textContent = `${Number(payload.inference_ms).toLocaleString("ko-KR")} ms`;
      audioDuration.textContent = `${Number(payload.audio_duration_sec).toFixed(2)} s`;
      roundTripLatency.textContent = `${Math.round(roundTripMs).toLocaleString("ko-KR")} ms`;
      resultPanel.hidden = false;
      setState("done");
    } catch (error) {
      setError(error?.name === "AbortError"
        ? "요청 시간이 초과되었습니다. backend 상태를 확인하고 다시 시도해 주세요."
        : `전사 요청에 실패했습니다: ${error.message || "backend 연결을 확인해 주세요."}`);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  recordButton.addEventListener("click", () => {
    if (state === "listening") stopRecording();
    else if (state !== "processing") startRecording();
  });

  window.addEventListener("beforeunload", releaseStream);
  setState("idle");
})();
