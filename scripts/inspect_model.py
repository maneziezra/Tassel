"""Inspect cropguard.tflite: input/output shapes, dtypes, quantization, first ops.
Usage: python scripts/inspect_model.py path/to/cropguard.tflite
"""
import sys
import numpy as np
import tensorflow as tf

path = sys.argv[1]
interp = tf.lite.Interpreter(model_path=path)
interp.allocate_tensors()

for d in interp.get_input_details():
    print("INPUT ", d["name"], d["shape"].tolist(), d["dtype"].__name__, "quant:", d["quantization"])
for d in interp.get_output_details():
    print("OUTPUT", d["name"], d["shape"].tolist(), d["dtype"].__name__, "quant:", d["quantization"])

ops = interp._get_ops_details()
print("NUM_OPS", len(ops))
print("FIRST_OPS", [o["op_name"] for o in ops[:8]])
print("LAST_OPS", [o["op_name"] for o in ops[-4:]])

# Does the output already sum to 1 (softmax inside the model)?
inp = interp.get_input_details()[0]
x = np.random.rand(*inp["shape"]).astype(inp["dtype"])
interp.set_tensor(inp["index"], x)
interp.invoke()
y = interp.get_tensor(interp.get_output_details()[0]["index"])
print("OUTPUT_SUM", float(np.sum(y)), "MAX", float(np.max(y)))
