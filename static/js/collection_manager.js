document.addEventListener('DOMContentLoaded', function() {
    // Element references
    const newCollectionBtn = document.getElementById('new-collection-btn');
    const newCollectionModal = document.getElementById('new-collection-modal');
    const closeBtns = document.querySelectorAll('.close-btn');
    const newCollectionForm = document.getElementById('new-collection-form');
    const errorMessageElement = document.getElementById('error-message');
    const collectionsList = document.getElementById('collections-list');
    const managementDetails = document.getElementById('management-details');
    const uploadBtn = document.getElementById('upload-btn');
    const openChunksBtn = document.getElementById('open-chunks-btn');
    const uploadModal = document.getElementById('upload-modal');
    const uploadForm = document.getElementById('upload-form');
    const uploadErrorMessageElement = document.getElementById('upload-error-message');
    const deleteBtn = document.getElementById('delete-btn');
    const deleteCollectionBtn = document.getElementById('delete-collection-btn');
    const splitMethodSelect = document.getElementById('split-method');
    const splitOptions = document.querySelectorAll('.split-options');
    const splitterSelect = document.getElementById('splitter');
    const chunksModal = document.getElementById('chunks-modal');
    const chunksList = document.getElementById('chunks-list');
    let currentCollectionId = null; // Store the current collection ID for upload

    // Function to toggle management buttons
    function toggleManagementButtons(enable) {
        uploadBtn.dataset.enabled = enable;
        openChunksBtn.dataset.enabled = enable;
        deleteBtn.dataset.enabled = enable;
        deleteCollectionBtn.dataset.enabled = enable;
    }

    toggleManagementButtons(false); // Disable buttons initially

    // Open new collection modal
    if (newCollectionBtn) {
        newCollectionBtn.addEventListener('click', () => {
            newCollectionModal.style.display = 'flex'; // Ensure it's set to flex to show it properly
        });
    }

    // Close modal functionality
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
            errorMessageElement.style.display = 'none'; // Hide error message
            uploadErrorMessageElement.style.display = 'none'; // Hide upload error message
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            errorMessageElement.style.display = 'none'; // Hide error message
            uploadErrorMessageElement.style.display = 'none'; // Hide upload error message
        }
    });

    // Submit new collection form
    if (newCollectionForm) {
        newCollectionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(newCollectionForm);
            const data = {
                name: formData.get('name'),
                description: formData.get('description'),
                model_id: formData.get('model_id')
            };

            try {
                const response = await fetch('/collections', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    newCollectionModal.style.display = 'none';
                    errorMessageElement.style.display = 'none'; // Hide error message
                    loadCollections();
                } else {
                    const errorText = await response.text();
                    errorMessageElement.textContent = `Error creating collection: ${errorText}`;
                    errorMessageElement.style.display = 'block';
                }
            } catch (error) {
                errorMessageElement.textContent = `Error creating collection: ${error.message}`;
                errorMessageElement.style.display = 'block';
            }
        });
    }

    // Toggle split options based on split method
    splitMethodSelect.addEventListener('change', () => {
        const isMarkupText = splitMethodSelect.value === 'markup_text';
        splitOptions.forEach(option => {
            option.style.display = isMarkupText ? 'none' : 'flex';
        });

        // Update splitter options
        const plainTextOptions = [
            'TOKEN_TEXT',
            'CHARACTER_TEXT',
            'RECURSIVE_CHARACTER_TEXT',
            'MARKDOWN_TEXT',
            'NO_SPLIT'
        ];

        const markupTextOptions = [
            'MARKDOWN_HEADER_TEXT',
            'HTML_HEADER_TEXT',
            'HTML_SECTION'
        ];

        splitterSelect.innerHTML = '';
        const options = isMarkupText ? markupTextOptions : plainTextOptions;
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            splitterSelect.appendChild(opt);
        });
    });

    // Load collections
    async function loadCollections() {
        try {
            const response = await fetch('/collections');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const collections = await response.json();
            collectionsList.innerHTML = '';
            if (Array.isArray(collections.data) && collections.data.length > 0) {
                collections.data.forEach(collection => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <h4>${collection.name}</h4>
                        <p>${collection.description}</p>
                        <p>Model: ${collection.model.id}</p>
                        <p>ID: ${collection.id}</p>
                    `;
                    card.addEventListener('click', () => {
                        currentCollectionId = collection.id; // Store the current collection ID
                        loadCollectionDetails(collection.id);
                        toggleManagementButtons(true); // Enable buttons
                    });
                    collectionsList.appendChild(card);
                });
            } else {
                const dummyCard = document.createElement('div');
                dummyCard.className = 'card';
                dummyCard.innerHTML = `
                    <h4>No Collections Available</h4>
                    <p>There are currently no collections. Please create a new collection.</p>
                `;
                collectionsList.appendChild(dummyCard);
                toggleManagementButtons(false); // Disable buttons if no collections
            }
        } catch (error) {
            console.error('Error loading collections:', error);
        }
    }

    // Load collection details
    async function loadCollectionDetails(collectionId) {
        try {
            const response = await fetch(`/collections/${collectionId}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const collectionDetails = await response.json();
            
            const filesResponse = await fetch(`/collections/${collectionId}/documents`);
            if (!filesResponse.ok) {
                managementDetails.innerHTML = `
                    <hr>
                    <h4>Collection: ${collectionDetails.name}</h4>
                    <p>Error: This collection is deleted.</p>
                    <p>Under construction: Deteled collection will be cleared soon.</p>
                    <hr>
                `;
                throw new Error('Network response was not ok');
            }
            const filesData = await filesResponse.json();
            const files = filesData.data || [];

            managementDetails.innerHTML = `
                <hr>
                <h4>Collection: ${collectionDetails.name}</h4>
                <p>Description: ${collectionDetails.description}</p>
                <p>Model: ${collectionDetails.model.id}</p>
                <p>ID: ${collectionDetails.id}</p>
                <hr>
                <div>
                    <h4>Files</h4>
                    <ul class="file-list">
                         ${files.length > 0 ? files.map(file => `
                            <li class="file-item">
                                <input type="checkbox" class="file-checkbox" data-file-id="${file.id}" data-file-name="${file.origin_metadata.storage_file.metadata.filename}">
                                <span class="file-name">${file.origin_metadata.storage_file.metadata.filename}</span>
                                <span class="file-status" id="file-status-${file.id}">${file.status}</span>
                            </li>`).join('') : '<li>No files available.</li>'}
                    </ul>
                </div>                
                <hr>
            `;

            files.forEach(file => {
                if (file.status !== 'PROCESSED') {
                    checkFileStatus(file.id);
                }
            });
        } catch (error) {
            console.error('Error loading collection details:', error);
        }
    }

    // Check file status periodically
    async function checkFileStatus(documentId) {
        try {
            const response = await fetch(`/document_status/${documentId}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const documentDetails = await response.json();
            const statusElement = document.getElementById(`file-status-${documentId}`);
            if (statusElement) {
                statusElement.textContent = documentDetails.status;
                statusElement.classList.remove('processing', 'processed', 'failed');
                if (documentDetails.status === 'PROCESSED') {
                    statusElement.classList.add('processed');
                } else if (documentDetails.status === 'FAILED') {
                    statusElement.classList.add('failed');
                } else {
                    statusElement.classList.add('processing');
                    setTimeout(() => checkFileStatus(documentId), 5000); // Check again after 5 seconds if not PROCESSED
                }
            }
        } catch (error) {
            console.error('Error checking file status:', error);
        }
    }

    // Open upload modal if a collection is selected
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (uploadBtn.dataset.enabled === "false") {
                alert('Please select a collection first.');
            } else {
                uploadModal.style.display = 'flex'; // Show the upload modal
            }
        });
    }

    // Handle upload form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(uploadForm);
            formData.append('collection_id', currentCollectionId); // Append the current collection ID

            const splitMethod = formData.get('split_method');
            const splitOptions = {
                split_method: splitMethod
            };
            if (splitMethod === 'plain_text') {
                splitOptions.chunk_size = parseInt(formData.get('chunk_size'), 10);
                splitOptions.chunk_overlap = parseInt(formData.get('chunk_overlap'), 10);
            }
            splitOptions.splitter = formData.get('splitter');
            formData.append('split_options', JSON.stringify(splitOptions));

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                if (response.ok) {
                    const result = await response.json();
                    uploadModal.style.display = 'none';
                    uploadErrorMessageElement.style.display = 'none'; // Hide error message
                    loadCollectionDetails(currentCollectionId); // Reload the collection details
                    const documentId = result.add_document_result.id;
                    checkFileStatus(documentId); // Start checking the status of the uploaded file
                } else {
                    const errorText = await response.text();
                    uploadErrorMessageElement.textContent = `Error uploading file: ${errorText}`;
                    uploadErrorMessageElement.style.display = 'block';
                }
            } catch (error) {
                uploadErrorMessageElement.textContent = `Error uploading file: ${error.message}`;
                uploadErrorMessageElement.style.display = 'block';
            }
        });
    }

    // Open chunks modal if a file is selected
    if (openChunksBtn) {
        openChunksBtn.addEventListener('click', async () => {
            if (openChunksBtn.dataset.enabled === "false") {
                alert('Please select a collection first.');
            } else {
                const selectedFiles = document.querySelectorAll('.file-checkbox:checked');
                const size = 100; // Set the size as needed
                if (selectedFiles.length === 1) {
                    const fileId = selectedFiles[0].getAttribute('data-file-id');
                    try {
                        const response = await fetch(`/chunks/${fileId}?size=${size}`);
                        if (!response.ok) {
                            throw new Error('Failed to fetch chunks');
                        }
                        const chunkData = await response.json();
                        chunksList.innerHTML = chunkData.data.map(chunk => `
                            <div class="card">
                                <p><strong>Chunk Index:</strong> ${chunk.chunk_index}</p>
                                <p>${chunk.chunk_content}</p>
                            </div>
                        `).join('');
                        chunksModal.style.display = 'flex'; // Show the chunks modal
                    } catch (error) {
                        console.error('Error fetching chunks:', error);
                    }
                } else {
                    alert('Please select one file to open chunks.');
                }
            }
        });
    }

    // Delete selected files
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (deleteBtn.dataset.enabled === "false") {
                alert('Please select a collection first.');
            } else {
                const selectedFiles = document.querySelectorAll('.file-checkbox:checked');
                const fileDeletionPromises = [];

                selectedFiles.forEach(fileCheckbox => {
                    const fileId = fileCheckbox.getAttribute('data-file-id');
                    const fileName = fileCheckbox.getAttribute('data-file-name');
                    fileDeletionPromises.push(deleteFile(fileId, fileName));
                });

                try {
                    await Promise.all(fileDeletionPromises);
                    loadCollectionDetails(currentCollectionId); // Reload the collection details
                } catch (error) {
                    console.error('Error deleting files:', error);
                }
            }
        });
    }

    // Delete a specific file
    async function deleteFile(fileId, fileName) {
        try {
            const response = await fetch('/delete_document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ document_id: fileId, file_name: fileName })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // If the response is empty, return an empty object
            return response.text().then(text => text ? JSON.parse(text) : {});
        } catch (error) {
            console.error(`Error deleting file ${fileName}:`, error);
        }
    }

    // Delete the selected collection
    if (deleteCollectionBtn) {
        deleteCollectionBtn.addEventListener('click', async () => {
            if (deleteCollectionBtn.dataset.enabled === "false") {
                alert('Please select a collection first.');
            } else {
                const confirmation = confirm('Are you sure you want to delete this collection and all its files?');
                if (!confirmation) return;

                try {
                    const filesResponse = await fetch(`/collections/${currentCollectionId}/documents`);
                    if (!filesResponse.ok) {
                        throw new Error('Network response was not ok');
                    }
                    const filesData = await filesResponse.json();
                    const files = filesData.data || [];

                    const fileDeletionPromises = files.map(file => deleteFile(file.id, file.origin_metadata.storage_file.metadata.filename));
                    await Promise.all(fileDeletionPromises);

                    const response = await fetch(`/collections/${currentCollectionId}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }

                    loadCollections(); // Reload the collections list
                    managementDetails.innerHTML = ''; // Clear the management details
                    currentCollectionId = null; // Reset the current collection ID
                    toggleManagementButtons(false); // Disable buttons
                } catch (error) {
                    console.error('Error deleting collection:', error);
                }
            }
        });
    }

    // Load the initial list of collections
    loadCollections();
});
