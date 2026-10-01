import urllib.request
import urllib.parse
import json

BASE = "http://127.0.0.1:8000"

def run_tests():
    print("=== STARTING FULL END-TO-END SYSTEM TEST ===")

    # 1. Login
    data = urllib.parse.urlencode({'username': 'admin', 'password': 'admin123'}).encode()
    req = urllib.request.Request(f"{BASE}/auth/login", data=data)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        token = res['access_token']
    print("✓ 1. Auth Login: OK (JWT Token obtained)")

    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    # 2. Get and Update Profile
    req = urllib.request.Request(f"{BASE}/auth/me", headers=headers)
    with urllib.request.urlopen(req) as resp:
        me = json.loads(resp.read().decode())
    print(f"✓ 2. Current User: OK (username={me['username']}, full_name={me['full_name']})")

    update_body = json.dumps({'full_name': 'Petani Cabai Cerdas'}).encode()
    req = urllib.request.Request(f"{BASE}/auth/me", data=update_body, headers=headers, method="PUT")
    with urllib.request.urlopen(req) as resp:
        updated_me = json.loads(resp.read().decode())
    assert updated_me['full_name'] == 'Petani Cabai Cerdas'
    print("✓ 3. Update Profile (PUT /auth/me): OK")

    # 3. Plants CRUD
    req = urllib.request.Request(f"{BASE}/plants/", headers=headers)
    with urllib.request.urlopen(req) as resp:
        plants = json.loads(resp.read().decode())
    print(f"✓ 4. List Plants: OK ({len(plants)} plants found)")

    # Create temporary plant
    new_plant_body = json.dumps({
        'name': 'Cabai Uji Sistem #99',
        'variety': 'Rawit Merah Super',
        'location': 'Greenhouse Test'
    }).encode()
    req = urllib.request.Request(f"{BASE}/plants/", data=new_plant_body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        new_plant = json.loads(resp.read().decode())
    test_plant_id = new_plant['id']
    print(f"✓ 5. Create Plant: OK (id={test_plant_id})")

    # 4. Add Growth Record
    growth_body = json.dumps({
        'height_cm': 25.5,
        'leaf_count': 30,
        'fruit_count': 5,
        'avg_temperature_c': 28.0,
        'avg_humidity_pct': 70.0,
        'avg_soil_moisture_pct': 65.0
    }).encode()
    req = urllib.request.Request(f"{BASE}/growth/{test_plant_id}", data=growth_body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        growth_rec = json.loads(resp.read().decode())
    print(f"✓ 6. Add Growth Record: OK (id={growth_rec['id']}, height={growth_rec['height_cm']}cm)")

    # 5. Run LSTM Prediction
    pred_body = json.dumps({'horizon_days': 7}).encode()
    req = urllib.request.Request(f"{BASE}/predictions/{test_plant_id}", data=pred_body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        preds = json.loads(resp.read().decode())
    assert len(preds) == 7
    print(f"✓ 7. Run LSTM Prediction (7 days): OK ({len(preds)} forecast days generated)")

    # 6. Add and Delete Sensor Reading
    sensor_body = json.dumps({
        'plant_id': test_plant_id,
        'temperature_c': 29.2,
        'humidity_pct': 72.0,
        'soil_moisture_pct': 64.0,
        'soil_ph': 6.5,
        'light_lux': 21000.0
    }).encode()
    req = urllib.request.Request(f"{BASE}/sensors/", data=sensor_body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        s_reading = json.loads(resp.read().decode())
    s_id = s_reading['id']
    print(f"✓ 8. Add Sensor Reading: OK (id={s_id}, temp={s_reading['temperature_c']}°C)")

    # Delete sensor reading
    req = urllib.request.Request(f"{BASE}/sensors/reading/{s_id}", headers=headers, method="DELETE")
    with urllib.request.urlopen(req) as resp:
        del_resp = json.loads(resp.read().decode())
    assert del_resp['status'] == 'ok'
    print("✓ 9. Delete Sensor Reading: OK")

    # 7. Alerts system
    req = urllib.request.Request(f"{BASE}/alerts/", headers=headers)
    with urllib.request.urlopen(req) as resp:
        all_alerts = json.loads(resp.read().decode())
    print(f"✓ 10. List Alerts: OK ({len(all_alerts)} alerts found)")

    # Resolve all alerts
    req = urllib.request.Request(f"{BASE}/alerts/resolve-all", data=b'{}', headers=headers)
    with urllib.request.urlopen(req) as resp:
        res_all = json.loads(resp.read().decode())
    print(f"✓ 11. Resolve All Alerts: OK ({res_all['resolved_count']} resolved)")

    # 8. AI Agronomy Chat Assistant & History
    chat_body = json.dumps({
        'message': 'Berapa dosis pupuk NPK untuk tanaman cabai umur 30 hari?',
        'plant_id': test_plant_id
    }).encode()
    req = urllib.request.Request(f"{BASE}/chat/", data=chat_body, headers=headers)
    with urllib.request.urlopen(req) as resp:
        chat_resp = json.loads(resp.read().decode())
    assert len(chat_resp['reply']) > 20
    print("✓ 12. AI Agronomy Chat: OK (Reply received)")

    req = urllib.request.Request(f"{BASE}/chat/", headers=headers)
    with urllib.request.urlopen(req) as resp:
        chat_hist = json.loads(resp.read().decode())
    assert len(chat_hist) >= 2
    print(f"✓ 13. Chat History: OK ({len(chat_hist)} messages in history)")

    # 9. Clean up temporary plant
    req = urllib.request.Request(f"{BASE}/plants/{test_plant_id}", headers=headers, method="DELETE")
    with urllib.request.urlopen(req) as resp:
        del_plant_resp = json.loads(resp.read().decode())
    assert del_plant_resp['status'] == 'ok'
    print("✓ 14. Clean Up Test Plant: OK")

    # 10. Health Check
    req = urllib.request.Request(f"{BASE}/health")
    with urllib.request.urlopen(req) as resp:
        health = json.loads(resp.read().decode())
    assert health['status'] == 'healthy'
    assert health['cnn_model_ready'] is True
    assert health['lstm_model_ready'] is True
    print(f"✓ 15. System Health Check: OK ({health['status']}, CNN={health['cnn_model_ready']}, LSTM={health['lstm_model_ready']})")

    print("\n🎉 ALL 15 CRITICAL BACKEND & ML WORKFLOWS VERIFIED 100% PERFECTLY! 🎉")

if __name__ == "__main__":
    run_tests()
