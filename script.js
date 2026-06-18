/* =========================================================================
   CÂMARA ESCURA DIGITAL — script.js
   =========================================================================
   BREVO (ex-Sendinblue) — 300 emails/dia GRÁTIS com foto incorporada

   IMPORTANTE: a API Key do Brevo NÃO fica aqui (seria visível a qualquer
   pessoa que veja o código-fonte da página). O envio é feito através do
   endpoint "/api/send-email" (ver ficheiro api/send-email.js), que corre
   no servidor da Vercel e guarda a chave em segredo.

   Configuração necessária no painel da Vercel (Settings → Environment
   Variables): BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME.
   Ver README.md para o passo a passo completo.
   ========================================================================= */

const EMAIL_ENDPOINT = "/api/send-email";

/* ---------------------------------------------------------------------- */
/* Tema claro / escuro                                                     */
/* ---------------------------------------------------------------------- */

const themeToggle = document.getElementById("themeToggle");
const themeIcon   = document.getElementById("themeIcon");
const themeLabel  = document.getElementById("themeLabel");
const html        = document.documentElement;

let isDark = true;

themeToggle.addEventListener("click", () => {
  isDark = !isDark;
  html.setAttribute("data-theme", isDark ? "dark" : "light");
  themeIcon.textContent  = isDark ? "☀️" : "🌙";
  themeLabel.textContent = isDark ? "claro" : "escuro";
  localStorage.setItem("tema", isDark ? "dark" : "light");
});

// Restaurar tema guardado
(function () {
  const saved = localStorage.getItem("tema");
  if (saved === "light") {
    isDark = false;
    html.setAttribute("data-theme", "light");
    themeIcon.textContent  = "🌙";
    themeLabel.textContent = "escuro";
  }
})();

/* ---------------------------------------------------------------------- */
/* Estado                                                                  */
/* ---------------------------------------------------------------------- */

const state = {
  photos: [],
  currentIndex: -1,
  filters: {
    brightness: 100, contrast: 100, saturate: 100,
    blur: 0, sepia: 0, grayscale: 0, hue: 0, invert: 0,
  },
};

/* ---------------------------------------------------------------------- */
/* Referências DOM                                                         */
/* ---------------------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const fileInput    = $("fileInput");
const addPhotoBtn  = $("addPhotoBtn");
const galleryStrip = $("galleryStrip");
const canvas       = $("previewCanvas");
const ctx          = canvas.getContext("2d");
const emptyState   = $("emptyState");
const frameCaption = $("frameCaption");
const canvasWrap   = $("canvasWrap");

const sliderIds = ["brightness","contrast","saturate","blur","sepia","grayscale","hue","invert"];
const sliders   = {};
sliderIds.forEach((id) => { sliders[id] = $(id); });

const resetBtn    = $("resetBtn");
const downloadBtn = $("downloadBtn");
const presetsBox  = $("presets");

const emailTo        = $("emailTo");
const emailMessage   = $("emailMessage");
const resizeForEmail = $("resizeForEmail");
const sendBtn        = $("sendBtn");
const statusMsg      = $("statusMsg");
const safelight      = $("safelight");
const safelightLabel = $("safelightLabel");

/* ---------------------------------------------------------------------- */
/* Upload de fotos                                                         */
/* ---------------------------------------------------------------------- */

addPhotoBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));

["dragover","dragenter"].forEach((evt) =>
  canvasWrap.addEventListener(evt, (e) => {
    e.preventDefault();
    canvasWrap.style.outline = "2px dashed var(--safelight)";
  })
);
["dragleave","drop"].forEach((evt) =>
  canvasWrap.addEventListener(evt, (e) => {
    e.preventDefault();
    canvasWrap.style.outline = "none";
  })
);
canvasWrap.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const entry = { id: crypto.randomUUID(), name: file.name, img };
        state.photos.push(entry);
        renderGallery();
        selectPhoto(state.photos.length - 1);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderGallery() {
  galleryStrip.querySelectorAll(".thumb").forEach((el) => el.remove());

  state.photos.forEach((photo, index) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "thumb" + (index === state.currentIndex ? " active" : "");
    thumb.title = photo.name;
    thumb.innerHTML = `<img src="${photo.img.src}" alt="${photo.name}">`;
    thumb.addEventListener("click", () => selectPhoto(index));

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remover";
    remove.addEventListener("click", (e) => { e.stopPropagation(); removePhoto(index); });
    thumb.appendChild(remove);

    galleryStrip.insertBefore(thumb, addPhotoBtn);
  });
}

