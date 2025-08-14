# Full-Stack Voice Agent 🗣️🤖

This is a **100% local and free** full-stack voice agent application that leverages powerful AI models to provide a real-time conversational experience. The frontend connects via WebSockets to a Python backend that handles all the heavy lifting. The entire system is **optimized for both CPU and GPU**, making it accessible on a wide range of hardware.

-----

### ✨ Key Features

  * **Real-time Interaction:** Enjoy a fluid, conversational experience thanks to a WebSocket connection between the frontend and backend.
  * **Speech-to-Text (STT):** Utilizes `fastwhisper` for efficient and accurate transcription of user speech.
  * **Text-to-Speech (TTS):** Leverages the `kokoro` library to synthesize natural-sounding AI voice responses.
  * **Flexible LLM Backend:** The backend is configured to use either a **local LLM via Ollama** or a cloud-based service via **OpenRouter**, giving you the flexibility to choose between privacy and powerful cloud models.
  * **Conversational Memory:** The agent maintains a chat history to provide more coherent and context-aware responses.

-----

### 🚀 Getting Started

Follow these steps to get the application up and running on your local machine.

#### Prerequisites

  * **Node.js**: The frontend requires Node.js to be installed.

  * **Python**: The backend is written in Python.

  * **uv**: A fast Python package installer and resolver. You can install it with `pip install uv`.

  * **Ollama (for local LLM)**: If you want to use a local LLM, you must have Ollama installed and running.

    1.  **Install Ollama:** Visit the [Ollama website](https://ollama.com/) and follow the installation instructions for your operating system.
    2.  **Pull a Model:** Once installed, open your terminal and download a model, for example, `llama3`:
        ```bash
        ollama run gemma3:1b
        ```
    3.  Ensure the Ollama server is running in the background.

  * **OpenRouter (for cloud LLM)**: If you prefer to use a cloud-based LLM, you'll need an OpenRouter API key. This is a great way to experiment with many different models without a local setup.

    1.  **Sign Up:** Create an account on the [OpenRouter website](https://openrouter.ai/).
    2.  **Get an API Key:** Navigate to your dashboard to create and copy your API key.
    3.  **Set up the API Key:** You'll need to set this key as an environment variable or configure it in the `llm_openrouter.py` file to be used by the backend.

-----

#### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/fullStack-voiceAgent.git
    cd fullStack-voiceAgent
    ```

2.  **Set up the Frontend:**
    Navigate into the `frontend` directory, install the necessary Node.js packages, and start the development server.

    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **Set up the Backend:**
    Open a new terminal and navigate to the `backend` directory.

    ```bash
    cd backend
    ```

    Create a Python virtual environment using **uv**.

    ```bash
    uv venv
    ```

    Activate the virtual environment.

      * **On macOS/Linux:** `source .venv/bin/activate`
      * **On Windows:** `.venv\Scripts\activate`

    Install the Python dependencies. Choose between a CPU-only version or one that leverages a GPU.

      * **For CPU-only:**
        ```bash
        uv pip install -r requirements.txt
        ```
      * **For GPU support:**
        ```bash
        uv pip install -r requirements-gpu.txt
        ```

    The backend is configured to prioritize `llm_ollama.py` if present, otherwise it will try to use `llm_openrouter.py`.

    Finally, start the FastAPI server:

    ```bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```

-----

### 🌐 Launch the Application

Once both the frontend and backend servers are running, open your web browser and navigate to `http://localhost:5173` to start using the voice agent.
