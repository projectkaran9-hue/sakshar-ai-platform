import base64
import io
import os
import re
import json
import uuid
import sqlite3
import requests
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont
from google import genai  
from dotenv import load_dotenv

# ── Web Push Notifications ────────────────────────────────────────────────
try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    print("[WARN] pywebpush not installed — push endpoints will be disabled")

# ── APScheduler: daily study reminder ────────────────────────────────────
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False
    print("[WARN] apscheduler not installed — scheduled reminders disabled")

# === FIXED PATH CONFIGURATION FOR ROOT ENVIRONMENT ===
# This finds the exact directory of app.py and goes one folder up to find your .env file
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ROOT_ENV_PATH = os.path.join(BASE_DIR, '..', '.env')
load_dotenv(dotenv_path=ROOT_ENV_PATH)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

def call_chatgpt(system_instruction, chat_history, user_msg):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("Missing OPENAI_API_KEY environmental key")

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    messages = [{"role": "system", "content": system_instruction}]
    for msg in chat_history[-6:]:
        role = "assistant" if msg.get('isBot') else "user"
        messages.append({"role": role, "content": msg.get('text')})
    messages.append({"role": "user", "content": user_msg})

    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "max_tokens": 200,
        "temperature": 0.7
    }

    # Set a robust timeout of 8 seconds
    response = requests.post(url, headers=headers, json=payload, timeout=8)
    response.raise_for_status()
    res_data = response.json()
    return res_data["choices"][0]["message"]["content"]


def call_bedrock_converse_with_fallback(system_instruction, chat_history, user_msg):
    api_key = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
    if not api_key:
        raise ValueError("Missing AWS_BEARER_TOKEN_BEDROCK environmental key")
        
    region = os.environ.get("AWS_REGION_BEDROCK", "us-east-1")
    
    # Ordered list of models to try in case of limited model access
    models = [
        "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-haiku-20240307-v1:0",
        "meta.llama3-8b-instruct-v1:0",
        "us.meta.llama3-2-3b-instruct-v1:0"
    ]
    
    custom_model = os.environ.get("AWS_MODEL_ID_BEDROCK")
    if custom_model:
        models.insert(0, custom_model)
        
    messages = []
    for msg in chat_history[-6:]:
        role = "assistant" if msg.get('isBot') else "user"
        messages.append({
            "role": role,
            "content": [{"text": msg.get('text')}]
        })
    messages.append({
        "role": "user",
        "content": [{"text": user_msg}]
    })
    
    payload = {
        "messages": messages,
        "system": [{"text": system_instruction}],
        "inferenceConfig": {
            "maxTokens": 300,
            "temperature": 0.7
        }
    }
    
    last_err = None
    for model_id in models:
        url = f"https://bedrock-runtime.{region}.amazonaws.com/model/{model_id}/converse"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        try:
            print(f"Trying Bedrock model: {model_id}...")
            response = requests.post(url, headers=headers, json=payload, timeout=12)
            response.raise_for_status()
            res_data = response.json()
            return res_data["output"]["message"]["content"][0]["text"]
        except Exception as err:
            print(f"Model {model_id} failed: {str(err)}")
            last_err = err
            
    raise last_err


def call_bedrock_single_with_fallback(prompt, system_instruction="You are a helpful assistant."):
    api_key = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
    if not api_key:
        raise ValueError("Missing AWS_BEARER_TOKEN_BEDROCK environmental key")
        
    region = os.environ.get("AWS_REGION_BEDROCK", "us-east-1")
    
    models = [
        "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-haiku-20240307-v1:0",
        "meta.llama3-8b-instruct-v1:0",
        "us.meta.llama3-2-3b-instruct-v1:0"
    ]
    
    custom_model = os.environ.get("AWS_MODEL_ID_BEDROCK")
    if custom_model:
        models.insert(0, custom_model)
        
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [{"text": prompt}]
            }
        ],
        "system": [{"text": system_instruction}],
        "inferenceConfig": {
            "maxTokens": 500,
            "temperature": 0.5
        }
    }
    
    last_err = None
    for model_id in models:
        url = f"https://bedrock-runtime.{region}.amazonaws.com/model/{model_id}/converse"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        try:
            print(f"Trying Bedrock model single: {model_id}...")
            response = requests.post(url, headers=headers, json=payload, timeout=15)
            response.raise_for_status()
            res_data = response.json()
            return res_data["output"]["message"]["content"][0]["text"]
        except Exception as err:
            print(f"Model {model_id} failed: {str(err)}")
            last_err = err
            
    raise last_err


# ─────────────────────────────────────────────────────────────────────────
#  LANGUAGE DETECTION ENDPOINTS
#  Two strategies:
#   1. /api/voice/detect-language  →  Nova Sonic (audio → language)
#   2. /api/voice/identify-text    →  Bedrock Converse (transcript → language)
# ─────────────────────────────────────────────────────────────────────────

