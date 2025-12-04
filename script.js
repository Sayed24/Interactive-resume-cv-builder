/* Interactive Resume Builder
   Features:
   - Add sections (title + HTML content)
   - Edit sections (modal)
   - Duplicate / Remove
   - Drag & drop reorder
   - Auto-save to localStorage (debounced)
   - Export / Import JSON
   - Theme switching
   - Print (window.print)
*/

(() => {
  // Constants
  const STORAGE_KEY = 'interactive_res_builder_v1';
  const saveDebounceMs = 600;

  // Elements
  const sectionsList = document.getElementById('sections-list');
  const previewRoot = document.getElementById('preview-root');
  const addSectionBtn = document.getElementById('add-section-btn');
  const addSampleBtn = document.getElementById('add-sample-data');
  const printBtn = document.getElementById('print-btn');
  const exportBtn = document.getElementById('export-json');
  const importBtn = document.getElementById('import-json-btn');
  const importInput = document.getElementById('import-json');
  const resetBtn = document.getElementById('reset-btn');
  const themeSelect = document.getElementById('theme-select');

  const modal = document.getElementById('modal');
  const modalTitleInput = document.getElementById('modal-title-input');
  const modalContentInput = document.getElementById('modal-content-input');
  const modalSave = document.getElementById('modal-save');
  const modalCancel = document.getElementById('modal-cancel');
  const modalClose = document.getElementById('modal-close');

  const sectionTemplate = document.getElementById('section-template');

  // State
  let state = {
    name: 'Your Name',
    contact: 'youremail@example.com • +1 (555) 555-5555 • City, Country',
    sections: []
  };

  // Debounced save
  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveToStorage();
    }, saveDebounceMs);
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // tiny visual hint
      document.title = '✔ Interactive Resume Builder';
      setTimeout(()=> document.title = 'Interactive Resume / CV Builder — Sayedrahim Sadat', 900);
    } catch (e) {
      console.error('Could not save:', e);
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.sections) {
        state = parsed;
        return true;
      }
    } catch(e){
      console.warn('Failed to load saved state', e);
    }
    return false;
  }

  // Render functions
  function renderSections() {
    sectionsList.innerHTML = '';
    state.sections.forEach((s, idx) => {
      const node = sectionTemplate.content.cloneNode(true);
      const item = node.querySelector('.section-item');
      const titleEl = node.querySelector('.section-title');
      const bodyEl = node.querySelector('.section-body');
      const editBtn = node.querySelector('.edit');
      const dupBtn = node.querySelector('.duplicate');
      const rmBtn = node.querySelector('.remove');
      const dragHandle = node.querySelector('.drag-handle');

      titleEl.innerHTML = `<span>${escapeHtml(s.title)}</span> <small style="color:var(--muted);font-size:12px">#${idx+1}</small>`;
      bodyEl.innerHTML = s.content ? s.content : '<em>No content yet</em>';

      // Edit
      editBtn.addEventListener('click', () => openEditModal(idx));

      // Duplicate
      dupBtn.addEventListener('click', () => {
        const clone = JSON.parse(JSON.stringify(s));
        state.sections.splice(idx+1,0,clone);
        renderSections();
        renderPreview();
        scheduleSave();
      });

      // Remove
      rmBtn.addEventListener('click', () => {
        if (!confirm('Remove this section?')) return;
        state.sections.splice(idx,1);
        renderSections();
        renderPreview();
        scheduleSave();
      });

      // Drag & Drop
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', idx);
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'),10);
        const to = idx;
        if (!isNaN(from) && from !== to) {
          const [moved] = state.sections.splice(from,1);
          state.sections.splice(to,0,moved);
          renderSections();
          renderPreview();
          scheduleSave();
        }
      });

      sectionsList.appendChild(node);
    });
  }

  function renderPreview() {
    previewRoot.innerHTML = '';
    const resume = document.createElement('div');
    resume.className = 'resume';
    // Header
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <div>
        <h2>${escapeHtml(state.name || 'Your Name')}</h2>
        <div class="meta">${escapeHtml(state.contact || '')}</div>
      </div>
    `;
    resume.appendChild(header);

    // Sections
    state.sections.forEach(s => {
      const sec = document.createElement('div');
      sec.className = 'section';
      const h = document.createElement('h3');
      h.innerText = s.title || 'Untitled';
      sec.appendChild(h);

      const content = document.createElement('div');
      // allow safe-ish HTML from user; we keep it simple and allow tags
      content.innerHTML = s.content || '<p></p>';
      sec.appendChild(content);

      resume.appendChild(sec);
    });

    previewRoot.appendChild(resume);
  }

  // Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return str.replaceAll?.('&','&amp;').replaceAll?.('<','&lt;').replaceAll?.('>','&gt;') || (''+str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Modal logic
  let editingIndex = null;
  function openEditModal(idx) {
    editingIndex = idx;
    const sec = state.sections[idx];
    modalTitleInput.value = sec.title || '';
    modalContentInput.value = sec.content || '';
    modal.classList.remove('hidden');
    modalTitleInput.focus();
  }
  function closeModal() {
    modal.classList.add('hidden');
    editingIndex = null;
  }

  modalSave.addEventListener('click', () => {
    if (editingIndex === null) return;
    state.sections[editingIndex].title = modalTitleInput.value.trim() || 'Untitled';
    state.sections[editingIndex].content = modalContentInput.value;
    renderSections();
    renderPreview();
    scheduleSave();
    closeModal();
  });
  modalCancel.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);

  // Buttons
  addSectionBtn.addEventListener('click', () => {
    const newSection = { title: 'New Section', content: '<p>Describe this section...</p>' };
    state.sections.push(newSection);
    renderSections();
    renderPreview();
    scheduleSave();
    // open modal on the newly added one
    setTimeout(()=> openEditModal(state.sections.length-1), 150);
  });

  addSampleBtn.addEventListener('click', () => {
    state = {
      name: 'Sayedrahim Sadat',
      contact: 'sayed@example.com • +1 (555) 555-5555 • Sacramento, CA',
      sections: [
        { title: 'Summary', content: '<p>Passionate web developer with experience in building responsive front-end projects, dynamic dashboards, and user-focused interfaces.</p>' },
        { title: 'Skills', content: '<ul class="list"><li>HTML5, CSS3, JavaScript</li><li>React, Vue basics</li><li>Responsive & accessible UI</li></ul>' },
        { title: 'Experience', content: '<p><strong>Freelance Web Developer</strong> — May 2021 — Present<br/>Built multiple client websites, optimized performance and SEO.</p>' },
        { title: 'Education', content: '<p><strong>B.Sc. Computer Science</strong>, Herat University (2016)</p>' }
      ]
    };
    renderSections();
    renderPreview();
    scheduleSave();
  });

  printBtn.addEventListener('click', () => {
    // Hide interactive UI via print CSS then print
    window.print();
  });

  exportBtn.addEventListener('click', () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.sections) throw new Error('Invalid file format');
        state = parsed;
        renderSections();
        renderPreview();
        scheduleSave();
        alert('Imported resume data successfully.');
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(f);
    importInput.value = '';
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('Clear all local changes and reset to blank?')) return;
    state = { name: 'Your Name', contact: '', sections: [] };
    renderSections();
    renderPreview();
    localStorage.removeItem(STORAGE_KEY);
  });

  // Theme switching
  function applyTheme(name) {
    document.documentElement.classList.remove('theme-dark','theme-blue','theme-green');
    if (name === 'dark') document.documentElement.classList.add('theme-dark');
    if (name === 'blue') document.documentElement.classList.add('theme-blue');
    if (name === 'green') document.documentElement.classList.add('theme-green');
  }
  themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
    // Save theme preference to localStorage separately
    try { localStorage.setItem(STORAGE_KEY + '_theme', e.target.value); } catch(e){}
  });

  // Editing header name & contact inline in preview (double-click)
  previewRoot.addEventListener('dblclick', (e) => {
    const header = previewRoot.querySelector('.header');
    if (!header) return;
    // allow editing name/contact via prompt (keeps UI simple)
    const newName = prompt('Edit name', state.name);
    if (newName !== null) state.name = newName.trim();
    const newContact = prompt('Edit contact info', state.contact);
    if (newContact !== null) state.contact = newContact.trim();
    renderPreview();
    scheduleSave();
  });

  // Keyboard shortcut: Ctrl+S to save (prevent browser save)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveToStorage();
      alert('Saved to localStorage.');
    }
  });

  // Load persisted theme
  (function loadTheme() {
    try {
      const t = localStorage.getItem(STORAGE_KEY + '_theme') || 'default';
      themeSelect.value = t;
      applyTheme(t);
    } catch (e) {}
  })();

  // Load on init
  (function init() {
    const loaded = loadFromStorage();
    if (!loaded) {
      // initial sample to help show UI
      state = {
        name: 'Your Name',
        contact: 'you@example.com • City, Country',
        sections: [
          { title: 'Summary', content: '<p>A short opener about yourself — one paragraph.</p>' },
          { title: 'Skills', content: '<ul class="list"><li>HTML, CSS, JavaScript</li><li>Responsive Design</li></ul>' }
        ]
      };
    }
    renderSections();
    renderPreview();
  })();

  // Accessibility: close modal with Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

})();
