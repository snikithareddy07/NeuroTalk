from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from db import db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/data', methods=['GET'])
@jwt_required()
def get_admin_data():
    # Only allow verified admin roles
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
        
    # Fetch all users
    users_cursor = db.users.find({}, {'password': 0})
    users = []
    user_map = {}
    
    for u in users_cursor:
        uid = str(u['_id'])
        u['_id'] = uid
        user_map[uid] = u['username']
        users.append(u)
        
    # Fetch all predictions
    preds_cursor = db.predictions.find().sort('timestamp', 1)
    predictions = []
    
    for p in preds_cursor:
        p['_id'] = str(p['_id'])
        if p.get('user_id'):
            p['user_id'] = str(p['user_id'])
            # Attach username to prediction for easier mapping on frontend
            p['username'] = user_map.get(p['user_id'], 'Unknown')
        predictions.append(p)
        
    return jsonify({
        'users': users,
        'predictions': predictions
    }), 200
