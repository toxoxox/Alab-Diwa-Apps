// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const pdfInput = document.getElementById('pdfInput');
const convertButton = document.getElementById('convertButton');
const resultsDiv = document.getElementById('results');
const qualitySelect = document.getElementById('imageQuality');
const previewSection = document.createElement('div');
previewSection.className = 'preview-section';
previewSection.setAttribute('aria-label', 'PDF page previews');

// Quality settings mapping
const qualitySettings = {
    high: 2.0,
    medium: 1.5,
    low: 1.0
};

// Event Listeners
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('drop', handleDrop);
pdfInput.addEventListener('change', handleFileSelect);
convertButton.addEventListener('click', handleConvert);

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.style.borderColor = 'var(--primary-color)';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.style.borderColor = 'var(--border-color)';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        pdfInput.files = e.dataTransfer.files;
        convertButton.disabled = false;
    } else {
        alert('Please upload a PDF file');
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        convertButton.disabled = false;
    } else {
        alert('Please upload a PDF file');
        convertButton.disabled = true;
    }
}

let convertedImages = []; // Store converted images data

async function handleConvert() {
    const file = pdfInput.files[0];
    if (!file) return;

    try {
        convertButton.disabled = true;
        convertButton.classList.add('converter__button--loading');
        resultsDiv.innerHTML = '';
        previewSection.innerHTML = '';
        convertedImages = []; // Reset converted images array

        // Create download all button
        const downloadAllButton = document.createElement('button');
        downloadAllButton.className = 'converter__button download-all-button';
        downloadAllButton.textContent = 'Download All Images';
        downloadAllButton.setAttribute('aria-label', 'Download all converted images');
        downloadAllButton.onclick = handleDownloadAll;
        downloadAllButton.style.display = 'none'; // Hide initially

        resultsDiv.appendChild(previewSection);
        resultsDiv.appendChild(downloadAllButton);

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const totalPages = pdf.numPages;

        const qualityScale = qualitySettings[qualitySelect.value];
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: qualityScale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
            convertedImages.push({
                url: imageUrl,
                pageNum: pageNum
            });

            // Create preview thumbnail
            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'preview-thumbnail';
            
            const thumbnail = document.createElement('img');
            thumbnail.src = imageUrl;
            thumbnail.className = 'preview-thumbnail__image';
            thumbnail.alt = `Preview of page ${pageNum}`;
            thumbnail.loading = 'lazy';

            const pageLabel = document.createElement('span');
            pageLabel.className = 'preview-thumbnail__label';
            pageLabel.textContent = `Page ${pageNum}`;

            thumbnailContainer.appendChild(thumbnail);
            thumbnailContainer.appendChild(pageLabel);
            previewSection.appendChild(thumbnailContainer);

            // Create full-size image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'converter__image-container';
            imageContainer.style.display = 'none'; // Hide initially

            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'converter__converted-image';
            img.alt = `Page ${pageNum} of PDF`;

            const downloadLink = document.createElement('a');
            downloadLink.href = imageUrl;
            downloadLink.download = `page-${pageNum}.jpg`;
            downloadLink.className = 'converter__button';
            downloadLink.textContent = `Download Page ${pageNum}`;
            downloadLink.setAttribute('role', 'button');
            downloadLink.setAttribute('tabindex', '0');

            imageContainer.appendChild(img);
            imageContainer.appendChild(downloadLink);
            resultsDiv.appendChild(imageContainer);

            // Add click event to thumbnail
            thumbnailContainer.onclick = () => {
                document.querySelectorAll('.converter__image-container').forEach(container => {
                    container.style.display = 'none';
                });
                imageContainer.style.display = 'flex';
            };
        }

        // Show download all button after conversion
        downloadAllButton.style.display = 'block';
    } catch (error) {
        console.error('Error converting PDF:', error);
        resultsDiv.innerHTML = `<p class="error">Error converting PDF: ${error.message}</p>`;
    } finally {
        convertButton.disabled = false;
        convertButton.classList.remove('converter__button--loading');
    }
}

async function handleDownloadAll() {
    // Create a zip file containing all images
    const zip = new JSZip();
    
    convertedImages.forEach(({url, pageNum}) => {
        // Convert base64 to blob
        const imageData = url.split(',')[1];
        zip.file(`page-${pageNum}.jpg`, imageData, {base64: true});
    });
    
    // Generate and download zip file
    const content = await zip.generateAsync({type: 'blob'});
    const zipUrl = URL.createObjectURL(content);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = zipUrl;
    downloadLink.download = 'converted-images.zip';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(zipUrl);
}

document.addEventListener('DOMContentLoaded', () => {
    const loaderWrapper = document.getElementById('loader-wrapper');
    const mainContent = document.querySelector('.main');

    // Hide loader and show content after 2 seconds
    setTimeout(() => {
        loaderWrapper.classList.add('hide');
        mainContent.classList.add('show');
        
        // Remove loader from DOM after animation
        setTimeout(() => {
            loaderWrapper.remove();
        }, 500);
    }, 2000);
});
