/**
 * ========================================================
 * INLINE EDITOR — ENTERPRISE EDITION
 * ========================================================
 *
 * Fitur:
 * - Edit teks inline (data-editor="text"), sama seperti sebelumnya.
 * - Edit koleksi/array berulang (data-editor-collection), contoh: "sessions".
 *   Bisa tambah item baru & hapus item lama, lengkap dengan template clone.
 * - Event delegation → otomatis bekerja untuk element yang ditambahkan
 *   secara dinamis (misal item baru hasil clone template), tidak perlu
 *   binding ulang.
 * - Batch editing: user boleh edit beberapa field sekaligus sebelum Save.
 * - Cancel benar-benar mengembalikan isi asli (sebelumnya ini BUG:
 *   contentEditable sudah mengubah DOM tapi cancel tidak mengembalikannya).
 * - Konfirmasi sebelum cancel/leave halaman jika ada perubahan (dirty state).
 * - Paste dipaksa plain text (mencegah HTML kotor masuk ke field text).
 * - Validasi panjang maksimal via data-editor-maxlength.
 * - Keyboard shortcut: Esc = cancel, Ctrl/Cmd+Enter = save.
 * - Loading state pada tombol Save + toast bertumpuk (stack), termasuk
 *   status error (sebelumnya class error sudah ada di CSS tapi tidak
 *   pernah dipakai).
 * - onSave bisa dikustomisasi (default: console.log), siap dipasang ke API.
 * - API publik window.InlineEditor untuk integrasi lanjutan.
 *
 * ========================================================
 */

