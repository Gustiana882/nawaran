/**
 * ========================================================
 * INLINE EDITOR — IMAGE EXTENSION
 * ========================================================
 *
 * Menangani field gambar: <img data-editor="image" data-name="...">
 *
 * WAJIB dimuat SETELAH editor.js, karena script ini numpang ke
 * window.InlineEditor (hook: buildFieldKey, setChange, clearChange,
 * onCancel, onSaveSuccess, notify, getAuthToken, whenAuthReady).
 *
 * PENTING: script ini TIDAK menginisialisasi Keycloak sendiri —
 * token diambil lewat window.InlineEditor.getAuthToken() /
 * whenAuthReady(), supaya cuma ADA SATU proses login Keycloak
 * (yang dijalankan editor.js). Jangan menambahkan Keycloak.init()
 * lain di file ini, karena itu penyebab loop refresh halaman.
 *
 * Fitur:
 * - Setiap <img data-editor="image"> otomatis dapat tombol "Edit"
 *   (di-inject, tidak perlu ditulis manual di HTML).
 * - Klik tombol Edit → muncul popup dengan 2 tab: Upload file atau
 *   masukkan URL gambar langsung.
 * - Upload → POST multipart/form-data ke config.uploadUrl (dengan
 *   token Keycloak dari editor.js), response diasumsikan berupa
 *   string URL polos (atau JSON string / JSON { url }, keduanya
 *   otomatis dikenali).
 * - Setelah URL didapat (dari upload maupun input manual), src
 *   gambar langsung diganti (preview) dan perubahan di-daftarkan ke
 *   editor.js lewat setChange(), sehingga saat tombol Save global
 *   ditekan, payload berbentuk { fields: { profile_image: "url..." } }
 *   sama seperti field teks biasa.
 * - Cancel di toolbar global otomatis mengembalikan src gambar ke
 *   nilai semula (lewat hook onCancel).
 * - Mendukung gambar yang muncul belakangan (mis. dari collection
 *   item baru) lewat MutationObserver ringan.
 *
 * ========================================================
 */

