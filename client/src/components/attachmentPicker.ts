let pickerCounter = 0;

export function renderAttachmentPicker(pickerId?: string): string {
  const id = pickerId || `attachment-picker-${++pickerCounter}`;
  return `
    <div class="attachment-picker mb-2" id="${id}">
      <label class="btn btn-sm btn-outline-secondary">
        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple class="d-none attachment-input" data-picker="${id}">
        Attach images
      </label>
      <small class="text-muted ms-2">Max 4 images, 5 MB each</small>
      <div class="attachment-previews d-flex flex-wrap gap-2 mt-2"></div>
    </div>
  `;
}

export function initAttachmentPicker(pickerId: string): { getFiles: () => File[] } {
  const container = document.getElementById(pickerId);
  if (!container) return { getFiles: () => [] };

  const input = container.querySelector('.attachment-input') as HTMLInputElement;
  const previewsEl = container.querySelector('.attachment-previews') as HTMLElement;
  let files: File[] = [];

  input.addEventListener('change', () => {
    const newFiles = Array.from(input.files || []);
    for (const f of newFiles) {
      if (files.length >= 4) break;
      if (f.size > 5 * 1024 * 1024) {
        alert(`${f.name} is too large (max 5 MB).`);
        continue;
      }
      files.push(f);
    }
    input.value = '';
    renderPreviews();
  });

  function renderPreviews() {
    previewsEl.innerHTML = files.map((f, i) => {
      const url = URL.createObjectURL(f);
      return `
        <div class="position-relative" style="width:80px;height:80px">
          <img src="${url}" class="rounded border" style="width:80px;height:80px;object-fit:cover" alt="">
          <button type="button" class="btn-close position-absolute top-0 end-0 bg-white rounded-circle p-1" data-remove-idx="${i}" style="font-size:0.6rem"></button>
        </div>
      `;
    }).join('');

    previewsEl.querySelectorAll('[data-remove-idx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt((btn as HTMLElement).dataset.removeIdx!);
        files.splice(idx, 1);
        renderPreviews();
      });
    });
  }

  return { getFiles: () => files };
}