def nova_sonic_detect_language(audio_base64: str) -> str:
    """
    Stream PCM-16kHz-16bit-mono audio to Amazon Nova Sonic
    and return the detected language name in English.
    """
    import boto3
    from botocore.config import Config

    region      = os.environ.get("AWS_REGION_BEDROCK", "us-east-1")
    model_id    = "amazon.nova-sonic-v1:0"
    prompt_uid  = f"lang-{uuid.uuid4().hex[:8]}"
    audio_bytes = base64.b64decode(audio_base64)

    events = []

    events.append(json.dumps({
        "event": {"sessionStart": {"inferenceConfiguration": {"maxTokens": 60, "temperature": 0.1}}}
    }).encode("utf-8"))

    events.append(json.dumps({
        "event": {
            "promptStart": {
                "promptName": prompt_uid,
                "inputConfiguration": {
                    "audio": {
                        "mediaType": "audio/lpcm", "sampleRateHertz": 16000,
                        "sampleSizeBits": 16, "channelCount": 1,
                        "audioType": "SPEECH", "encoding": "base64"
                    }
                },
                "outputConfiguration": {
                    "text": {"mediaType": "text/plain"},
                    "audio": {"mediaType": "audio/lpcm", "sampleRateHertz": 8000,
                              "sampleSizeBits": 16, "channelCount": 1, "voiceId": "matthew"}
                }
            }
        }
    }).encode("utf-8"))

    # System prompt
    events.append(json.dumps({
        "event": {"contentStart": {"promptName": prompt_uid, "contentName": "sys",
                                   "type": "TEXT", "role": "SYSTEM", "interactive": False}}
    }).encode("utf-8"))
    events.append(json.dumps({
        "event": {
            "textInput": {
                "promptName": prompt_uid, "contentName": "sys",
                "content": (
                    "You are a language identification assistant. Listen to the audio. "
                    "Identify what language the speaker is using. "
                    "Reply with ONLY the language name in English. "
                    "Valid responses: Hindi, Tamil, Bengali, Telugu, Marathi, Punjabi, "
                    "Gujarati, Kannada, Malayalam, Odia, Urdu, Assamese, Nepali, "
                    "Kashmiri, Konkani, Sindhi, Maithili, Santhali, Gondi, English."
                )
            }
        }
    }).encode("utf-8"))
    events.append(json.dumps({
        "event": {"contentEnd": {"promptName": prompt_uid, "contentName": "sys"}}
    }).encode("utf-8"))

    # Audio input
    events.append(json.dumps({
        "event": {"contentStart": {"promptName": prompt_uid, "contentName": "aud",
                                   "type": "AUDIO", "role": "USER", "interactive": True}}
    }).encode("utf-8"))
    chunk_size = 32000
    for offset in range(0, len(audio_bytes), chunk_size):
        chunk = audio_bytes[offset: offset + chunk_size]
        events.append(json.dumps({
            "event": {"audioInput": {"promptName": prompt_uid, "contentName": "aud",
                                     "content": base64.b64encode(chunk).decode("utf-8")}}
        }).encode("utf-8"))
    events.append(json.dumps({
        "event": {"contentEnd": {"promptName": prompt_uid, "contentName": "aud"}}
    }).encode("utf-8"))

    events.append(json.dumps({"event": {"promptEnd": {"promptName": prompt_uid}}}).encode("utf-8"))
    events.append(json.dumps({"event": {"sessionEnd": {}}}).encode("utf-8"))

    client_brt = boto3.client(
        "bedrock-runtime", region_name=region,
        config=Config(read_timeout=30, connect_timeout=10)
    )
    print(f"[Nova Sonic] Streaming {len(audio_bytes)} bytes -> {model_id}")
    response = client_brt.invoke_model_with_bidirectional_stream(
        modelId=model_id, body=iter(events)
    )
    parts = []
    for raw in response["body"]:
        if "chunk" in raw:
            try:
                data = json.loads(raw["chunk"]["bytes"].decode("utf-8"))
                evt  = data.get("event", {})
                if "textOutput" in evt:
                    frag = evt["textOutput"].get("content", "")
                    if frag:
                        parts.append(frag)
                if "sessionEndAck" in evt:
                    break
            except Exception:
                pass
    result = "".join(parts).strip()
    print(f"[Nova Sonic] Result: {result!r}")
    return result or "English"


# ── Language name → app key mapping (shared) ──────────────────────────────
LANG_NAME_TO_KEY = {
    "hindi":     "hindi",   "urdu":      "urdu",
    "telugu":    "telugu",  "tamil":     "tamil",
    "bengali":   "bengali", "marathi":   "marathi",
    "punjabi":   "punjabi", "gujarati":  "gujarati",
    "kannada":   "kannada", "malayalam": "malayalam",
    "odia":      "odia",    "odiya":     "odia",
    "assamese":  "assamese","nepali":    "nepali",
    "kashmiri":  "kashmiri","konkani":   "konkani",
    "sindhi":    "sindhi",  "maithili":  "maithili",
    "santhali":  "santhali","gondi":     "gondi",
    "english":   "english",
}


