"""Generate the deterministic DDB Lite Try-On compositor model.

This is a deliberately small, static-shape ONNX graph. Product placement and
privacy-sensitive image preparation happen on the device; the graph performs
the final alpha blend through the selected execution provider.
"""

from pathlib import Path

import onnx
from onnx import TensorProto, helper


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "ai" / "tryon" / "ddb-lite-tryon-compositor-v2.onnx"


def scalar(name: str, value: float):
    return helper.make_tensor(name, TensorProto.FLOAT, [], [value])


def main() -> None:
    shape = [1, 3, 256, 256]
    alpha_shape = [1, 1, 256, 256]
    graph = helper.make_graph(
        [
            helper.make_node("Constant", [], ["one"], value=scalar("one_value", 1.0)),
            helper.make_node("Sub", ["one", "alpha"], ["inverse_alpha"]),
            helper.make_node("Mul", ["pet_rgb", "inverse_alpha"], ["pet_layer"]),
            helper.make_node("Mul", ["product_rgb", "alpha"], ["product_layer"]),
            helper.make_node("Add", ["pet_layer", "product_layer"], ["blended"]),
            helper.make_node("Constant", [], ["zero"], value=scalar("zero_value", 0.0)),
            helper.make_node("Clip", ["blended", "zero", "one"], ["result_rgb"]),
        ],
        "ddb-lite-tryon-compositor-v2",
        [
            helper.make_tensor_value_info("pet_rgb", TensorProto.FLOAT, shape),
            helper.make_tensor_value_info("product_rgb", TensorProto.FLOAT, shape),
            helper.make_tensor_value_info("alpha", TensorProto.FLOAT, alpha_shape),
        ],
        [helper.make_tensor_value_info("result_rgb", TensorProto.FLOAT, shape)],
    )
    model = helper.make_model(
        graph,
        producer_name="DaengDaBang",
        producer_version="2.0.0",
        opset_imports=[helper.make_opsetid("", 13)],
    )
    model.ir_version = 8
    model.doc_string = (
        "DDB Lite Try-On compositor. All inputs are prepared locally and no "
        "customer image is embedded in this model."
    )
    onnx.checker.check_model(model)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    onnx.save_model(model, OUTPUT)
    print(f"generated {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
