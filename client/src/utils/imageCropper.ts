import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.min.css';

export function cropImage(file: File, aspectRatio: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);

    // Build modal DOM
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';

    const modal = document.createElement('div');
    modal.className = 'modal fade show d-block';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Crop Cover Image</h5>
            <button type="button" class="btn-close" id="crop-cancel-x"></button>
          </div>
          <div class="modal-body">
            <div style="max-height:60vh;overflow:hidden">
              <img id="crop-image" style="max-width:100%;display:block">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="crop-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="crop-confirm">Crop &amp; Use</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const img = modal.querySelector('#crop-image') as HTMLImageElement;
    img.src = objectUrl;

    const cropper = new Cropper(img, {
      aspectRatio,
      viewMode: 1,
      autoCropArea: 1,
      responsive: true,
    });

    function cleanup() {
      cropper.destroy();
      URL.revokeObjectURL(objectUrl);
      modal.remove();
      backdrop.remove();
    }

    modal.querySelector('#crop-confirm')!.addEventListener('click', () => {
      const canvas = cropper.getCroppedCanvas();
      canvas.toBlob((blob) => {
        cleanup();
        resolve(blob);
      }, file.type || 'image/jpeg', 0.9);
    });

    const cancel = () => {
      cleanup();
      resolve(null);
    };

    modal.querySelector('#crop-cancel')!.addEventListener('click', cancel);
    modal.querySelector('#crop-cancel-x')!.addEventListener('click', cancel);
  });
}