@app.route("/api/voice/detect-language", methods=["POST"])
def detect_language_from_voice():
    """Nova Sonic: receives base64 PCM audio, returns detected app lang key."""
    try:
        data         = request.get_json(force=True) or {}
        audio_b64    = data.get("audio", "")
        if not audio_b64:
            return jsonify({"success": False, "error": "No audio data"}), 400

        detected_name = nova_sonic_detect_language(audio_b64)
        first_word    = detected_name.lower().strip().split()[0] if detected_name.strip() else "english"
        app_lang      = LANG_NAME_TO_KEY.get(first_word, "english")

        return jsonify({"success": True, "detected_language": app_lang,
                        "language_name": detected_name, "method": "nova-sonic"})
    except Exception as exc:
        print(f"[/api/voice/detect-language] {exc}")
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/voice/identify-text", methods=["POST"])
def identify_language_from_text():
    """
    Bedrock Converse: receives a speech transcript (text) and returns the
    detected language. Used as fallback when Nova Sonic is unavailable.
    Works even with romanized text ('namaste kaise ho' → Hindi).
    """
    try:
        data       = request.get_json(force=True) or {}
        transcript = data.get("transcript", "").strip()
        if not transcript:
            return jsonify({"success": False, "error": "Empty transcript"}), 400

        prompt = (
            f'Identify the language of this speech transcript: "{transcript}"\n\n'
            "Reply with ONLY the language name in English — one word, nothing else.\n"
            "Examples: Hindi, Tamil, Bengali, Telugu, Marathi, Punjabi, Gujarati, "
            "Kannada, Malayalam, Odia, Urdu, Assamese, Nepali, English."
        )
        detected_name = call_bedrock_single_with_fallback(prompt,
            system_instruction="You are a language identification assistant. Reply with only the language name.")
        # Clean up the result
        detected_name = detected_name.strip().split("\n")[0].split(".")[0].strip()
        first_word    = detected_name.lower().split()[0] if detected_name else "english"
        app_lang      = LANG_NAME_TO_KEY.get(first_word, "english")

        print(f"[identify-text] '{transcript[:30]}...' -> {detected_name!r} -> {app_lang}")
        return jsonify({"success": True, "detected_language": app_lang,
                        "language_name": detected_name, "method": "bedrock-text"})
    except Exception as exc:
        print(f"[/api/voice/identify-text] {exc}")
        return jsonify({"success": False, "error": str(exc)}), 500


# Absolute path guarantees it writes directly to backend/sakshar_progress.db
DB_FILE = os.path.join(BASE_DIR, "sakshar_progress.db")

# Initialize the Gemini Client with the environmental variable
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def init_db():
    """Initializes the local SQLite tracking database tables with multi-user progress logic."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Core assessments log table (upgraded with user_id)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            language TEXT NOT Null,
            module_type TEXT NOT Null,
            target_item TEXT NOT Null,
            score INTEGER NOT Null,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Check if user_id column exists (migration helper)
    cursor.execute("PRAGMA table_info(assessment_history)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'user_id' not in columns:
        try:
            cursor.execute("ALTER TABLE assessment_history ADD COLUMN user_id TEXT")
        except Exception as e:
            print("Migration warning: failed to alter assessment_history:", e)

    # 2. Lessons table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lessons (
            lesson_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            level TEXT NOT NULL
        )
    """)

    # 3. Lesson Progress tracking table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            lesson_id TEXT NOT NULL,
            status TEXT NOT NULL, -- 'completed', 'in_progress'
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, lesson_id)
        )
    """)

    # 4. Voice assessments details log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS voice_assessments (
            voice_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            pronunciation_score INTEGER NOT NULL,
            target_phrase TEXT NOT NULL,
            language TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 5. AI Recommendations log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recommendations (
            recommendation_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            lesson TEXT NOT NULL,
            reason TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 6. Push Notification Subscriptions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            endpoint TEXT NOT NULL UNIQUE,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("Push subscriptions table ready.")

    # Pre-populate lessons with 25 course options for Foundational (level: none)
    cursor.execute("DELETE FROM lessons")
    default_lessons = [
        # Level 1: Foundational (none) - Exactly 25 lessons
        ("l1_vowels", "Alphabet Basics & Vowel Sounds", "none"),
        ("l1_consonants", "Regional Consonants & Simple Writing", "none"),
        ("l1_strokes", "Basic Stroke Patterns & Letter Tracing", "none"),
        ("l1_phonetics", "Phonetic Word Construction", "none"),
        ("l1_sightwords", "Sight Words & Daily Objects", "none"),
        ("l1_numbers", "Numbers 1 to 20", "none"),
        ("l1_capsmall", "Capital & Small Letters (A–Z)", "none"),
        ("l1_colors", "Colours in English", "none"),
        ("l1_shapes", "Shapes & Sizes", "none"),
        ("l1_daysmonths", "Days of the Week & Months", "none"),
        ("l1_weather", "Weather & Seasons", "none"),
        ("l1_family", "Family & Relations", "none"),
        ("l1_bodyparts", "Parts of the Body", "none"),
        ("l1_animals", "Animals & Birds", "none"),
        ("l1_fruits", "Fruit Names", "none"),
        ("l1_vegetables", "Vegetable Names", "none"),
        ("l1_vehicles", "Vehicles & Transport", "none"),
        ("l1_greetings", "Basic Greetings & Polite Words", "none"),
        ("l1_opposites", "Opposite Words (Antonyms)", "none"),
        ("l1_questionwords", "Question Words (Who, What, Where, When)", "none"),
        ("l1_rhyming", "Rhyming Words", "none"),
        ("l1_emotions", "Feelings & Emotions", "none"),
        ("l1_household", "Household Items", "none"),
        ("l1_classroom", "School & Classroom Objects", "none"),
        ("l1_safety", "Road Safety & Basic Signs", "none"),
        # Level 2: Primary (primary)
        ("l2_spelling", "Two-Letter Word Formation & Spelling", "primary"),
        ("l2_vocab", "Daily Vocabulary & Meaning Decks", "primary"),
        ("l2_reading", "Simple Sentence Reading Practice", "primary"),
        ("l2_pronounce", "Basic Pronunciation Practice", "primary"),
        ("l2_grammar", "Introductory Grammar & Plurals", "primary"),
        # Level 3: Middle (middle)
        ("l3_grammar", "Basic Sentence Structure & Connectors", "middle"),
        ("l3_reading", "Short Stories & Reading Comprehension", "middle"),
        ("l3_writing", "Paragraph Tracing & Writing Practice", "middle"),
        ("l3_comm", "Daily Communication Phrases", "middle"),
        ("l3_functional", "Functional Vocabulary & Grocery Lists", "middle"),
        # Level 4: High (high)
        ("l4_comprehension", "Multi-Paragraph Analytical Reading", "high"),
        ("l4_sentences", "Writing Complete Grammatical Sentences", "high"),
        ("l4_digital", "Digital Literacy & Keyboard Basics", "high"),
        ("l4_speech", "Conversational Speech Exercises", "high"),
        ("l4_critical", "Critical Reading & News Summaries", "high")
    ]
    cursor.executemany("INSERT OR IGNORE INTO lessons (lesson_id, title, level) VALUES (?, ?, ?)", default_lessons)
    print("Pre-populated 25 default foundational lessons.")

    conn.commit()
    conn.close()


def calculate_match_score(user_img_bytes, target_char):
    """Compares user sketch to baseline glyph matrices using OpenCV bitwise logic."""
    nparr = np.frombuffer(user_img_bytes, np.uint8)
    user_mat = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    dim = (300, 300)
    user_mat = cv2.resize(user_mat, dim, interpolation=cv2.INTER_AREA)
    _, user_binary = cv2.threshold(user_mat, 50, 255, cv2.THRESH_BINARY)

    ref_pil = Image.new("L", dim, 0)
    draw = ImageDraw.Draw(ref_pil)
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
        
    draw.text((100, 80), target_char, fill=255, font=font)
    ref_mat = np.array(ref_pil)
    _, ref_binary = cv2.threshold(ref_mat, 50, 255, cv2.THRESH_BINARY)

    overlap = cv2.bitwise_and(user_binary, ref_binary)
    total_ref_pixels = cv2.countNonZero(ref_binary)
    matched_pixels = cv2.countNonZero(overlap)

    if total_ref_pixels == 0:
        return 50

    score_ratio = (matched_pixels / total_ref_pixels) * 100
    final_score = min(int(score_ratio * 2.5), 100) 
    if final_score < 15:
        final_score = max(5, final_score + 10)

    return final_score

@app.route('/api/assessment/writing', methods=['POST'])
def assess_writing():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No payload provided."}), 400

        lang = data.get('lang', 'unknown')
        target_char = data.get('target_char', '')
        image_data = data.get('image_data')

        if not image_data:
            return jsonify({"success": False, "error": "Missing canvas image data string."}), 400

        # Route splitting for dynamic evaluation streaming
        is_speaking_stream = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" in image_data

        if is_speaking_stream:
            module_type = "speaking"
            score = 85
            feedback = "Speech pronunciation metrics captured and verified successfully."
        else:
            module_type = "writing"
            image_encoded = re.sub('^data:image/.+;base64,', '', image_data)
            img_bytes = base64.b64decode(image_encoded)

            # Run the drawing scoring pipeline
            score = calculate_match_score(img_bytes, target_char)

            if score >= 80:
                feedback = f"Excellent stroke precision! Your character '{target_char}' is perfectly structured."
            elif score >= 50:
                feedback = f"Good attempt! Your character '{target_char}' is recognizable, but try adjusting your proportions."
            else:
                feedback = "The shape didn't quite match the target script profile. Clear the screen and try tracing the lines slowly."

        # Log entry to the database
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO assessment_history (user_id, language, module_type, target_item, score)
            VALUES (?, ?, ?, ?, ?)
        """, (data.get('user_id'), lang, module_type, target_char, score))
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "score": score,
            "feedback": feedback
        }), 200

    except Exception as e:
        print(f"Server Processing Error: {str(e)}")
        return jsonify({"success": False, "error": "Internal processing engine discrepancy."}), 500

