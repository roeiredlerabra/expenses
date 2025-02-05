// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let currentPdfDoc = null;
let currentPage = 1;

async function renderPDF(pdfUrl, container) {
    try {
        // Create PDF viewer container
        container.innerHTML = `
            <div class="pdf-viewer-container">
                <div class="pdf-viewer-toolbar">
                    <div class="pdf-viewer-controls">
                        <button class="pdf-viewer-button" id="prevPage">
                            <i class="fas fa-chevron-left"></i>
                            הקודם
                        </button>
                        <span class="pdf-page-display">
                            עמוד <span id="currentPage">1</span> מתוך <span id="totalPages">?</span>
                        </span>
                        <button class="pdf-viewer-button" id="nextPage">
                            הבא
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="pdf-viewer-controls">
                        <button class="pdf-viewer-button" id="zoomOut">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="pdf-viewer-button" id="zoomIn">
                            <i class="fas fa-search-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="pdf-canvas-container">
                    <canvas id="pdfCanvas"></canvas>
                </div>
            </div>
        `;

        // Load the PDF
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        currentPdfDoc = await loadingTask.promise;
        
        // Update total pages
        document.getElementById('totalPages').textContent = currentPdfDoc.numPages;
        
        // Initial render
        await renderPage(1);
        
        // Add event listeners
        document.getElementById('prevPage').addEventListener('click', previousPage);
        document.getElementById('nextPage').addEventListener('click', nextPage);
        document.getElementById('zoomIn').addEventListener('click', zoomIn);
        document.getElementById('zoomOut').addEventListener('click', zoomOut);
        
        // Enable touch swipe for mobile
        enableTouchNavigation(container.querySelector('.pdf-canvas-container'));
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                שגיאה בטעינת ה-PDF. אנא נסה שוב.
            </div>
        `;
    }
}

let currentScale = 1.0;

async function renderPage(pageNumber) {
    if (!currentPdfDoc) return;
    
    try {
        const page = await currentPdfDoc.getPage(pageNumber);
        const canvas = document.getElementById('pdfCanvas');
        const context = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: currentScale });
        
        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render the page
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Update current page display
        currentPage = pageNumber;
        document.getElementById('currentPage').textContent = pageNumber;
        
        // Update buttons state
        document.getElementById('prevPage').disabled = pageNumber <= 1;
        document.getElementById('nextPage').disabled = pageNumber >= currentPdfDoc.numPages;
        
    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

async function previousPage() {
    if (currentPage <= 1) return;
    await renderPage(currentPage - 1);
}

async function nextPage() {
    if (!currentPdfDoc || currentPage >= currentPdfDoc.numPages) return;
    await renderPage(currentPage + 1);
}

function zoomIn() {
    currentScale = Math.min(currentScale * 1.25, 3.0);
    renderPage(currentPage);
}

function zoomOut() {
    currentScale = Math.max(currentScale * 0.8, 0.5);
    renderPage(currentPage);
}

function enableTouchNavigation(element) {
    let touchStartX = 0;
    let touchEndX = 0;
    
    element.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, false);
    
    element.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
    }, false);
    
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        const minSwipeDistance = 50;
        
        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                previousPage();
            } else {
                nextPage();
            }
        }
    }
}