# Chirp Demo Instructions (Python Backend)

This guide explains how to run the Chirp web demo, which uses a Python backend to connect to the Google Cloud Speech-to-Text API.

## Prerequisites

1.  **Python 3.7+**: Make sure you have Python installed. You can check by running `python3 --version`.
2.  **Google Cloud SDK**: You need the `gcloud` command-line tool installed. You can find installation instructions [here](https://cloud.google.com/sdk/docs/install).

---

## Step 1: Google Cloud Authentication & Configuration

This is a one-time setup on your machine.

1.  **Set Your Project ID**: Tell `gcloud` which project to use. **Replace `YOUR_PROJECT_ID`** with your actual GCP Project ID (e.g., `rgodoy-sandbox`).
    ```bash
    gcloud config set project YOUR_PROJECT_ID
    ```

2.  **Login for Application Default Credentials (ADC)**: This command securely stores your user credentials in a place the Python server can find them.
    ```bash
    gcloud auth application-default login
    ```
    This will open a browser window for you to log in to your Google account.

3.  **Enable the Speech-to-Text API**: If you haven't already, enable the API for your project.
    ```bash
    gcloud services enable speech.googleapis.com --project=YOUR_PROJECT_ID
    ```

---

## Step 2: Set Up Python Environment

1.  **Create a Virtual Environment** (Recommended): Open your terminal in the project directory (`chirp-demo`) and run the following command to create an isolated environment.
    ```bash
    python3 -m venv venv
    ```

2.  **Activate the Virtual Environment**:
    *   On **macOS/Linux**:
        ```bash
        source venv/bin/activate
        ```
    *   On **Windows**:
        ```bash
        .\\venv\\Scripts\\activate
        ```
    Your terminal prompt should now be prefixed with `(venv)`.

3.  **Install Dependencies**: Use `pip` and the `requirements.txt` file to install the necessary Python packages.
    ```bash
    pip install -r requirements.txt
    ```

---

## Step 3: Run the Application

1.  **Start the Python Backend**: In your terminal (with the virtual environment still active), run the server.
    ```bash
    python server.py
    ```
    You should see the output `Starting WebSocket server on ws://localhost:3001`. Keep this terminal window open.

2.  **Open the Frontend**: Open the `index.html` file in your web browser.

3.  **Test**: Click on the "Module 2" tab, press "Start Captioning", and begin speaking. You should see a real-time transcription.
