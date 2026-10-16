"""Download a few labelled PlantVillage leaf photos for testing the Scanner.
Saves to scripts/samples/<Class>__<n>.jpg
"""
import json
import os
import urllib.request

API = "https://api.github.com/repos/spMohanty/PlantVillage-Dataset/contents/raw/color/"
RAW = "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/"
CLASSES = ["Tomato___Late_blight", "Tomato___healthy", "Potato___Early_blight", "Corn_(maize)___Common_rust_"]
OUT = os.path.join(os.path.dirname(__file__), "samples")
os.makedirs(OUT, exist_ok=True)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "cropguard-samples"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


for cls in CLASSES:
    folder = urllib.request.quote(cls)
    files = [f["name"] for f in json.loads(get(API + folder)) if f["name"].lower().endswith((".jpg", ".jpeg"))]
    # skip the first few (used by check_preprocessing.py) to vary the test set
    for n, name in enumerate(files[10:12], 1):
        safe = cls.replace("(", "").replace(")", "").replace(",", "")
        path = os.path.join(OUT, f"{safe}__{n}.jpg")
        with open(path, "wb") as fh:
            fh.write(get(RAW + folder + "/" + urllib.request.quote(name)))
        print("saved", path)
