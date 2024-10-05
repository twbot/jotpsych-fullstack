from flask import Flask, request, jsonify, current_app
from flask_cors import CORS
from functools import wraps
from packaging.version import Version
from cryptography.fernet import Fernet
import os
import time
from extensions import db, bcrypt, jwt, celery
from models import User
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token, verify_jwt_in_request
from sqlalchemy.exc import SQLAlchemyError
import celery_tasks

CURRENT_VERSION = Version("1.2.0")
MINIMUM_REQUIRED_VERSION = Version("1.2.0")

def generate_key():
    return Fernet.generate_key()

def generate_fernet():
    return Fernet(current_app.config['ENCRYPTION_KEY'])

def encrypt_motto(motto):
    f = generate_fernet()
    return f.encrypt(motto.encode()).decode()

def decrypt_motto(encrypted_motto):
    f = generate_fernet()
    return f.decrypt(encrypted_motto.encode()).decode()

def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'secret123'
    app.config['JWT_SECRET_KEY'] = 'secret1234'
    app.config['ENCRYPTION_KEY'] = generate_key()

    app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
    app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'


    # Define and create UPLOAD_FOLDER
    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'uploads')
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    CORS(app, resources={r"*": {"origins": ["*"]}}, allow_headers=["Authorization", "Content-Type", "app-version"])

    celery.conf.update(app.config)
    celery.Task = celery_tasks.ContextTask
    
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    with app.app_context():
        db.create_all()
    
    def check_version(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            app_version = request.headers.get('app-version', '0.0.0')
            if Version(app_version) < MINIMUM_REQUIRED_VERSION:
                return jsonify({"message": "Please update your client application"}), 426
            return f(*args, **kwargs)
        return decorated_function

    @app.route('/')
    def index():
        return jsonify({'status': 200})
    
    @app.route('/register', methods=['POST'])
    @check_version
    def register():
        data = request.get_json()
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        encrypted_motto = encrypt_motto(data['motto'])
        new_user = User(username=data['username'], password=hashed_password, motto=encrypted_motto)
        db.session.add(new_user)
        db.session.commit()
        token = create_access_token(identity=new_user.id)
        return jsonify({'message': 'User registered successfully', 'token': token}), 201

    @app.route('/login', methods=['POST'])
    @check_version
    def login():
        data = request.get_json()
        user = User.query.filter_by(username=data['username']).first()
        if user and bcrypt.check_password_hash(user.password, data['password']):
            token = create_access_token(identity=user.id)
            return jsonify({'token': token}), 200
        return jsonify({'message': 'Invalid credentials'}), 401

    @app.route('/user', methods=['GET'])
    @jwt_required()
    @check_version
    def user():
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            app.logger.info(f"Authenticated user ID: {current_user_id}")
            
            user = User.query.get(current_user_id)
            if user:
                decrypted_motto = decrypt_motto(user.motto) if user.motto else None
                return jsonify({
                    'username': user.username,
                    'motto': decrypted_motto
                }), 200
            else:
                app.logger.error(f"No user found for ID: {current_user_id}")
                return jsonify({'message': 'User not found'}), 404
        except Exception as e:
            app.logger.error(f"Error in /user route: {str(e)}")
            return jsonify({'message': 'Authentication failed'}), 401

    @app.route('/upload', methods=['POST'])
    @jwt_required()
    @check_version
    def upload_audio():
        current_user_id = get_jwt_identity()
        
        try:
            user = User.query.get(current_user_id)
            if not user:
                return jsonify({'message': 'User not found'}), 404

            if 'audio' not in request.files:
                return jsonify({'message': 'No audio file provided'}), 400

            audio_file = request.files['audio']
            if audio_file.filename == '':
                return jsonify({'message': 'No audio file selected'}), 400

            if audio_file:
                filename = f"audio_{current_user_id}_{int(time.time())}.webm"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                audio_file.save(filepath)

                # Import the Celery task here to avoid circular imports
                from celery_tasks import process_audio
                # Start async transcription process
                task = process_audio.delay(filepath)

                return jsonify({'success': True, 'message': 'Audio uploaded and transcription started', 'task_id': task.id}), 202

            return jsonify({'message': 'Error processing audio file'}), 500
        
        except Exception as e:
            current_app.logger.error(f"Unexpected error in upload_audio: {str(e)}")
            return jsonify({'message': 'An unexpected error occurred'}), 500

    @app.route('/transcription_status/<task_id>', methods=['GET'])
    @jwt_required()
    def transcription_status(task_id):
        from celery_tasks import process_audio
        task = process_audio.AsyncResult(task_id)
        
        if task.state == 'PENDING':
            response = {
                'state': task.state,
                'status': 'Transcription is pending...'
            }
        elif task.state == 'PROCESSING':
            response = {
                'state': task.state,
                'status': 'Transcription is in progress...'
            }
        elif task.state == 'SUCCESS':
            response = {
                'state': task.state,
                'status': 'Transcription completed'
            }
            if task.result.get('result'):
                transcription = task.result['result']
                current_user_id = get_jwt_identity()
                try:
                    user = User.query.get(current_user_id)
                    if user:
                        user.motto = encrypt_motto(transcription)
                        db.session.commit()
                        response['message'] = 'Transcription completed and motto updated'
                        response['result'] = transcription
                    else:
                        response['message'] = 'User not found'
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Error updating user motto: {str(e)}")
                    response['message'] = 'Error updating user motto'
            else:
                response['message'] = 'Transcription result not found'
        elif task.state == 'FAILURE':
            response = {
                'state': task.state,
                'status': 'Transcription failed',
                'error': str(task.info.get('error', 'Unknown error occurred'))
            }
        else:
            response = {
                'state': task.state,
                'status': 'Unknown state',
                'error': 'Unexpected task state'
            }
        
        return jsonify(response)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(port=3002, debug=True)