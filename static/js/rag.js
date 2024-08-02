document.addEventListener('DOMContentLoaded', function () {
    const collectionSelect = document.getElementById('collection-select');
    const resultsNumberInput = document.getElementById('results-number');
    const modelSelect = document.getElementById('model-select');
    const temperatureInput = document.getElementById('temperature');
    const queryInput = document.getElementById('query-input');
    const queryForm = document.getElementById('query-form');
    const searchResultsList = document.getElementById('search-results-list');
    const systemPromptText = document.getElementById('system-prompt-text');
    const ragResultsList = document.getElementById('rag-results-list');
    const searchButton = queryForm.querySelector('button[type="submit"]');
    let loadingInterval;

    // Function to start the loading animation
    function startLoadingAnimation(element, message) {
        let dotCount = 0;
        element.innerHTML = `<div class="loading-message">${message}</div>`;
        loadingInterval = setInterval(() => {
            dotCount = (dotCount % 3) + 1;
            element.innerHTML = `<div class="loading-message">${message}${'.'.repeat(dotCount)}</div>`;
        }, 500); // Speed up the dots
    }

    // Function to stop the loading animation
    function stopLoadingAnimation() {
        clearInterval(loadingInterval);
    }

    // Fetch document details by document ID
    async function fetchDocumentDetails(documentId) {
        try {
            const response = await fetch(`/document_status/${documentId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch document details');
            }
            const documentDetails = await response.json();
            return documentDetails.origin_metadata.storage_file.metadata.filename;
        } catch (error) {
            console.error('Error fetching document details:', error);
            return 'Unknown';
        }
    }

    // Handle form submission
    queryForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const collection = collectionSelect.value;
        const collectionName = collectionSelect.options[collectionSelect.selectedIndex].text;
        const numResults = parseInt(resultsNumberInput.value, 10);
        const model = modelSelect.value;
        const temperature = parseFloat(temperatureInput.value);
        const query = queryInput.value;
        const systemPrompt = systemPromptText.value;

        // Store values in session
        try {
            const sessionData = {
                collection_id: collection,
                collection_name: collectionName,
                num_results: numResults,
                model: model,
                temperature: temperature,
                query: query,
                system_prompt: systemPrompt
            };
            await fetch('/update_session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
        } catch (error) {
            console.error('Error updating session data:', error);
        }

        try {
            // Disable the search button and show loading message
            searchButton.disabled = true;
            startLoadingAnimation(ragResultsList, 'Fetching search results');

            const response = await fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ collectionId: collection, query: query, numResults: numResults })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch search results');
            }

            const searchResults = await response.json();
            searchResultsList.innerHTML = '';
            stopLoadingAnimation(); // Stop the loading animation once search results are fetched

            const searchResultsContent = [];
            for (const result of searchResults.data) {
                const documentName = await fetchDocumentDetails(result.document_id);
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <p><strong>Document Name:</strong> ${documentName}</p>
                    <p><strong>Document ID:</strong> ${result.document_id}</p>
                    <p><strong>Score:</strong> ${result.score}</p>
                    <p>${result.chunk_content}</p>
                `;
                searchResultsList.appendChild(card);
                searchResultsContent.push(result.chunk_content);
            }

            // Prepare data for answer generation
            const userQuery = queryInput.value;
            const data = {
                system_prompt: systemPrompt,
                search_results: searchResultsContent,
                user_query: userQuery,
                model: model,
                temperature: temperature
            };

            // Show loading message for generating answer
            startLoadingAnimation(ragResultsList, 'Generating answer');

            // Call the generate answer endpoint
            const generateResponse = await fetch('/generate_answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!generateResponse.ok) {
                const errorResponse = await generateResponse.json();
                throw new Error(errorResponse.error || 'Failed to generate answer');
            }

            const generationResult = await generateResponse.json();
            stopLoadingAnimation(); // Stop the loading animation once the answer is generated
            if (generationResult && generationResult.content) {
                ragResultsList.innerHTML = generationResult.content;
            } else {
                ragResultsList.innerHTML = '<p>No answer generated.</p>';
            }
        } catch (error) {
            console.error('Error during search:', error);
            ragResultsList.innerHTML = `
                <p>Error occurred during search.</p>
                <p>"${error}"</p>
            `;
            stopLoadingAnimation();
        } finally {
            // Re-enable the search button
            searchButton.disabled = false;
        }
    });
});