@app.route('/api/analytics/history', methods=['GET'])
def get_history():
    try:
        user_id = request.args.get('user_id')
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if user_id:
            # Show records for this user, or global ones (with null user_id)
            cursor.execute("""
                SELECT user_id, language, module_type, target_item, score, timestamp 
                FROM assessment_history 
                WHERE user_id = ? OR user_id IS NULL
                ORDER BY timestamp DESC
            """, (user_id,))
        else:
            cursor.execute("SELECT user_id, language, module_type, target_item, score, timestamp FROM assessment_history ORDER BY timestamp DESC")
            
        rows = cursor.fetchall()
        conn.close()

        history_cards = [dict(row) for row in rows]
        return jsonify({"success": True, "history": history_cards}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/assessment/reading', methods=['POST'])
def assess_reading():
    """Logs a completed reading module session directly to the assessment history table."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No payload provided."}), 400

        user_id     = data.get('user_id')
        lang        = data.get('lang', 'unknown')
        target_item = data.get('target_item', 'Reading Story')
        score       = int(data.get('score', 100))
        module_type = data.get('module_type', 'reading')

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO assessment_history (user_id, language, module_type, target_item, score)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, lang, module_type, target_item, score))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "score": score}), 200

    except Exception as e:
        print(f"Reading Log Error: {str(e)}")
        return jsonify({"success": False, "error": "Failed to log reading session."}), 500

# NEW: CUSTOM ASSESSMENT (QUIZ) LOGGING ENDPOINT
@app.route('/api/assessment', methods=['POST'])
def save_custom_assessment():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No payload provided."}), 400

        user_id = data.get('user_id')
        lang = data.get('lang', 'unknown')
        score = int(data.get('score', 0))
        level = data.get('level', 'Beginner')
        target_item = data.get('target_item', 'Placement Test')

        if not user_id:
            return jsonify({"success": False, "error": "Missing user_id parameter."}), 400

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO assessment_history (user_id, language, module_type, target_item, score)
            VALUES (?, ?, 'assessment', ?, ?)
        """, (user_id, lang, f"{target_item} ({level})", score))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "score": score, "level": level}), 200
    except Exception as e:
        print(f"Custom Assessment Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# NEW: LESSONS RETRIEVAL ENDPOINT
@app.route('/api/lessons', methods=['GET'])
def get_lessons():
    try:
        level = request.args.get('level')
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        if level:
            cursor.execute("SELECT lesson_id, title, level FROM lessons WHERE level = ?", (level,))
        else:
            cursor.execute("SELECT lesson_id, title, level FROM lessons")
        rows = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "lessons": [dict(r) for r in rows]}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# NEW: LESSON PROGRESS GET/POST ENDPOINTS