function removePhoto(index) {
  state.photos.splice(index, 1);
  if (state.photos.length === 0) {
    state.currentIndex = -1;
    canvas.style.display = "none";
    emptyState.style.display = "block";
    frameCaption.textContent = "sem foto carregada";
  } else {
    selectPhoto(Math.max(0, index - 1));
  }
  renderGallery();
}

function selectPhoto(index) {
  state.currentIndex = index;
  resetFilters(false);
  renderGallery();
  drawCanvas();
}

/* ---------------------------------------------------------------------- */
/* Filtros + canvas                                                        */
/* ---------------------------------------------------------------------- */

function currentPhoto() {
  return state.currentIndex >= 0 ? state.photos[state.currentIndex] : null;
}

function buildFilterString(f = state.filters) {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturate}%)`,
    `blur(${f.blur}px)`,
    `sepia(${f.sepia}%)`,
    `grayscale(${f.grayscale}%)`,
    `hue-rotate(${f.hue}deg)`,
    `invert(${f.invert}%)`,
  ].join(" ");
}

function drawCanvas() {
  const photo = currentPhoto();
  if (!photo) return;
  const { img } = photo;
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.filter = buildFilterString();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  canvas.style.display  = "block";
  emptyState.style.display = "none";
  frameCaption.textContent = `${photo.name} — ${img.naturalWidth}×${img.naturalHeight}px`;
}

sliderIds.forEach((id) => {
  sliders[id].addEventListener("input", () => {
    state.filters[id] = Number(sliders[id].value);
    updateReadouts();
    drawCanvas();
  });
});

function updateReadouts() {
  $("brightnessVal").textContent = state.filters.brightness + "%";
  $("contrastVal").textContent   = state.filters.contrast + "%";
  $("saturateVal").textContent   = state.filters.saturate + "%";
  $("blurVal").textContent       = state.filters.blur + "px";
  $("sepiaVal").textContent      = state.filters.sepia + "%";
  $("grayscaleVal").textContent  = state.filters.grayscale + "%";
  $("hueVal").textContent        = state.filters.hue + "°";
  $("invertVal").textContent     = state.filters.invert + "%";
}

function resetFilters(redraw = true) {
  state.filters = { brightness:100, contrast:100, saturate:100, blur:0, sepia:0, grayscale:0, hue:0, invert:0 };
  sliderIds.forEach((id) => { sliders[id].value = state.filters[id]; });
  updateReadouts();
  if (redraw) drawCanvas();
}

resetBtn.addEventListener("click", () => resetFilters());

/* ---------------------------------------------------------------------- */
/* Presets                                                                 */
/* ---------------------------------------------------------------------- */

const PRESETS = {
  original: { brightness:100, contrast:100, saturate:100, blur:0,   sepia:0,  grayscale:0,   hue:0,   invert:0 },
  pb:       { brightness:105, contrast:110, saturate:0,   blur:0,   sepia:0,  grayscale:100, hue:0,   invert:0 },
  sepia:    { brightness:105, contrast:95,  saturate:90,  blur:0,   sepia:80, grayscale:0,   hue:0,   invert:0 },
  vintage:  { brightness:110, contrast:90,  saturate:80,  blur:0.3, sepia:35, grayscale:5,   hue:350, invert:0 },
  frio:     { brightness:102, contrast:105, saturate:95,  blur:0,   sepia:0,  grayscale:0,   hue:195, invert:0 },
  quente:   { brightness:108, contrast:100, saturate:115, blur:0,   sepia:15, grayscale:0,   hue:15,  invert:0 },
};

presetsBox.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-preset]");
  if (!btn || !currentPhoto()) return;
  state.filters = { ...PRESETS[btn.dataset.preset] };
  sliderIds.forEach((id) => { sliders[id].value = state.filters[id]; });
  updateReadouts();
  drawCanvas();
});

/* ---------------------------------------------------------------------- */
/* Descarregar foto                                                        */
/* ---------------------------------------------------------------------- */

downloadBtn.addEventListener("click", () => {
  const photo = currentPhoto();
  if (!photo) return;
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = "editada-" + photo.name.replace(/\.[^.]+$/, "") + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
});

/* ---------------------------------------------------------------------- */
/* Preparar imagem para email (base64 JPEG reduzido)                      */
/* ---------------------------------------------------------------------- */

function getBase64ForEmail({ maxWidth = 900, quality = 0.75 } = {}) {
  const photo = currentPhoto();
  if (!photo) return null;

  const scale = Math.min(1, maxWidth / canvas.width);
  const w = Math.round(canvas.width  * scale);
  const h = Math.round(canvas.height * scale);

  const off    = document.createElement("canvas");
  off.width    = w;
  off.height   = h;
  const offCtx = off.getContext("2d");
  // Fundo branco para evitar preto no JPEG (que não suporta transparência)
  offCtx.fillStyle = "#ffffff";
  offCtx.fillRect(0, 0, w, h);
  offCtx.filter = buildFilterString();
  offCtx.drawImage(photo.img, 0, 0, w, h);

  const dataUrl = off.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1]; // só o base64, sem prefixo
}

/* ---------------------------------------------------------------------- */
/* Enviar por email via Brevo API                                          */
/* A foto é incorporada diretamente no corpo do email (inline image)      */
/* ---------------------------------------------------------------------- */

function setSafelight(stateName, label) {
  safelight.dataset.state = stateName;
  safelightLabel.textContent = label;
}

function setStatus(text, tone) {
  statusMsg.textContent = text;
  statusMsg.dataset.tone = tone || "";
}

sendBtn.addEventListener("click", async () => {
  const photo = currentPhoto();
  if (!photo) {
    setStatus("Carrega uma foto antes de enviar.", "error"); return;
  }
  if (!emailTo.value || !emailTo.checkValidity()) {
    setStatus("Escreve um email de destino válido.", "error");
    emailTo.focus(); return;
  }
  const base64 = resizeForEmail.checked
    ? getBase64ForEmail({ maxWidth: 900, quality: 0.75 })
    : getBase64ForEmail({ maxWidth: 1600, quality: 0.88 });

  if (!base64) { setStatus("Não foi possível processar a imagem.", "error"); return; }

  const mensagem = emailMessage.value.trim() || "Aqui está a tua foto editada!";
  const fileName = "editada-" + (photo.name.replace(/\.[^.]+$/, "") || "foto") + ".jpg";

  sendBtn.disabled = true;
  setSafelight("busy", "a enviar...");
  setStatus("A enviar a foto, aguarda um momento...", "busy");

  try {
    const response = await fetch(EMAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toEmail: emailTo.value,
        message: mensagem,
        imageBase64: base64,
        fileName,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      setSafelight("ok", "enviado");
      setStatus("✓ Foto enviada com sucesso para " + emailTo.value + "!", "ok");
    } else {
      throw new Error(result.message || "Erro " + response.status);
    }
  } catch (err) {
    console.error(err);
    setSafelight("error", "erro");
    setStatus("Erro ao enviar: " + (err.message || "tenta novamente mais tarde."), "error");
  } finally {
    sendBtn.disabled = false;
  }
});

/* ---------------------------------------------------------------------- */
/* Arranque                                                                */
/* ---------------------------------------------------------------------- */

updateReadouts();
