from extensions import celery
import traceback
import requests
import os
from pydub import AudioSegment
import random
import time
from dotenv import load_dotenv
import logging
from celery import Task

class ContextTask(Task):
    def __call__(self, *args, **kwargs):
        from app import create_app
        with create_app().app_context():
            return self.run(*args, **kwargs)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

@celery.task(bind=True)
def process_audio(self, filepath):
    try:
        self.update_state(state='PROCESSING', meta={'status': 'Transcription in progress...'})
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            transcription = transcribe_audio_whisper(filepath)
        else:
            logger.warning("OPENAI_API_KEY not set, using mock transcription")
            transcription = mock_transcription(filepath)
        return {'status': 'Transcription completed', 'result': transcription}
    except Exception as e:
        error_msg = f"Error processing audio: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise self.retry(exc=e, max_retries=3)

def transcribe_audio_whisper(file_path):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OpenAI API key not found in environment variables")
    
    # Convert audio to mp3 format
    audio = AudioSegment.from_file(file_path, format="webm")
    mp3_path = file_path.rsplit('.', 1)[0] + '.mp3'
    audio.export(mp3_path, format="mp3")

    try:
        with open(mp3_path, 'rb') as audio_file:
            response = requests.post(
                'https://api.openai.com/v1/audio/transcriptions',
                headers={'Authorization': f'Bearer {api_key}'},
                files={'file': audio_file},
                data={'model': 'whisper-1'}
            )

        response.raise_for_status()  # This will raise an HTTPError for bad responses
        transcription = response.json()['text']
        return transcription
    except requests.RequestException as e:
        logger.error(f"Error in API request: {str(e)}")
        raise
    finally:
        # Clean up temporary files
        if os.path.exists(mp3_path):
            os.remove(mp3_path)
        if os.path.exists(file_path):
            os.remove(file_path)

def mock_transcription(file_path):
    # Simulate a random processing time between 5 and 15 seconds
    processing_time = random.uniform(5, 15)
    time.sleep(processing_time)
    
    # Clean up the file
    if os.path.exists(file_path):
        os.remove(file_path)
    
    return f"This is a mock transcription of the audio file: {file_path}"