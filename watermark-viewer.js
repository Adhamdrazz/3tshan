(() => {
    const WATERMARK_SRC = 'images/logo.svg.png';
    const WATERMARK_OPACITY = 0.25; // شفافية 75% = ظهور العلامة المائية بنسبة 25%

    function closeViewer() {
        const viewer = document.getElementById('watermark-image-viewer');
        if (viewer) viewer.remove();
        document.body.classList.remove('watermark-viewer-open');
    }

    function openViewer(imageUrl, title = 'صورة مصدر المياه') {
        if (!imageUrl) return;
        closeViewer();

        const viewer = document.createElement('div');
        viewer.id = 'watermark-image-viewer';
        viewer.className = 'watermark-image-viewer';
        viewer.setAttribute('role', 'dialog');
        viewer.setAttribute('aria-modal', 'true');
        viewer.setAttribute('aria-label', title);
        viewer.innerHTML = `
            <button type="button" class="watermark-viewer-close" aria-label="إغلاق الصورة">×</button>
            <div class="watermark-image-frame">
                <img class="watermark-source-image" src="${imageUrl}" alt="${title}">
                <img class="watermark-logo-image" src="${WATERMARK_SRC}" alt="" aria-hidden="true">
            </div>
        `;

        viewer.addEventListener('click', (event) => {
            if (event.target === viewer || event.target.closest('.watermark-viewer-close')) closeViewer();
        });

        viewer.querySelector('.watermark-source-image').addEventListener('error', () => {
            closeViewer();
            window.open(imageUrl, '_blank', 'noopener');
        });

        document.body.appendChild(viewer);
        document.body.classList.add('watermark-viewer-open');
    }

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-watermark-image]');
        if (!trigger) return;
        event.preventDefault();
        openViewer(trigger.dataset.watermarkImage, trigger.dataset.watermarkTitle || 'صورة مصدر المياه');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeViewer();
    });

    window.openWatermarkViewer = openViewer;
})();
