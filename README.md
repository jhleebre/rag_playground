# RAG Playground

RAG Playground is a web application that allows to interact with various embedding models and large language models (LLMs) using the RAG APIs of Global AI Platform Company (https://globalaiplatform.com/). It is build using Flask.

## Requirements

To run this project, you will need:
- Python 3.x
- pip (Python package manager)

## Installation

### 1. Set Up a Virtual Environment

Setting up a virtual environment helps manage dependencies and avoid conflicts. Follow the instructions below based on your operating system.

#### Windows

Open Command Prompt and run the following commands:

```sh
python -m venv venv
venv\Scripts\activate
```

#### macOS

Open Terminal and run the following commands:

```sh
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

Install the project's dependencies. Run the following command from the project root directory:

#### Windows

```sh
pip install -r requirements.txt
```

#### macOS

```sh
pip3 install -r requirements.txt
```

### 3. Setting Environment Variables

Create a `.env` file in your project root directory and set it up like this:

```sh
# RAG Key
API_KEY=your_rag_api_key_here

# RAG URL
API_BASE=https://api.platform.a15t.com

# Embedding Models (separated by commas)
EMBEDDING_MODELS=openai/text-embedding-ada-002,openai/text-embedding-3-small,openai/text-embedding-3-large

# LLM API key
LLM_API_KEY=your_llm_api_key_here

# LLM API URL
LLM_API_URL=https://api.platform.a15t.com/v1/chat/completions

# List of models to use (separated by commas)
LLM_MODELS=gpt-3.5-turbo,gpt-4o
```

Replace `your_rag_api_key_here` and  `your_llm_api_key_here` with your actual RAG and LLM API keys.

### 4. Run the Application

To run the application in your local development environment, use the following command:

#### Windows

```sh
python app.py
```

#### macOS

```sh
python3 app.py
```

You can use the application by accessing `http://127.0.0.1:5000` from your browser.

## How to Use

1. Run the application as above.

2. You can use the application by accessing `http://127.0.0.1:5000` from your browser.

3. You can change the API keys, endpoint URLs, and model list by editing the `.env` file.

## Caution

- The `.env` file contains sensitive information, so keep it safe.
- Never post your API keys to a public repository.

## License

This project is distributed under the MIT License. See the `LICENSE` file for details.