(function () {
  "use strict";

  const config = {
    // Selector elemen gambar yang bisa diedit.
    imageSelector: 'img[data-editor="image"]',

    // Endpoint upload file. Response yang diharapkan: string URL polos
    // (atau JSON string, atau JSON { "url": "..." } — semua dikenali).
    uploadUrl: "http://localhost:8080/api/upload",

    // Batas ukuran file upload (MB).
    maxFileSizeMb: 5,

    // Label tombol edit yang di-inject di atas tiap gambar.
    editButtonLabel: "\u270E Edit",
  };

  // Nilai src asli tiap gambar yang pernah disentuh (untuk revert saat Cancel).
  const originalSrc = new WeakMap();
  const touchedImages = new Set();

  let modalEl = null;
  let activeImage = null;

  /**
   * ========================================
   * SETUP & GUARD
   * ========================================
   */

  function ensureInlineEditor() {
    if (!window.InlineEditor) {
      console.error(
        "editor-image.js: InlineEditor (editor.js) belum dimuat. " +
          "Pastikan <script src=\"editor.js\"> ada SEBELUM editor-image.js."
      );
      return false;
    }

    const requiredHooks = [
      "buildFieldKey",
      "setChange",
      "clearChange",
      "onCancel",
      "onSaveSuccess",
      "notify",
      "getAuthToken",
      "whenAuthReady",
    ];
    const missing = requiredHooks.filter(
      (name) => typeof window.InlineEditor[name] !== "function"
    );

    if (missing.length > 0) {
      console.error(
        "editor-image.js: editor.js yang ter-load tidak punya hook: " +
          missing.join(", ") +
          ". Kemungkinan file editor.js di server masih versi lama — " +
          "ganti dengan versi terbaru yang sudah mendukung ekstensi field gambar."
      );
      return false;
    }

    return true;
  }

  /**
   * ========================================
   * TOMBOL EDIT (auto-injected)
   * ========================================
   */

  function ensureEditButton(imgEl) {
    let wrap = imgEl.parentElement;

    if (!wrap || !wrap.classList.contains("editor-image-wrap")) {
      wrap = document.createElement("span");
      wrap.className = "editor-image-wrap";
      imgEl.replaceWith(wrap);
      wrap.appendChild(imgEl);
    }

    if (wrap.querySelector('[data-editor-image-action="edit"]')) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "editor-image-edit-btn";
    btn.dataset.editorImageAction = "edit";
    btn.textContent = config.editButtonLabel;
    wrap.appendChild(btn);
  }

  function primeExistingImages() {
    document.querySelectorAll(config.imageSelector).forEach(ensureEditButton);
  }

  function observeNewImages() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;

          if (node.matches && node.matches(config.imageSelector)) {
            ensureEditButton(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll(config.imageSelector).forEach(ensureEditButton);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * ========================================
   * MODAL (Upload / URL)
   * ========================================
   */

  function ensureModal() {
    if (modalEl) return modalEl;

    const backdrop = document.createElement("div");
    backdrop.className = "editor-image-modal-backdrop";
    backdrop.innerHTML = `
      <div class="editor-image-modal">
        <h3>Ganti Gambar</h3>
        <img class="editor-image-preview" data-editor-image-preview alt="Preview" />
        <div class="editor-image-modal-tabs">
          <div class="editor-image-modal-tab active" data-editor-image-tab="upload">Upload</div>
          <div class="editor-image-modal-tab" data-editor-image-tab="url">URL</div>
        </div>
        <div class="editor-image-modal-panel active" data-editor-image-panel="upload">
          <input type="file" accept="image/*" data-editor-image-file />
        </div>
        <div class="editor-image-modal-panel" data-editor-image-panel="url">
          <input type="text" placeholder="https://contoh.com/gambar.jpg" data-editor-image-url />
        </div>
        <div class="editor-image-modal-status" data-editor-image-status></div>
        <div class="editor-image-modal-actions">
          <button type="button" class="secondary" data-editor-image-action="close">Batal</button>
          <button type="button" class="primary" data-editor-image-action="use-url" style="display:none">Gunakan URL</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    modalEl = backdrop;

    modalEl.querySelectorAll("[data-editor-image-tab]").forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.editorImageTab));
    });

    modalEl
      .querySelector('[data-editor-image-action="close"]')
      .addEventListener("click", closeModal);
    modalEl
      .querySelector('[data-editor-image-action="use-url"]')
      .addEventListener("click", handleUseUrl);
    modalEl
      .querySelector("[data-editor-image-file]")
      .addEventListener("change", handleFileSelected);

    // Klik di area backdrop (di luar kotak modal) = tutup.
    modalEl.addEventListener("click", (event) => {
      if (event.target === modalEl) closeModal();
    });

    return modalEl;
  }

  function switchTab(tabName) {
    modalEl
      .querySelectorAll("[data-editor-image-tab]")
      .forEach((t) => t.classList.toggle("active", t.dataset.editorImageTab === tabName));
    modalEl
      .querySelectorAll("[data-editor-image-panel]")
      .forEach((p) => p.classList.toggle("active", p.dataset.editorImagePanel === tabName));

    modalEl.querySelector('[data-editor-image-action="use-url"]').style.display =
      tabName === "url" ? "" : "none";

    setStatus("");
  }

  function openModal(imgEl) {
    if (!ensureInlineEditor()) return;

    ensureModal();
    activeImage = imgEl;

    if (!originalSrc.has(imgEl)) {
      originalSrc.set(imgEl, imgEl.getAttribute("src") || "");
    }
    touchedImages.add(imgEl);

    modalEl.querySelector("[data-editor-image-preview]").src = imgEl.currentSrc || imgEl.src;
    modalEl.querySelector("[data-editor-image-url]").value = "";
    modalEl.querySelector("[data-editor-image-file]").value = "";

    switchTab("upload");
    modalEl.classList.add("show");
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove("show");
    activeImage = null;
  }

  function setStatus(message, isError) {
    const el = modalEl.querySelector("[data-editor-image-status]");
    el.textContent = message || "";
    el.classList.toggle("error", !!isError);
  }

  /**
   * ========================================
   * UPLOAD FILE
   * ========================================
   */

  async function handleFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file || !activeImage) return;

    const maxBytes = config.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setStatus(`Ukuran file maksimal ${config.maxFileSizeMb}MB`, true);
      return;
    }

    setStatus("Mengunggah...");

    try {
      await window.InlineEditor.whenAuthReady();

      const token = window.InlineEditor.getAuthToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(config.uploadUrl, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload gagal (status " + response.status + ")");
      }

      const url = await parseUploadResponse(response);
      applyImageUrl(activeImage, url);
      closeModal();
      window.InlineEditor.notify("Gambar berhasil diunggah", "success");
    } catch (error) {
      console.error("editor-image.js upload error:", error);
      setStatus(error.message || "Gagal mengunggah gambar", true);
    }
  }

  /**
   * Response upload diasumsikan string URL polos, tapi tetap toleran
   * kalau ternyata JSON string ("...") atau JSON object { url: "..." }.
   */
  async function parseUploadResponse(response) {
    const raw = (await response.text()).trim();

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return parsed;
      if (parsed && typeof parsed.url === "string") return parsed.url;
    } catch (error) {
      // Bukan JSON — berarti body memang string URL polos, pakai apa adanya.
    }

    return raw;
  }

  /**
   * ========================================
   * INPUT URL MANUAL
   * ========================================
   */

  function handleUseUrl() {
    if (!activeImage) return;

    const input = modalEl.querySelector("[data-editor-image-url]");
    const url = input.value.trim();

    if (!url) {
      setStatus("URL tidak boleh kosong", true);
      return;
    }

    applyImageUrl(activeImage, url);
    closeModal();
  }

  /**
   * ========================================
   * TERAPKAN & DAFTARKAN PERUBAHAN
   * ========================================
   */

  function applyImageUrl(imgEl, url) {
    imgEl.src = url;

    const key = window.InlineEditor.buildFieldKey(imgEl);
    window.InlineEditor.setChange(key, url);
  }

  /**
   * ========================================
   * EVENT DELEGATION
   * ========================================
   */

  function bindGlobalEvents() {
    document.addEventListener("click", (event) => {
      const editBtn = event.target.closest('[data-editor-image-action="edit"]');
      if (!editBtn) return;

      event.preventDefault();
      event.stopPropagation();

      const wrap = editBtn.closest(".editor-image-wrap");
      const imgEl = wrap ? wrap.querySelector(config.imageSelector) : null;
      if (imgEl) openModal(imgEl);
    });
  }

  /**
   * ========================================
   * INTEGRASI KE EDITOR.JS (Cancel & Save)
   * ========================================
   */

  function registerEditorHooks() {
    window.InlineEditor.onCancel(() => {
      touchedImages.forEach((imgEl) => {
        if (originalSrc.has(imgEl)) {
          imgEl.src = originalSrc.get(imgEl);
        }
      });
      touchedImages.clear();
    });

    window.InlineEditor.onSaveSuccess(() => {
      // Setelah tersimpan, src saat ini jadi baseline baru untuk Cancel
      // berikutnya (bukan lagi nilai sebelum sesi edit ini dimulai).
      touchedImages.forEach((imgEl) => {
        originalSrc.set(imgEl, imgEl.getAttribute("src") || imgEl.src);
      });
      touchedImages.clear();
    });
  }

  /**
   * ========================================
   * BOOT
   * ========================================
   */

  function boot() {
    if (!ensureInlineEditor()) return;

    primeExistingImages();
    observeNewImages();
    registerEditorHooks();
    bindGlobalEvents();
  }

  boot();

  /**
   * ========================================
   * PUBLIC API
   * ========================================
   */

  window.InlineEditorImage = {
    configure(options) {
      Object.assign(config, options);
    },
  };
})();