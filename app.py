import os
import json
import markdown
import requests
from dotenv import load_dotenv
from flask_session import Session
from flask import Flask, render_template, session, request, jsonify

# Load environment variables from .env file
load_dotenv()

# Retrieve API_KEY, API_BASE, and EMBEDDING_MODELS from environment variables
API_KEY = os.getenv('API_KEY')
API_BASE = os.getenv('API_BASE')
EMBEDDING_MODELS = os.getenv('EMBEDDING_MODELS').split(',')

# Retrieve LLM_API_KEY, LLM_API_URL, and LLM_MODELS from environment variables
LLM_API_KEY = os.getenv('LLM_API_KEY')
LLM_API_URL = os.getenv('LLM_API_URL')
LLM_MODELS = os.getenv('LLM_MODELS').split(',')

# Initialize Flask application
app = Flask(__name__)

# Generate a secret key for session management
app.secret_key = os.urandom(24)

# Configure session to use filesystem (instead of signed cookies)
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# Route for the homepage which renders the collection manager template
@app.route('/')
def index():
    return render_template('collection_manager.html', embedding_models=EMBEDDING_MODELS)

# Route for the RAG page which renders the RAG template
@app.route('/rag')
def rag_page():
    # Fetch collections to include them in the initial rendering of the page
    collections = []
    try:
        headers = {
            "Authorization": f"Bearer {API_KEY}"
        }
        api_url = f'{API_BASE}/v1/rag/collections'
        resp = requests.get(api_url, headers=headers)
        resp.raise_for_status()
        collections_data = resp.json()
        collections = collections_data.get('data', [])
    except requests.RequestException as e:
        print(f"Error fetching collections: {e}")

    default_system_prompt = "You are an intelligent assistant. Your goal is to provide accurate and detailed responses based on the user's query and the given search results. Use the information from the search results to formulate a comprehensive answer. If the search results do not contain sufficient information, let the user know and suggest a general approach or resources for further information."

    return render_template('rag.html', 
                           models=LLM_MODELS, 
                           collections=collections, 
                           temperature=session.get('temperature', 0.7),
                           collection_id=session.get('collection_id', ''),
                           collection_name=session.get('collection_name', ''),
                           results_number=session.get('num_results', 10),
                           query=session.get('query', ''),
                           llm_model=session.get('model', ''),
                           system_prompt=session.get('system_prompt', default_system_prompt))

# Route for fetching collections and LLM models
@app.route('/collections', methods=['GET', 'POST'])
def collections():
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    # Handle POST request to create a new collection
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data or 'name' not in data or 'description' not in data or 'model_id' not in data:
                return jsonify({'error': 'Invalid data'}), 400

            api_url = f'{API_BASE}/v1/rag/collections'
            resp = requests.post(api_url, headers=headers, json=data)
            resp.raise_for_status()
            return jsonify(resp.json())
        except requests.RequestException as e:
            return jsonify({'error': str(e)}), 400

    # Handle GET request to fetch all collections
    try:
        api_url = f'{API_BASE}/v1/rag/collections'
        resp = requests.get(api_url, headers=headers)
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 400

# Route for fetching and deleting a specific collection by its ID
@app.route('/collections/<collection_id>', methods=['GET', 'DELETE'])
def collection_details(collection_id):
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    # Handle DELETE request to delete a collection
    if request.method == 'DELETE':
        try:
            api_url = f'{API_BASE}/v1/rag/collections/{collection_id}'
            resp = requests.delete(api_url, headers=headers)
            resp.raise_for_status()
            return '', 204
        except requests.RequestException as e:
            return jsonify({'error': str(e)}), 400

    # Handle GET request to fetch details of a specific collection
    try:
        api_url = f'{API_BASE}/v1/rag/collections/{collection_id}'
        resp = requests.get(api_url, headers=headers)
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 400

# Route for fetching documents within a specific collection
@app.route('/collections/<collection_id>/documents', methods=['GET'])
def collection_documents(collection_id):
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }
    
    # Handle GET request to fetch documents within a collection
    try:
        api_url = f'{API_BASE}/v1/rag/collections/{collection_id}/documents'
        resp = requests.get(api_url, headers=headers)
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 400

