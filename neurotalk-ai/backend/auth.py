from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timezone
from bson.objectid import ObjectId
from db import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = 'user'  # Always force 'user' on signup
    
    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400
        
    if db.users.find_one({'email': email}):
        return jsonify({'error': 'Email already registered'}), 400
        
    if db.users.find_one({'username': username}):
        return jsonify({'error': 'Username already taken'}), 400
        
    hashed_password = generate_password_hash(password)
    
    new_user = {
        'username': username,
        'email': email,
        'password': hashed_password,
        'role': role,
        'created_at': datetime.now(timezone.utc)
    }
    
    result = db.users.insert_one(new_user)
    
    return jsonify({
        'message': 'User registered successfully',
        'user_id': str(result.inserted_id)
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'user')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
        
    user = db.users.find_one({'email': email})
    
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
        
    db_role = user.get('role', 'user')
    if role != db_role:
        return jsonify({'error': 'Role mismatch. You cannot login as this role.'}), 403
        
    # Include role in the JWT additional claims
    additional_claims = {
        'role': user.get('role', 'user'),
        'username': user.get('username')
    }
    
    access_token = create_access_token(
        identity=str(user['_id']),
        additional_claims=additional_claims
    )
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {
            'id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'role': user.get('role', 'user')
        }
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(user_id)}, {'password': 0})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    user['_id'] = str(user['_id'])
    return jsonify(user), 200

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
        
    users_cursor = db.users.find({}, {'password': 0})
    users = []
    
    for user in users_cursor:
        user['_id'] = str(user['_id'])
        users.append(user)
        
    return jsonify(users), 200