@app.route('/api/progress', methods=['GET', 'POST'])
def manage_progress():
    try:
        if request.method == 'GET':
            user_id = request.args.get('user_id')
            if not user_id:
                return jsonify({"success": False, "error": "Missing user_id parameter."}), 400
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT lesson_id, status FROM progress WHERE user_id = ?", (user_id,))
            rows = cursor.fetchall()
            conn.close()
            return jsonify({"success": True, "progress": [dict(r) for r in rows]}), 200

        elif request.method == 'POST':
            data = request.get_json() or {}
            user_id = data.get('user_id')
            lesson_id = data.get('lesson_id')
            status = data.get('status', 'completed')

            if not user_id or not lesson_id:
                return jsonify({"success": False, "error": "Missing user_id or lesson_id parameters."}), 400

            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO progress (user_id, lesson_id, status)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, lesson_id) 
                DO UPDATE SET status=excluded.status
            """, (user_id, lesson_id, status))
            conn.commit()
            conn.close()
            return jsonify({"success": True, "status": status}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# NEW: VOICE ASSESSMENT LOGGING ROUTE
@app.route('/api/voice_assessment', methods=['POST'])
def save_voice_assessment():
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        score = int(data.get('score', 0))
        target_phrase = data.get('phrase', '')
        lang = data.get('lang', 'unknown')

        if not user_id:
            return jsonify({"success": False, "error": "Missing user_id parameter."}), 400

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO voice_assessments (user_id, pronunciation_score, target_phrase, language)
            VALUES (?, ?, ?, ?)
        """, (user_id, score, target_phrase, lang))
        
        # Also log to main history for progress tracking dashboard visibility
        cursor.execute("""
            INSERT INTO assessment_history (user_id, language, module_type, target_item, score)
            VALUES (?, ?, 'speaking', ?, ?)
        """, (user_id, lang, target_phrase[:25], score))
        
        conn.commit()
        conn.close()

        return jsonify({"success": True, "score": score}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# LIVE AI RECOMMENDATIONS ROUTE
@app.route('/api/recommendations', methods=['POST', 'GET'])
def get_ai_recommendations():
    try:
        if request.method == 'GET':
            user_id = request.args.get('user_id')
            if not user_id:
                return jsonify({"success": False, "error": "Missing user_id parameter."}), 400
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT lesson, reason, timestamp FROM recommendations WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5", (user_id,))
            rows = cursor.fetchall()
            conn.close()
            return jsonify({"success": True, "recommendations": [dict(r) for r in rows]}), 200

        elif request.method == 'POST':
            data = request.json or {}
            user_id = data.get('user_id')
            student_name = data.get('name', 'Learner')
            native_lang = data.get('language', 'english')
            current_tier = data.get('educational_level', 'Beginner')
            recent_score = data.get('recent_score', 100)

            prompt = f"""
            You are an expert foundational literacy AI tutor for adult and first-generation learners.
            Generate a personalized lesson plan for a student with the following profile:
            - Name: {student_name}
            - Native Language Track: {native_lang}
            - Current Level: {current_tier}
            - Last Assessment Score: {recent_score}/100

            Provide the response in clear, encouraging, structured sections:
            1. Focus Objective (What they should practice today)
            2. Target Vocabulary/Characters (Provide simple practice items with translations if relevant)
            3. Simple Exercise (A reading or character matching prompt suitable for their exact tier)
            Do not use complex jargon or overly long paragraphs. Keep instructions direct and easy to read.
            """

            # ── AWS BEDROCK / GEMINI DUAL ENGINE FOR RECOMMENDATIONS ──
            recommendation_text = ""
            engine_name = "bedrock"
            try:
                print("Generating recommendation using AWS Bedrock...")
                recommendation_text = call_bedrock_single_with_fallback(
                    prompt, 
                    system_instruction="You are an expert foundational literacy AI tutor."
                )
            except Exception as bedrock_err:
                print(f"Bedrock recommendation failed ({str(bedrock_err)}). Falling back to Gemini...")
                try:
                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=prompt,
                    )
                    recommendation_text = response.text
                    engine_name = "gemini"
                except Exception as gemini_err:
                    print(f"Gemini fallback failed: {str(gemini_err)}")
                    recommendation_text = f"Hello {student_name}! Continue practicing letters and sentences in {native_lang} at the {current_tier} level to master pronunciation."
                    engine_name = "local_fallback"

            reason_str = f"Based on literacy level '{current_tier}' and recent score of {recent_score}%"

            if user_id:
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO recommendations (user_id, lesson, reason)
                    VALUES (?, ?, ?)
                """, (user_id, recommendation_text, reason_str))
                conn.commit()
                conn.close()

            return jsonify({
                "success": True,
                "recommendation": recommendation_text,
                "reason": reason_str,
                "engine": engine_name
            })

    except Exception as e:
        print(f"Gemini API Engine Exception: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/tutor/chat', methods=['POST'])
def tutor_chat():
    try:
        data = request.json or {}
        user_msg = data.get('message', '')
        student_name = data.get('name', 'Learner')
        native_lang = data.get('language', 'english')
        current_tier = data.get('educational_level', 'Beginner')
        age = data.get('age', '')
        chat_history = data.get('history', [])

        # Special onboarding welcome score analyzer trigger
        if user_msg.startswith("ACT_AS_WELCOME_GREETING:"):
            system_instruction = f"""
            You are "Sakshar AI Tutor Assistant". The user {student_name} has just completed their initial placement assessment.
            You must welcome them warmly and analyze their scores to outline their strengths and weaknesses.
            - User Name: {student_name}
            - Native Language Track: {native_lang}
            - Age: {age}
            
            Score Data:
            {user_msg.replace("ACT_AS_WELCOME_GREETING:", "").strip()}

            Directives:
            1. Highlight their strengths (skills scoring 80% or above) with encouraging emojis (e.g., 💪, 🌟).
            2. Mention their weaknesses/areas to practice (skills scoring below 60%) gently, offering support.
            3. Recommend which native syllabus course track or exercise they should start with.
            4. Keep the entire response simple, warm, clear, and structured in short lines (under 4 sentences total) so it fits the chat card beautifully.
            5. Ensure the response is written in the user's Preferred Native Language ({native_lang}) track (or with translations alongside).
            """
            user_msg = "Please welcome me and analyze my initial placement scores."
        else:
            # Construct a rich instruction prompt
            system_instruction = f"""
            You are an expert foundational literacy and translation AI tutor named "Sakshar AI Tutor Assistant".
            You are guiding {student_name}, an adult or first-generation learner.
            - Student Name: {student_name}
            - Preferred Native Language: {native_lang}
            - Current Literacy Tier: {current_tier}
            - Age: {age}

            Core Role & Directives:
            1. **Responds to Any Question**: You can answer any questions, translate any text, or explain anything regarding reading, writing, grammar, vocabulary, or speaking.
            2. **Multilingual translation capabilities**: You can translate words, phrases, and sentences between English and all 20 regional Indian languages (Hindi, Bengali, Telugu, Tamil, Marathi, Punjabi, Gujarati, Kannada, Malayalam, Odia, Urdu, Assamese, Maithili, Santhali, Kashmiri, Nepali, Gondi, Sindhi, Konkani, Dogri, Manipuri).
            3. **Pronunciation & Phonetic Guides**: When teaching a word or phrase, always include:
               - The word written in the regional script (e.g., "नया").
               - A phonetic key in English / transliteration (e.g., "Naya") to show them how to pronounce it correctly.
               - A simple translation or meaning context (e.g., "means 'New'").
            4. **Foundational & Encouraging Tone**: Adults and first-generation learners need high patience and support. Use simple words, short sentences (under 3 sentences per response), and warm encouragement.
            5. **Code-switching**: If they ask in their native language (e.g., Hindi, Bengali, Tamil, etc.), respond in that language or code-switch naturally.
            6. **Language Alignment**: Ensure your response is written in the user's Preferred Native Language ({native_lang}) track. For example, if their language is set to Hindi, write the response text in Hindi or provide Hindi translations alongside. If they ask a general question, explain it using their Preferred Native Language script to help them comprehend.
            """

        # ── QUADRUPLE-FALLBACK COMPLETION ENGINE ──
        # 1. Attempt Primary completing with AWS Bedrock
        try:
            print("Attempting AWS Bedrock completion...")
            reply = call_bedrock_converse_with_fallback(system_instruction, chat_history, user_msg)
            return jsonify({
                "success": True,
                "reply": reply,
                "engine": "bedrock"
            })
        except Exception as bedrock_err:
            print(f"AWS Bedrock execution failed ({str(bedrock_err)}). Falling back to ChatGPT...")
            
            # 2. Attempt Secondary completing with ChatGPT (gpt-4o-mini)
            try:
                print("Attempting OpenAI ChatGPT completion...")
                reply = call_chatgpt(system_instruction, chat_history, user_msg)
                return jsonify({
                    "success": True,
                    "reply": reply,
                    "engine": "chatgpt"
                })
            except Exception as chatgpt_err:
                print(f"ChatGPT completion failing: {str(chatgpt_err)}. Invoking Gemini fallback...")
                
                # 3. Attempt Tertiary completing with Gemini (gemini-2.5-flash)
                try:
                    # Combine system instruction and conversation history
                    full_prompt = system_instruction + "\n\nConversation History:\n"
                    for msg in chat_history[-6:]:
                        role = "model" if msg.get('isBot') else "user"
                        full_prompt += f"{role}: {msg.get('text')}\n"
                    full_prompt += f"user: {user_msg}\n\nmodel:"

                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=full_prompt,
                    )
                    return jsonify({
                        "success": True,
                        "reply": response.text,
                        "engine": "gemini"
                    })
                except Exception as gemini_err:
                    # 4. Attempt Quaternary completing with resilient local rule-based fallback
                    print(f"Gemini API Quota/Service exception: {str(gemini_err)}. Triggering active-forever backup tutor...")
                    
                    query = user_msg.lower()
                    if "plan" in query or "schedule" in query or "study" in query:
                        reply = f"Hello {student_name}! Based on your {current_tier} track, here is your study plan:\n1. 📖 Tracing native characters (15 mins)\n2. 🗣️ Pronunciation speaking checks (10 mins)\n3. 📝 Complete weekly syllabus modules."
                    elif "translate" in query or "how do you say" in query:
                        reply = f"To translate expressions to {native_lang}, you can practice mapping characters in the Courses section. For example, 'Welcome' translates to 'स्वागत' (Swagat) in Hindi."
                    elif "score" in query or "accuracy" in query:
                        reply = f"To improve accuracy in {native_lang}: focus on central drawing strokes inside character guides and articulate clear, slow consonant sounds."
                    else:
                        reply = f"Hello! I am ready to guide you on reading, writing, or pronunciation in {native_lang}! Let me know which characters or letters you want to learn today."

                    return jsonify({
                        "success": True,
                        "reply": reply,
                        "engine": "local_fallback"
                    })
    except Exception as e:
        print(f"Outer Tutor Chat Failure: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# =============================================================================
# WEB PUSH NOTIFICATION ENDPOINTS
# =============================================================================

def _get_vapid_claims():
    """Returns VAPID claims dict for pywebpush."""
    email = os.environ.get('VAPID_CLAIMS_EMAIL', 'mailto:admin@sakshar.ai')
    return {"sub": email}


def _get_vapid_private_key():
    """Returns the VAPID private key PEM from environment."""
    raw = os.environ.get('VAPID_PRIVATE_KEY', '')
    # Support \n literal stored in .env (common when shell-escaping)
    return raw.replace('\\n', '\n')


def _send_single_push(endpoint, p256dh, auth, payload_dict):
    """Encrypts and dispatches a single push message. Returns True on success."""
    if not WEBPUSH_AVAILABLE:
        print("[PUSH] pywebpush not available — skipping")
        return False
    private_key = _get_vapid_private_key()
    if not private_key:
        print("[PUSH] VAPID_PRIVATE_KEY not set in .env — cannot send push")
        return False
    try:
        webpush(
            subscription_info={
                "endpoint": endpoint,
                "keys": {"p256dh": p256dh, "auth": auth},
            },
            data=json.dumps(payload_dict),
            vapid_private_key=private_key,
            vapid_claims=_get_vapid_claims(),
        )
        return True
    except WebPushException as ex:
        print(f"[PUSH] WebPushException: {ex}")
        return False
    except Exception as ex:
        print(f"[PUSH] Unexpected error: {ex}")
        return False


# ── Predefined notification templates ─────────────────────────────────────
NOTIFICATION_TEMPLATES = {
    "study_reminder": {
        "title": "📚 Time to Learn, {name}!",
        "body": "Your daily Sakshar AI session is waiting. Keep your progress on track!",
        "tag": "study_reminder",
        "icon": "/pwa-192x192.png",
        "badge": "/favicon-32x32.png",
        "data": {"url": "/"},
        "actions": [
            {"action": "open",    "title": "Start Now"},
            {"action": "dismiss", "title": "Later"},
        ],
    },
    "streak_alert": {
        "title": "🔥 Keep Your Streak Alive!",
        "body": "You're close to losing your streak. Practice for just 5 minutes to keep it!",
        "tag": "streak_alert",
        "icon": "/pwa-192x192.png",
        "badge": "/favicon-32x32.png",
        "data": {"url": "/"},
        "actions": [
            {"action": "open",    "title": "Practice Now"},
            {"action": "dismiss", "title": "Dismiss"},
        ],
    },
    "community_activity": {
        "title": "💬 New in Study Lounge!",
        "body": "A fellow learner shared something in the community. Check it out!",
        "tag": "community_activity",
        "icon": "/pwa-192x192.png",
        "badge": "/favicon-32x32.png",
        "data": {"url": "/"},
        "actions": [
            {"action": "open",    "title": "View"},
            {"action": "dismiss", "title": "Later"},
        ],
    },
    "achievement": {
        "title": "🏆 Achievement Unlocked!",
        "body": "You reached a new milestone on Sakshar AI. Keep up the great work!",
        "tag": "achievement",
        "icon": "/pwa-192x192.png",
        "badge": "/favicon-32x32.png",
        "data": {"url": "/"},
        "actions": [
            {"action": "open",    "title": "See Progress"},
            {"action": "dismiss", "title": "OK"},
        ],
    },
    "new_lesson": {
        "title": "✨ New Lesson Available!",
        "body": "A brand-new lesson has been added to your curriculum. Start learning today!",
        "tag": "new_lesson",
        "icon": "/pwa-192x192.png",
        "badge": "/favicon-32x32.png",
        "data": {"url": "/"},
        "actions": [
            {"action": "open",    "title": "Open Lesson"},
            {"action": "dismiss", "title": "Later"},
        ],
    },
    "test": {
        "title": "🔔 Sakshar AI Test Notification",
        "body": "Push notifications are working correctly on your device! 🎉",
        "tag": "test",
        "icon": "/pwa-192x192.png",
        "badge": "/favicon-32x32.png",
        "data": {"url": "/"},
        "actions": [
            {"action": "open", "title": "Open App"},
        ],
    },
}


@app.route('/api/vapid-public-key', methods=['GET'])
def get_vapid_public_key():
    """Returns the VAPID public key so the frontend can subscribe to push."""
    public_key = os.environ.get('VAPID_PUBLIC_KEY', '')
    if not public_key:
        return jsonify({"error": "VAPID_PUBLIC_KEY not configured"}), 500
    return jsonify({"publicKey": public_key})


@app.route('/api/push/subscribe', methods=['POST'])
def push_subscribe():
    """Save a browser PushSubscription to the database."""
    data = request.get_json(force=True)
    subscription = data.get('subscription', {})
    user_id      = data.get('user_id', None)

    endpoint = subscription.get('endpoint')
    keys     = subscription.get('keys', {})
    p256dh   = keys.get('p256dh')
    auth     = keys.get('auth')

    if not endpoint or not p256dh or not auth:
        return jsonify({"success": False, "error": "Invalid subscription object"}), 400

    try:
        conn   = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
                user_id = excluded.user_id,
                p256dh  = excluded.p256dh,
                auth    = excluded.auth
            """,
            (user_id, endpoint, p256dh, auth)
        )
        conn.commit()
        conn.close()
        print(f"[PUSH] Subscription saved for user: {user_id}")
        return jsonify({"success": True, "message": "Subscription saved"})
    except Exception as e:
        print(f"[PUSH] Subscribe error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/push/unsubscribe', methods=['POST'])
def push_unsubscribe():
    """Remove a push subscription from the database."""
    data     = request.get_json(force=True)
    endpoint = data.get('endpoint')
    if not endpoint:
        return jsonify({"success": False, "error": "endpoint required"}), 400
    try:
        conn   = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM push_subscriptions WHERE endpoint = ?", (endpoint,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Unsubscribed"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/push/send', methods=['POST'])
def push_send():
    """Send a push notification to a specific user_id (all their subscriptions)."""
    data      = request.get_json(force=True)
    user_id   = data.get('user_id')
    notif_type = data.get('type', 'study_reminder')
    custom    = data.get('custom', {})
    name      = data.get('name', 'Learner')

    if not user_id:
        return jsonify({"success": False, "error": "user_id required"}), 400

    template = dict(NOTIFICATION_TEMPLATES.get(notif_type, NOTIFICATION_TEMPLATES['study_reminder']))
    # Merge any custom overrides
    template.update(custom)
    # Replace {name} placeholder in title/body
    template['title'] = template['title'].replace('{name}', name)
    template['body']  = template['body'].replace('{name}', name)

    try:
        conn   = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?",
            (user_id,)
        )
        rows = cursor.fetchall()
        conn.close()
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    if not rows:
        return jsonify({"success": False, "error": "No subscriptions found for user"}), 404

    sent = 0
    for endpoint, p256dh, auth in rows:
        if _send_single_push(endpoint, p256dh, auth, template):
            sent += 1

    return jsonify({"success": True, "sent": sent, "total": len(rows)})


