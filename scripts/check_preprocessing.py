"""Figure out which pixel scaling cropguard.tflite was trained with.

Downloads a small labelled sample of PlantVillage images (from the public
spMohanty/PlantVillage-Dataset GitHub mirror), runs the model with two
common preprocessing schemes, and reports accuracy for each.

Usage: python scripts/check_preprocessing.py <model.tflite> <class_labels.json>
"""
import json
import sys
import urllib.request

import numpy as np
import tensorflow as tf

MODEL, LABELS = sys.argv[1], sys.argv[2]
PER_CLASS = 5
CLASSES = [
    "Tomato___Late_blight", "Tomato___healthy", "Tomato___Early_blight",
    "Potato___Late_blight", "Potato___Early_blight",
    "Corn_(maize)___Common_rust_", "Corn_(maize)___Northern_Leaf_Blight",
    "Pepper,_bell___Bacterial_spot",
]
API = "https://api.github.com/repos/spMohanty/PlantVillage-Dataset/contents/raw/color/"
RAW = "https://raw.githubusercontent.com/spMohanty/PlantVillage-Dataset/master/raw/color/"

labels = json.load(open(LABELS))
idx_of = {v: int(k) for k, v in labels.items()}

interp = tf.lite.Interpreter(model_path=MODEL)
interp.allocate_tensors()
inp = interp.get_input_details()[0]
out = interp.get_output_details()[0]


def predict(arr):
    interp.set_tensor(inp["index"], arr[None].astype(np.float32))
    interp.invoke()
    return interp.get_tensor(out["index"])[0]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "cropguard-check"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


schemes = {
    "[0,1]  (x/255)": lambda a: a / 255.0,
    "[-1,1] (x/127.5-1)": lambda a: a / 127.5 - 1.0,
    "[0,255] raw": lambda a: a,
}
correct = {k: 0 for k in schemes}
conf = {k: [] for k in schemes}
total = 0

for cls in CLASSES:
    folder = urllib.request.quote(cls)
    listing = json.loads(get(API + folder))
    files = [f["name"] for f in listing if f["name"].lower().endswith((".jpg", ".jpeg", ".png"))][:PER_CLASS]
    for name in files:
        raw = get(RAW + folder + "/" + urllib.request.quote(name))
        img = tf.image.decode_image(raw, channels=3, expand_animations=False)
        arr = tf.image.resize(img, [224, 224]).numpy().astype(np.float32)
        total += 1
        for k, fn in schemes.items():
            p = predict(fn(arr))
            top = int(np.argmax(p))
            conf[k].append(float(p[top]))
            if top == idx_of[cls]:
                correct[k] += 1
    print(f"done {cls} ({len(files)} images)", flush=True)

print(f"\nRESULTS on {total} labelled PlantVillage images:")
for k in schemes:
    print(f"RESULT {k}: {correct[k]}/{total} = {100*correct[k]/total:.1f}%  mean top-1 confidence {100*np.mean(conf[k]):.1f}%")
