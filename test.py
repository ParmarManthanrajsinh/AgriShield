import urllib.request
import json

url = 'http://localhost:3000/api/proxy/farms'
data = json.dumps({"name": "Test Farm"}).encode('utf-8')
headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer testtoken'}

req = urllib.request.Request(url, data=data, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print(response.status)
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
