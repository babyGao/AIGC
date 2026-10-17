import cv2, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__)); from manga import *
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1]
tests = [('BV1zLNd6ME7B', 12.0), ('BV1zLNd6ME7B', 39.5), ('BV1PGp26cExn', 11.0), ('BV1zLNd6ME7B', 215.0), ('BV1zLNd6ME7B', 310.0), ('BV1PGp26cExn', 2.5)]
for v, t in tests:
    cap = cv2.VideoCapture(os.path.join(ROOT, 'sucai/videos', v + '.mp4')); cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000); ok, f = cap.read()
    f = cv2.resize(f, (1920, int(f.shape[0] * 1920 / f.shape[1])), interpolation=cv2.INTER_CUBIC)
    ink = manga(f); o = to_paper(ink)
    o = spot(f, o, 125, 160, sat_min=80, val_min=90)
    cv2.imwrite(os.path.join(out, f'st_{v}_{t}.jpg'), np.vstack([cv2.resize(f, (960, f.shape[0] // 2)), cv2.resize(o, (960, f.shape[0] // 2))]), [cv2.IMWRITE_JPEG_QUALITY, 88])
    cv2.imwrite(os.path.join(out, f'full_{v}_{t}.jpg'), o, [cv2.IMWRITE_JPEG_QUALITY, 90])
