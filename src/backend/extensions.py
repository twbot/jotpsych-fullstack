from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from celery import Celery

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()
celery = Celery('tasks', broker='redis://localhost:6379/0', backend='redis://localhost:6379/0')