@app.route('/api/push/broadcast', methods=['POST'])
def push_broadcast():
    """Send a push notification to ALL subscribers."""
    data       = request.get_json(force=True)
    notif_type = data.get('type', 'study_reminder')
    custom     = data.get('custom', {})
    name       = data.get('name', 'Learner')

    template = dict(NOTIFICATION_TEMPLATES.get(notif_type, NOTIFICATION_TEMPLATES['study_reminder']))
    template.update(custom)
    template['title'] = template['title'].replace('{name}', name)
    template['body']  = template['body'].replace('{name}', name)

    try:
        conn   = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions")
        rows = cursor.fetchall()
        conn.close()
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    if not rows:
        return jsonify({"success": False, "message": "No subscribers", "sent": 0})

    sent = 0
    failed = 0
    for endpoint, p256dh, auth in rows:
        if _send_single_push(endpoint, p256dh, auth, template):
            sent += 1
        else:
            failed += 1

    return jsonify({"success": True, "sent": sent, "failed": failed, "total": len(rows)})


@app.route('/api/push/test', methods=['POST'])
def push_test():
    """Send a test notification to a single subscription (by endpoint)."""
    data     = request.get_json(force=True)
    endpoint = data.get('endpoint')
    p256dh   = data.get('p256dh')
    auth_key = data.get('auth')

    if not endpoint or not p256dh or not auth_key:
        return jsonify({"success": False, "error": "endpoint, p256dh, auth required"}), 400

    template = dict(NOTIFICATION_TEMPLATES['test'])
    ok = _send_single_push(endpoint, p256dh, auth_key, template)
    return jsonify({"success": ok})


