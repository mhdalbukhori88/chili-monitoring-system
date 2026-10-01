import urllib.request
import urllib.parse
import json

def test():
    # 1. Login
    data = urllib.parse.urlencode({'username': 'admin', 'password': 'admin123'}).encode()
    req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=data)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        token = res['access_token']
    print("1. Login Success! Access Token obtained.")

    headers = {'Authorization': f'Bearer {token}'}

    # 2. Plants
    req = urllib.request.Request('http://127.0.0.1:8000/plants/', headers=headers)
    with urllib.request.urlopen(req) as resp:
        plants = json.loads(resp.read().decode())
    print(f"2. Plants List: {len(plants)} plant(s) found -> {plants[0]['name']}")

    # 3. Growth
    req = urllib.request.Request('http://127.0.0.1:8000/growth/1', headers=headers)
    with urllib.request.urlopen(req) as resp:
        growth = json.loads(resp.read().decode())
    print(f"3. Growth Records: {len(growth)} record(s) found.")

    # 4. Predictions (LSTM)
    pred_body = json.dumps({'horizon_days': 5}).encode()
    req = urllib.request.Request(
        'http://127.0.0.1:8000/predictions/1',
        data=pred_body,
        headers={**headers, 'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        preds = json.loads(resp.read().decode())
    print(f"4. LSTM Prediction: Generated {len(preds)} forecast days.")
    for i, p in enumerate(preds):
        print(f"   Day +{i+1}: Height={p['predicted_height_cm']}cm, Leaves={p['predicted_leaf_count']}, Fruits={p['predicted_fruit_count']}")

    # 5. Sensors
    req = urllib.request.Request('http://127.0.0.1:8000/sensors/1', headers=headers)
    with urllib.request.urlopen(req) as resp:
        sensors = json.loads(resp.read().decode())
    print(f"5. Sensors: {len(sensors)} sensor reading(s) found.")

    # 6. Alerts
    req = urllib.request.Request('http://127.0.0.1:8000/alerts/1', headers=headers)
    with urllib.request.urlopen(req) as resp:
        alerts = json.loads(resp.read().decode())
    print(f"6. Alerts: {len(alerts)} alert(s) found -> [{alerts[0]['severity']}] {alerts[0]['message']}")

    # 7. Dashboard
    req = urllib.request.Request('http://127.0.0.1:8000/dashboard/', headers=headers)
    with urllib.request.urlopen(req) as resp:
        stats = json.loads(resp.read().decode())
    print(f"7. Dashboard Stats: {stats}")

    # 8. Chat
    chat_body = json.dumps({'message': 'Berapa suhu ideal untuk cabai rawit?'}).encode()
    req = urllib.request.Request(
        'http://127.0.0.1:8000/chat/',
        data=chat_body,
        headers={**headers, 'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        chat_res = json.loads(resp.read().decode())
    print(f"8. Chat Response: {chat_res['reply']}")

    print("\n>>> ALL API ENDPOINTS VERIFIED & WORKING PERFECTLY! <<<")

if __name__ == "__main__":
    test()
