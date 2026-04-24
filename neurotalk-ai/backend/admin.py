from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from db import db
from bson.objectid import ObjectId
from datetime import datetime, timedelta, timezone

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    users_cursor = db.users.find({}, {'password': 0})
    users_list = []
    
    for u in users_cursor:
        uid_str = str(u['_id'])
        u['_id'] = uid_str
        
        # Aggregate prediction metrics
        preds = list(db.predictions.find({'user_id': ObjectId(uid_str)}).sort('timestamp', -1))
        
        u['total_predictions'] = len(preds)
        u['last_active'] = preds[0]['timestamp'].isoformat() if preds else None
        
        users_list.append(u)
        
    return jsonify(users_list), 200

@admin_bp.route('/predictions', methods=['GET'])
@jwt_required()
def get_predictions():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    # Pagination
    try:
        page = int(request.args.get('page', 1))
    except ValueError:
        page = 1
        
    per_page = 20
    skip = (page - 1) * per_page
    
    # Pre-fetch users mapping
    users = db.users.find({}, {'username': 1})
    user_map = {str(u['_id']): u.get('username', 'Unknown') for u in users}
    
    total_count = db.predictions.count_documents({})
    preds_cursor = db.predictions.find().sort('timestamp', -1).skip(skip).limit(per_page)
    
    predictions = []
    for p in preds_cursor:
        p['_id'] = str(p['_id'])
        uid_str = str(p.get('user_id'))
        p['user_id'] = uid_str
        p['username'] = user_map.get(uid_str, 'Unknown')
        p['timestamp'] = p['timestamp'].isoformat()
        predictions.append(p)
        
    return jsonify({
        'predictions': predictions,
        'total': total_count,
        'page': page,
        'per_page': per_page,
        'total_pages': (total_count + per_page - 1) // per_page
    }), 200

@admin_bp.route('/predictions/<id>', methods=['DELETE'])
@jwt_required()
def delete_prediction(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    try:
        obj_id = ObjectId(id)
    except Exception:
        return jsonify({'error': 'Invalid prediction ID format'}), 400
        
    result = db.predictions.delete_one({'_id': obj_id})
    if result.deleted_count == 1:
        return jsonify({'message': 'Prediction deleted successfully'}), 200
    else:
        return jsonify({'error': 'Prediction not found'}), 404

@admin_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    # 1. Global emotion distribution
    pipeline = [
        {"$group": {"_id": "$predicted_emotion", "count": {"$sum": 1}}}
    ]
    emotion_dist = list(db.predictions.aggregate(pipeline))
    emotion_dist_dict = {item['_id']: item['count'] for item in emotion_dist if item['_id']}
    
    # 2. 30 day trend
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    pipeline_trend = [
        {"$match": {"timestamp": {"$gte": thirty_days_ago}}},
        {"$project": {
            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}}
        }},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    trend_data = list(db.predictions.aggregate(pipeline_trend))
    
    # 3. Cognitive distortion frequency
    preds = db.predictions.find({"cognitive_distortions": {"$exists": True, "$ne": []}})
    distortion_counts = {}
    for p in preds:
        distortions = p.get('cognitive_distortions', [])
        for d in distortions:
            name = d.get('name')
            if name:
                distortion_counts[name] = distortion_counts.get(name, 0) + 1
                
    return jsonify({
        'emotion_distribution': emotion_dist_dict,
        'thirty_day_trend': trend_data,
        'distortion_frequency': distortion_counts
    }), 200

@admin_bp.route('/monitoring', methods=['GET'])
@jwt_required()
def get_monitoring():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    total_preds = db.predictions.count_documents({})
    
    pipeline_avg = [
        {"$group": {"_id": None, "avg_conf": {"$avg": "$confidence"}}}
    ]
    avg_result = list(db.predictions.aggregate(pipeline_avg))
    avg_conf = avg_result[0]['avg_conf'] if avg_result and 'avg_conf' in avg_result[0] else 0.0
    
    low_conf_cursor = db.predictions.find({"confidence": {"$lt": 0.55}}, {"text": 1, "predicted_emotion": 1, "confidence": 1, "timestamp": 1}).sort("confidence", 1)
    
    low_conf_preds = []
    for p in low_conf_cursor:
        p['_id'] = str(p['_id'])
        if 'timestamp' in p:
            p['timestamp'] = p['timestamp'].isoformat()
        low_conf_preds.append(p)
        
    return jsonify({
        'total_predictions': total_preds,
        'average_confidence': round(avg_conf, 4),
        'low_confidence_predictions': low_conf_preds
    }), 200