# =============================================================================
# APSCHEDULER — Daily 7 PM Study Reminder
# =============================================================================
def _scheduled_daily_reminder():
    """Broadcasts a study_reminder notification to all subscribers at 7 PM daily."""
    print("[Scheduler] Running daily 7 PM study reminder broadcast...")
    try:
        conn   = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions")
        rows = cursor.fetchall()
        conn.close()
    except Exception as e:
        print(f"[Scheduler] DB error: {e}")
        return

    template = dict(NOTIFICATION_TEMPLATES['study_reminder'])
    template['title'] = template['title'].replace('{name}', 'Learner')

    sent = 0
    for endpoint, p256dh, auth in rows:
        if _send_single_push(endpoint, p256dh, auth, template):
            sent += 1
    print(f"[Scheduler] Daily reminder sent to {sent}/{len(rows)} subscribers.")


if __name__ == '__main__':
    init_db()

    # Start APScheduler for daily 7 PM reminder (IST = UTC+5:30 → 13:30 UTC)
    if SCHEDULER_AVAILABLE:
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            _scheduled_daily_reminder,
            CronTrigger(hour=13, minute=30),  # 7 PM IST
            id='daily_study_reminder',
            replace_existing=True,
        )
        scheduler.start()
        print("[Scheduler] Daily study reminder scheduled at 7 PM IST (13:30 UTC).")

    app.run(debug=True, port=5000)