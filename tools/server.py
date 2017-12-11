
from flask import Flask, abort, request
from flask_cors import CORS
import random
import json
import math
from six.moves import range


MOCK_DATA = json.loads(open("mockData.json", "r").read())
MOCK_ANNOTATIONS = json.loads(open("mockAnnotations.json", "r").read())

app = Flask(__name__)
CORS(app)

@app.route("/annotations")
def annotations():
	return json.dumps(MOCK_ANNOTATIONS.keys())

@app.route("/annotations/<string:annotation_id>")
def annotation(annotation_id):
	"""Return the annotation metadata"""
	if annotation_id in MOCK_ANNOTATIONS:
		return json.dumps(MOCK_ANNOTATIONS[annotation_id])
	else:
		abort(404, "Annotation not found")

@app.route("/annotations/<string:annotation_ids>/<int:start_bp>/<int:end_bp>")
def get_annotation_data(annotation_ids, start_bp, end_bp):
	annotation_id = annotation_ids.split(",")[0] # mock server doesn't return multiple annotations!
	start_bp = int(start_bp)
	end_bp = int(end_bp)
	
	sampling_rate = 1
	if request.args.get('sampling_rate'):
		sampling_rate = int(float(request.args.get('sampling_rate')))

	track_height_px = 0
	if request.args.get('track_height_px'):
		track_height_px = int(float(request.args.get('track_height_px')))

	if  annotation_id in MOCK_ANNOTATIONS:
		annotation = MOCK_ANNOTATIONS[annotation_id]
		start_bp = max([start_bp, annotation["startBp"]])
		end_bp = min([end_bp, annotation["endBp"]])
		annotations = []
		# add random annotations, return ones that are > 20px @ curr sampling rate
		
		min_annotation_length = 1500
		max_annotation_length = 500000
		z = max_annotation_length - min_annotation_length
		for i in xrange(start_bp, end_bp, sampling_rate):
			color = [random.random()*0.5, random.random()*0.5, random.random()*0.5, 1.0]
			if random.random() > 0.2:
				continue
			sz = int(random.random()*z) + min_annotation_length
			if sz/float(sampling_rate) > 10:
				annotations.append({
					"id": random.randint(0,1000000000),
					# label format: text, True = render text inside, False= render outside?, position: 0-left, 1-top, 2-right, 3-below, offset-x, offset-y
					"labels" : [["GENE" + str(random.randint(0, 100000)), True, 0,0,0]],
					"startBp": int(i),
      				"endBp": int(i + sz),
      				"yOffsetPx": 0,
      				"heightPx": 25,
      				# segment format: startBp, endBp, textureName, [R,G,B,A], height
      				"segments": [[0, sz/3, None, color, 20], [sz/2, sz, None, color, 20], [0, sz, None, color, 4]]
				})
		# move overlaps that fit in track height, discard those that don't
		ret = []
		last = None
		padding = 1000/sampling_rate
		for annotation in annotations:
			if last == None or annotation["startBp"] > last["endBp"] + padding:
				ret.append(annotation)
				last = annotation
			elif last["yOffsetPx"] <= track_height_px - 26:
				annotation["yOffsetPx"] = last["yOffsetPx"] + 26
				ret.append(annotation)
				last = annotation
	else:
		abort(500, "Unknown track type : %s", track["type"])

	return json.dumps({
		"startBp" : start_bp,
		"endBp" : end_bp,
		"samplingRate": sampling_rate,
		"trackHeightPx": track_height_px,
		"annotationIds": annotation_ids,
		"values": ret
	})

@app.route("/tracks")
def tracks():
	"""Return a list of all track_ids"""
	return json.dumps(MOCK_DATA.keys())

@app.route("/tracks/<string:track_id>")
def track(track_id):
	"""Return the track metadata"""
	if track_id in MOCK_DATA:
		return json.dumps(MOCK_DATA[track_id])
	else:
		abort(404, "Track not found")

@app.route("/tracks/<string:track_id>/<int:start_bp>/<int:end_bp>")
def get_track_data(track_id, start_bp, end_bp):
	"""Return the data for the given track and base pair range"""
	start_bp = int(start_bp)
	end_bp = int(end_bp)
	sampling_rate = 1
	if request.args.get('sampling_rate'):
		sampling_rate = int(request.args.get('sampling_rate'))

	track_height_px = 0
	if request.args.get('track_height_px'):
		track_height_px = int(float(request.args.get('track_height_px')))

	if  track_id in MOCK_DATA:
		track = MOCK_DATA[track_id]
		start_bp = max([start_bp, track["startBp"]])
		end_bp = min([end_bp, track["endBp"]])
		ret = []
		if track["type"] == "sequence":
			num_samples = int((end_bp - start_bp) / float(sampling_rate))
			for i in range(0, num_samples):
				idx = i * sampling_rate + start_bp
				random.seed(str(idx)+track_id)
				ret.append(float(idx)/(track["endBp"] - track["startBp"])*0.5 + random.random()*0.5 )
		else:
			abort(500, "Unknown track type : %s", track["type"])

		return json.dumps({
			"startBp" : start_bp,
			"endBp" : end_bp,
			"samplingRate": sampling_rate,
			"trackHeightPx": track_height_px,
			"values": ret
		})
	else:
		abort(404, "Track not found")

if __name__ == '__main__':
	app.run(debug=True)
	