# Route for uploading a file to a specific collection
@app.route('/upload', methods=['POST'])
def upload_file():
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    collection_id = request.form['collection_id']
    file = request.files['file']
    filename = file.filename
    split_options = request.form.get('split_options')

    try:
        # Delete existing file with the same name (if any)
        api_url_delete = f'{API_BASE}/v1/storage-files'
        requests.delete(api_url_delete, headers=headers, params={"path": filename})
        
        # Upload the new file
        api_url_upload = f'{API_BASE}/v1/storage-files/upload'
        files = {
            "file_object": (filename, file.stream, 'application/octet-stream'),
            "purpose": "RAG",
        }
        resp = requests.post(api_url_upload, headers=headers, files=files)
        resp.raise_for_status()
        upload_result = resp.json()

        # Add the document to the collection with specified split options
        split_options = json.loads(split_options)
        split_method = split_options.pop('split_method')
        
        api_url_add_document = f'{API_BASE}/v1/rag/collections/{collection_id}/documents'
        document_data = {
            'source': {
                'storage_file': {
                    'path': filename,
                }
            },
            'split_options': {
                split_method: split_options
            }
        }
        resp = requests.post(api_url_add_document, headers=headers, json=document_data)
        resp.raise_for_status()
        add_document_result = resp.json()

        return jsonify({
            'upload_result': upload_result,
            'add_document_result': add_document_result
        })
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 400

# Route for checking the status of a specific document
@app.route('/document_status/<document_id>', methods=['GET'])
def document_status(document_id):
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    # Handle GET request to fetch the status of a document
    try:
        api_url = f'{API_BASE}/v1/rag/documents/{document_id}'
        resp = requests.get(api_url, headers=headers)
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 400

# Route for deleting a specific document
@app.route('/delete_document', methods=['POST'])
def delete_document():
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    data = request.json
    document_id = data['document_id']
    file_name = data['file_name']

    try:
        # Delete the document from RAG
        api_url = f'{API_BASE}/v1/rag/documents/{document_id}'
        resp = requests.delete(api_url, headers=headers)
        resp.raise_for_status()
        # Delete the file from storage
        api_url_delete_file = f'{API_BASE}/v1/storage-files'
        requests.delete(api_url_delete_file, headers=headers, params={"path": file_name})

        return '', 204
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 400

# Route for getting the list of chunk in a specific document
@app.route('/chunks/<document_id>', methods=['GET'])
def get_chunks(document_id):
    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }
    size = request.args.get('size', 10)

    try:
        api_url = f'{API_BASE}/v1/rag/documents/{document_id}/chunks?size={size}'
        resp = requests.get(api_url, headers=headers)
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 400

# Route to update session data
@app.route('/update_session', methods=['POST'])
def update_session():
    data = request.json

    session['collection_id'] = data.get('collection_id')
    session['collection_name'] = data.get('collection_name')
    session['num_results'] = data.get('num_results')
    session['model'] = data.get('model')
    session['temperature'] = data.get('temperature')
    session['query'] = data.get('query')
    session['system_prompt'] = data.get('system_prompt')

    return jsonify({"status": "success"})

# Route to handle search requests
@app.route('/search', methods=['POST'])
def search():
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = request.json
    collection_id = data['collectionId']
    query = data['query']
    num_results = int(data['numResults'])

    try:
        api_url = f'{API_BASE}/v1/rag/collections/{collection_id}/search'
        resp = requests.post(api_url, headers=headers, json={
            'query': query,
            'size': num_results
        })
        resp.raise_for_status()
        search_results = resp.json()

        return jsonify(search_results)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 400

# Route for generating an answer using the selected LLM model
@app.route('/generate_answer', methods=['POST'])
def generate_answer():
    data = request.json
    system_prompt = data.get('system_prompt', '')
    search_results = data.get('search_results', [])
    user_query = data.get('user_query', '')
    model = data.get('model', '')
    temperature = data.get('temperature', 0.7)

    merged_prompt = 'Search Results:\n'
    for result in search_results:
        merged_prompt += result + '\n\n'
    merged_prompt += '\nUser Query:\n' + user_query
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": merged_prompt}
    ]
   
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json"
    }
    request_data = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }

    try: 
        # Send a POST request to the API
        response = requests.post(LLM_API_URL, headers=headers, json=request_data)
        # Raise an error if the request was unsuccessful
        response.raise_for_status()
        # Convert the generated content to HTML using markdown
        generated_content = response.json()['choices'][0]['message']['content']
        html_content = markdown.markdown(generated_content)

        return jsonify({'content': html_content})

    except requests.RequestException as e:
        error_message = response.json().get('error', {}).get('message', str(e))
        return jsonify({'error': error_message}), 400

# Run the Flask application in debug mode
if __name__ == '__main__':
    app.run(debug=True)