(function () {
  "use strict";

  /**
   * ========================================
   * KONFIGURASI
   * ========================================
   */
  const config = {
    // Selector field teks yang bisa diedit
    textSelector: '[data-editor="text"]',

    // Selector container koleksi (array)
    collectionSelector: "[data-editor-collection]",

    // Selector item di dalam koleksi
    itemSelector: "[data-editor-item]",

    // Durasi toast (ms)
    toastDuration: 2500,

    // Label default tombol "+ Tambah" kalau collection tidak set
    // data-editor-add-label sendiri.
    defaultAddLabel: "+ Tambah item",

    // Endpoint API backend (lihat api/internal/server/websites.go).
    apiUrl: "http://localhost:8080/api/websites/save",

    // ID website diambil dari query string ?website_id=... (fallback: page_id).
    pageId:
      new URLSearchParams(window.location.search).get("website_id") ||
      new URLSearchParams(window.location.search).get("page_id"),

    // Callback saat Save ditekan. Default: kirim payload ke apiUrl lewat fetch.
    // Bisa diganti lewat InlineEditor.configure({ onSave: async (payload) => {...} })
    onSave: async (payload) => {
      if (!config.pageId) {
        console.error("InlineEditor: website_id tidak ditemukan di query string.");
        return { ok: false, message: "website_id belum di-set di halaman ini" };
      }

      let response;
      try {
        response = await fetch(config.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ website_id: config.pageId, ...payload }),
        });
      } catch (error) {
        return { ok: false, message: "Tidak bisa menghubungi server: " + error.message };
      }

      let result;
      try {
        result = await response.json();
      } catch (error) {
        result = null;
      }

      if (!response.ok || !result || result.ok === false) {
        return {
          ok: false,
          message: (result && result.message) || "Gagal menyimpan perubahan",
        };
      }

      return { ok: true };
    },
  };

  /**
   * ========================================
   * STATE
   * ========================================
   */

  // Element yang sedang aktif diedit (fokus terakhir)
  let activeEditor = null;

  // Semua element teks yang pernah disentuh dalam sesi edit ini
  const touchedElements = new Set();

  // Nilai asli tiap element (untuk revert saat cancel)
  const originalValues = new WeakMap();

  // Perubahan field teks biasa: fieldKey -> value
  let textChanges = {};

  // Item koleksi baru yang ditambahkan user (belum disimpan)
  // collectionKey -> Set(itemElement)
  const newItems = new Map();

  // Item koleksi lama yang ditandai hapus (id -> { element, collectionKey })
  const deletedItems = new Map();

  let isSaving = false;

  /**
   * ========================================
   * UTIL
   * ========================================
   */

  function isDirty() {
    return (
      Object.keys(textChanges).length > 0 ||
      [...newItems.values()].some((set) => set.size > 0) ||
      deletedItems.size > 0
    );
  }

  function generateTempId() {
    return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Cari "field key" unik untuk sebuah element teks.
   * - Field biasa (di luar koleksi)   -> nilai data-name
   * - Field di dalam item koleksi     -> "<collection>[<itemId>].<name>"
   */
  function buildFieldKey(element) {
    const name = element.dataset.name;
    const item = element.closest(config.itemSelector);

    if (!item) {
      return name;
    }

    const collection = item.closest(config.collectionSelector);
    const collectionKey = collection
      ? collection.dataset.editorCollection
      : "unknown";
    const itemId = item.dataset.itemId || "unknown";

    return `${collectionKey}[${itemId}].${name}`;
  }

  /**
   * ========================================
   * NOTIFICATION (stackable toast)
   * ========================================
   */

  function getToastContainer() {
    let container = document.querySelector(".editor-toast-container");

    if (!container) {
      container = document.createElement("div");
      container.className = "editor-toast-container";
      document.body.appendChild(container);
    }

    return container;
  }

  /**
   * Menampilkan notification sementara (mendukung banyak notif sekaligus)
   *
   * @param {string} message
   * @param {"success"|"error"|"info"} type
   */
  function showNotification(message, type = "info") {
    const container = getToastContainer();

    const notification = document.createElement("div");
    notification.className = `editor-notification editor-notification-${type}`;
    notification.setAttribute("role", type === "error" ? "alert" : "status");
    notification.textContent = message;

    container.appendChild(notification);

    requestAnimationFrame(() => {
      notification.classList.add("show");
    });

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.remove(), 200);
    }, config.toastDuration);
  }

  /**
   * ========================================
   * TOOLBAR
   * ========================================
   */

  let toolbarEl = null;
  let saveButtonEl = null;
  let cancelButtonEl = null;
  let counterEl = null;

  function createEditorToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "editor-toolbar";

    toolbar.innerHTML = `
      <span class="editor-toolbar-count" data-editor-count></span>
      <button type="button" data-editor-action="cancel">Cancel</button>
      <button type="button" data-editor-action="save">
        <span data-editor-save-label>Save</span>
      </button>
    `;

    document.body.appendChild(toolbar);

    saveButtonEl = toolbar.querySelector('[data-editor-action="save"]');
    cancelButtonEl = toolbar.querySelector('[data-editor-action="cancel"]');
    counterEl = toolbar.querySelector("[data-editor-count]");

    saveButtonEl.addEventListener("click", saveEditor);
    cancelButtonEl.addEventListener("click", () => cancelEditor());

    return toolbar;
  }

  function updateToolbarCount() {
    if (!counterEl) return;

    const total =
      Object.keys(textChanges).length +
      [...newItems.values()].reduce((sum, set) => sum + set.size, 0) +
      deletedItems.size;

    counterEl.textContent = total > 0 ? `${total} perubahan` : "";
  }

  function showToolbar() {
    toolbarEl.classList.add("show");
    updateToolbarCount();
  }

  function hideToolbar() {
    toolbarEl.classList.remove("show");
  }

  function setSaveLoading(loading) {
    isSaving = loading;
    saveButtonEl.disabled = loading;
    cancelButtonEl.disabled = loading;
    saveButtonEl.classList.toggle("is-loading", loading);
    saveButtonEl.querySelector("[data-editor-save-label]").textContent =
      loading ? "Menyimpan..." : "Save";
  }

  toolbarEl = createEditorToolbar();

  /**
   * ========================================
   * FIELD TEKS: START / TRACK / FINALIZE
   * ========================================
   */

  function startEditor(element) {
    // Kalau ada editor aktif lain, selesaikan dulu (bukan dibuang,
    // karena mode ini mendukung edit banyak field sekaligus).
    if (activeEditor && activeEditor !== element) {
      finalizeElement(activeEditor);
    }

    activeEditor = element;

    if (!originalValues.has(element)) {
      originalValues.set(element, element.textContent);
    }

    element.contentEditable = "true";
    element.classList.add("editor-editing");
    touchedElements.add(element);

    element.focus();

    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    showToolbar();
  }

  function finalizeElement(element) {
    element.contentEditable = "false";
    element.classList.remove("editor-editing");

    if (activeEditor === element) {
      activeEditor = null;
    }
  }

  function trackEditorChange(element) {
    const key = buildFieldKey(element);
    if (!key) return;

    let content = element.textContent;

    const maxLength = parseInt(element.dataset.editorMaxlength, 10);
    if (Number.isFinite(maxLength) && content.length > maxLength) {
      content = content.slice(0, maxLength);
      element.textContent = content;
      showNotification(`Maksimal ${maxLength} karakter`, "error");
      // Pindahkan cursor ke akhir setelah truncate
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    textChanges[key] = content;
    updateToolbarCount();
  }

  /**
   * Paksa paste sebagai plain text, supaya HTML dari clipboard
   * (misal copy dari Word/Google Docs) tidak ikut masuk.
   */
  function handlePaste(event) {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData(
      "text/plain"
    );
    document.execCommand("insertText", false, text);
  }

  /**
   * ========================================
   * KOLEKSI / ARRAY (mis. fitur "session")
   * ========================================
   *
   * Supaya template HTML tetap bersih, tombol "+ Tambah" dan tombol hapus
   * per-item TIDAK perlu ditulis manual — keduanya di-inject otomatis oleh
   * script ini. Yang wajib ditulis di HTML hanyalah:
   *   - container dengan data-editor-collection="name"
   *   - tiap item dengan data-editor-item (+ data-item-id untuk item lama)
   *   - field di dalam item dengan data-editor="text" data-name="..."
   *
   * <template> juga opsional: kalau tidak disediakan lewat
   * data-editor-template, item baru akan diturunkan otomatis dengan
   * meng-clone item pertama yang sudah ada lalu mengosongkan isinya.
   */

  /**
   * Pastikan container koleksi punya tombol "+ Tambah". Kalau belum ada,
   * buat otomatis. Label bisa dikustomisasi lewat data-editor-add-label.
   */
  function ensureAddButton(collectionEl) {
    if (collectionEl.querySelector('[data-editor-action="add-item"]')) {
      return;
    }

    const label =
      collectionEl.dataset.editorAddLabel || config.defaultAddLabel;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "editor-add-item";
    button.dataset.editorAction = "add-item";
    button.textContent = label;

    // <button> tidak valid sebagai anak langsung <ul>/<ol>, bungkus <li>.
    const tag = collectionEl.tagName;
    if (tag === "UL" || tag === "OL") {
      const li = document.createElement("li");
      li.className = "editor-add-item-row";
      li.appendChild(button);
      collectionEl.appendChild(li);
    } else {
      collectionEl.appendChild(button);
    }
  }

  /**
   * Pastikan sebuah item koleksi punya tombol hapus. Kalau belum ada,
   * buat otomatis (span pembungkus dipakai karena valid di elemen apa pun,
   * termasuk <li>).
   */
  function ensureItemControls(itemEl) {
    if (itemEl.querySelector('[data-editor-action="delete-item"]')) {
      return;
    }

    const wrapper = document.createElement("span");
    wrapper.className = "editor-item-controls";

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.editorAction = "delete-item";
    button.setAttribute("aria-label", "Hapus item");
    button.textContent = "\u00d7"; //"×";

    wrapper.appendChild(button);
    itemEl.appendChild(wrapper);
  }

  /**
   * Sinkronkan seluruh koleksi yang ada di halaman: tambah tombol "+ Tambah"
   * dan tombol hapus yang belum ada. Dipanggil sekali saat init.
   */
  function primeExistingCollections() {
    document.querySelectorAll(config.collectionSelector).forEach((collectionEl) => {
      collectionEl.querySelectorAll(config.itemSelector).forEach(ensureItemControls);
      ensureAddButton(collectionEl);
    });
  }

  /**
   * Ambil <template> item untuk koleksi ini. Kalau data-editor-template
   * tidak diisi, turunkan otomatis dari item pertama yang sudah ada
   * (isinya dikosongkan supaya siap diisi user).
   */
  function resolveItemBlueprint(collectionEl) {
    const templateSelector = collectionEl.dataset.editorTemplate;
    const explicitTemplate = templateSelector
      ? document.querySelector(templateSelector)
      : collectionEl.querySelector("template");

    if (explicitTemplate) {
      const fragment = explicitTemplate.content.cloneNode(true);
      return fragment.querySelector(config.itemSelector) || fragment.firstElementChild;
    }

    // Fallback: turunkan dari item pertama yang sudah ada di DOM.
    const existingItem = collectionEl.querySelector(
      `${config.itemSelector}:not([data-editor-item-status="new"])`
    ) || collectionEl.querySelector(config.itemSelector);

    if (!existingItem) {
      return null;
    }

    const clone = existingItem.cloneNode(true);

    // Kosongkan semua field teks di dalam clone supaya siap diisi user.
    clone.querySelectorAll(config.textSelector).forEach((field) => {
      console.log(field);
      // ubah content jadi data-name
      field.textContent = field.dataset.name || "";
    });

    clone.classList.remove("editor-item-pending-delete");
    delete clone.dataset.itemId;
    delete clone.dataset.editorItemStatus;

    return clone;
  }

  function addCollectionItem(collectionEl) {
    const itemEl = resolveItemBlueprint(collectionEl);

    if (!itemEl) {
      console.warn(
        "InlineEditor: tidak bisa membuat item baru — sediakan minimal satu item contoh atau data-editor-template.",
        collectionEl
      );
      return;
    }

    const tempId = generateTempId();
    itemEl.dataset.itemId = tempId;
    itemEl.dataset.editorItemStatus = "new";
    itemEl.classList.add("editor-item");
    ensureItemControls(itemEl);

    // Tombol "add item" boleh jadi anak langsung container (mis. <div>),
    // atau dibungkus element lain (mis. <li> di dalam <ul>, karena <button>
    // langsung sebagai anak <ul> tidak valid HTML). Cari anchor yang benar-
    // benar anak langsung dari collectionEl supaya insertBefore tidak salah.
    const addButton = collectionEl.querySelector('[data-editor-action="add-item"]');
    let anchor = addButton;
    while (anchor && anchor.parentElement !== collectionEl) {
      anchor = anchor.parentElement;
    }

    if (anchor) {
      collectionEl.insertBefore(itemEl, anchor);
    } else {
      collectionEl.appendChild(itemEl);
    }

    const collectionKey = collectionEl.dataset.editorCollection;
    if (!newItems.has(collectionKey)) {
      newItems.set(collectionKey, new Set());
    }
    newItems.get(collectionKey).add(itemEl);

    updateToolbarCount();
    showToolbar();

    // Fokuskan field pertama yang bisa diedit pada item baru
    const firstField = itemEl.querySelector(config.textSelector);
    if (firstField) {
      startEditor(firstField);
    }
  }

  function removeCollectionItem(itemEl) {
    const collectionEl = itemEl.closest(config.collectionSelector);
    const collectionKey = collectionEl
      ? collectionEl.dataset.editorCollection
      : "unknown";
    const itemId = itemEl.dataset.itemId;
    const status = itemEl.dataset.editorItemStatus;

    if (status === "new") {
      // Item baru yang belum pernah disimpan → hapus langsung, tidak
      // perlu ditandai apa-apa ke server.
      const set = newItems.get(collectionKey);
      if (set) set.delete(itemEl);

      // Buang juga perubahan field di dalam item ini
      itemEl.querySelectorAll(config.textSelector).forEach((el) => {
        delete textChanges[buildFieldKey(el)];
      });

      itemEl.remove();
    } else {
      // Item lama (sudah ada di server) → tandai untuk dihapus,
      // sembunyikan secara visual, jangan langsung dibuang dari DOM
      // supaya masih bisa di-cancel.
      itemEl.dataset.editorItemStatus = "deleted";
      itemEl.classList.add("editor-item-pending-delete");
      deletedItems.set(itemId, { element: itemEl, collectionKey });
    }

    updateToolbarCount();
    showToolbar();
  }

  function restoreCollectionItem(itemId) {
    const entry = deletedItems.get(itemId);
    if (!entry) return;

    entry.element.dataset.editorItemStatus = "";
    entry.element.classList.remove("editor-item-pending-delete");
    deletedItems.delete(itemId);
  }

  /**
   * ========================================
   * SAVE
   * ========================================
   */

  function buildPayload() {
    // Kelompokkan textChanges biasa (di luar koleksi) vs field di dalam koleksi
    const fields = {};
    const collectionsMap = {};

    Object.entries(textChanges).forEach(([key, value]) => {
      const match = key.match(/^(.+)\[(.+)\]\.(.+)$/);

      if (!match) {
        fields[key] = value;
        return;
      }

      const [, collectionKey, itemId, name] = match;

      if (!collectionsMap[collectionKey]) {
        collectionsMap[collectionKey] = {};
      }
      if (!collectionsMap[collectionKey][itemId]) {
        collectionsMap[collectionKey][itemId] = { id: itemId };
      }
      collectionsMap[collectionKey][itemId][name] = value;
    });

    const collections = {};
    Object.entries(collectionsMap).forEach(([key, itemsById]) => {
      collections[key] = Object.values(itemsById);
    });

    const deleted = {};
    deletedItems.forEach((entry, itemId) => {
      if (!deleted[entry.collectionKey]) deleted[entry.collectionKey] = [];
      deleted[entry.collectionKey].push(itemId);
    });

    return { fields, collections, deletedItems: deleted };
  }

  async function saveEditor() {
    if (isSaving) return;

    if (activeEditor) {
      trackEditorChange(activeEditor);
    }

    if (!isDirty()) {
      showNotification("Tidak ada perubahan", "info");
      return;
    }

    const payload = buildPayload();
    setSaveLoading(true);

    try {
      const result = await config.onSave(payload);

      if (result && result.ok === false) {
        throw new Error(result.message || "Gagal menyimpan perubahan");
      }

      // Selesai: matikan semua editing, hapus item yang ditandai delete,
      // bersihkan status "new" jadi permanen, reset state.
      touchedElements.forEach((el) => finalizeElement(el));
      touchedElements.clear();

      deletedItems.forEach((entry) => entry.element.remove());
      deletedItems.clear();

      newItems.forEach((set) => {
        set.forEach((itemEl) => {
          itemEl.dataset.editorItemStatus = "";
        });
        set.clear();
      });

      textChanges = {};
      activeEditor = null;

      hideToolbar();
      showNotification("Perubahan berhasil disimpan", "success");
    } catch (error) {
      console.error("InlineEditor save error:", error);
      showNotification(
        error.message || "Terjadi kesalahan saat menyimpan",
        "error"
      );
    } finally {
      setSaveLoading(false);
    }
  }

  /**
   * ========================================
   * CANCEL
   * ========================================
   */

  function cancelEditor() {
    if (!isDirty() && !activeEditor) {
      return;
    }

    if (isDirty()) {
      const confirmed = window.confirm(
        "Ada perubahan yang belum disimpan. Yakin ingin membatalkan?"
      );
      if (!confirmed) return;
    }

    // Kembalikan semua element teks yang sempat disentuh ke nilai asli
    touchedElements.forEach((el) => {
      if (originalValues.has(el)) {
        el.textContent = originalValues.get(el);
      }
      finalizeElement(el);
    });
    touchedElements.clear();

    // Buang item koleksi baru yang belum disimpan
    newItems.forEach((set) => {
      set.forEach((itemEl) => itemEl.remove());
      set.clear();
    });

    // Kembalikan item lama yang tadi ditandai untuk dihapus
    [...deletedItems.keys()].forEach(restoreCollectionItem);

    textChanges = {};
    activeEditor = null;

    hideToolbar();
    showNotification("Perubahan dibatalkan", "info");
  }

  /**
   * ========================================
   * KEYBOARD SHORTCUT
   * ========================================
   */

  function handleKeydown(event) {
    if (!toolbarEl.classList.contains("show")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditor();
    } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      saveEditor();
    }
  }

  /**
   * ========================================
   * PERINGATAN SEBELUM MENINGGALKAN HALAMAN
   * ========================================
   */

  function handleBeforeUnload(event) {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = "";
  }

  /**
   * ========================================
   * EVENT DELEGATION (bekerja untuk element dinamis)
   * ========================================
   */

  function init() {
    document.addEventListener("pointerdown", (event) => {
      if (event.target.closest(config.textSelector)) {
        event.preventDefault();
        event.stopPropagation();
      }
    });

    document.addEventListener("click", (event) => {
      const textField = event.target.closest(config.textSelector);
      if (textField) {
        event.preventDefault();
        event.stopPropagation();
        startEditor(textField);
        return;
      }

      const addButton = event.target.closest('[data-editor-action="add-item"]');
      if (addButton) {
        event.preventDefault();
        const collectionEl = addButton.closest(config.collectionSelector);
        if (collectionEl) addCollectionItem(collectionEl);
        return;
      }

      const deleteButton = event.target.closest(
        '[data-editor-action="delete-item"]'
      );
      if (deleteButton) {
        event.preventDefault();
        const itemEl = deleteButton.closest(config.itemSelector);
        if (itemEl) removeCollectionItem(itemEl);
      }
    });

    document.addEventListener("input", (event) => {
      const textField = event.target.closest(config.textSelector);
      if (textField) trackEditorChange(textField);
    });

    document.addEventListener("paste", (event) => {
      const textField = event.target.closest(config.textSelector);
      if (textField) handlePaste(event);
    });

    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    primeExistingCollections();
  }

  init();

  /**
   * ========================================
   * PUBLIC API
   * ========================================
   */

  window.InlineEditor = {
    configure(options) {
      Object.assign(config, options);
    },
    isDirty,
    getChanges: buildPayload,
    save: saveEditor,
    cancel: cancelEditor,
  };
})();