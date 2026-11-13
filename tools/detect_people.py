"""One-off: find people in the illustrative CCTV stills so the live view can draw tracking boxes on them.
Runs YOLOv4-tiny (OpenCV DNN, COCO 'person') tiled over each still; writes src/assets/cctv/people.json
as {key: [[x, y, w, h, conf], ...]} in 0..1 image fractions. Needs: pip install opencv-python, models/ (see README line below).
Models: github.com/AlexeyAB/darknet releases yolov4-tiny.weights + cfg/yolov4-tiny.cfg -> tools/models/"""
import json, sys
from pathlib import Path
import cv2, numpy as np
ROOT = Path(__file__).resolve().parent.parent; SRC = ROOT / 'src'; sys.path.insert(0, str(SRC))
from cctv_photos import tiles
M = Path(__file__).parent / 'models'
net = cv2.dnn.readNetFromDarknet(str(M / 'yolov4-tiny.cfg'), str(M / 'yolov4-tiny.weights'))
model = cv2.dnn_DetectionModel(net); model.setInputParams(size=(416, 416), scale=1 / 255, swapRB=True)

def detect(pil):
    im = cv2.cvtColor(np.array(pil.convert('RGB')), cv2.COLOR_RGB2BGR); H, W = im.shape[:2]
    im = cv2.resize(im, (W * 2, H * 2), interpolation=cv2.INTER_CUBIC); h2, w2 = im.shape[:2]
    boxes, confs = [], []
    t = 416  # whole image + overlapping 416px tiles at 2x, so small figures are found
    views = [(0, 0, w2, h2)] + [(x, y, min(t, w2 - x), min(t, h2 - y)) for y in range(0, max(1, h2 - t // 2), t * 2 // 3) for x in range(0, max(1, w2 - t // 2), t * 2 // 3)]
    for x0, y0, w, h in views:
        cls, cf, bx = model.detect(im[y0:y0 + h, x0:x0 + w], confThreshold=.3, nmsThreshold=.4)
        for c, p, (x, y, bw, bh) in zip(np.array(cls).flatten(), np.array(cf).flatten(), bx):
            if c == 0 and bw * bh > 120: boxes.append([int(x + x0), int(y + y0), int(bw), int(bh)]); confs.append(float(p))
    keep = list(np.array(cv2.dnn.NMSBoxes(boxes, confs, .35, .45)).flatten()) if boxes else []
    keep.sort(key=lambda i: -confs[i]); kept = []
    for i in keep:  # drop a box that mostly overlaps one already kept (tile/whole-image duplicates of one person)
        x, y, w, h = boxes[i]
        if all(max(0, min(x + w, X + Wd) - max(x, X)) * max(0, min(y + h, Y + Hd) - max(y, Y)) < .55 * min(w * h, Wd * Hd) for X, Y, Wd, Hd in (boxes[j] for j in kept)): kept.append(i)
    keep = kept
    return [[round(boxes[i][0] / w2, 4), round(boxes[i][1] / h2, 4), round(boxes[i][2] / w2, 4), round(boxes[i][3] / h2, 4), round(confs[i], 2)]
            for i in keep if boxes[i][2] / w2 < .5 and boxes[i][3] / h2 < .95]

out = {}
for k, v in tiles(SRC / 'assets' / 'cctv').items():
    out[k] = detect(v)
    print(k, len(out[k]))
(SRC / 'assets' / 'cctv' / 'people.json').write_text(json.dumps(out, separators=(',', ':')))
