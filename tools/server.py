
from flask import Flask, abort, request
from flask_cors import CORS
import random
import json
import math


MOCK_DATA = json.loads(open("mockData.json", "r").read())

app = Flask(__name__)
CORS(app)

@app.route("/tracks")
def tracks():
	"""Return a list of all genome_ids"""
	return json.dumps(MOCK_DATA.keys())

@app.route("/tracks/<string:track_id>")
def track(track_id):
	"""Return the track_id's and track metadata"""
	if track_id in MOCK_DATA:
		return json.dumps(MOCK_DATA[track_id])
	else:
		abort(404, "Track not found")

@app.route("/tracks/<string:track_id>/<int:start_bp>/<int:end_bp>")
def get_data(track_id, start_bp, end_bp):
	"""Return the data for the given track and base pair range"""
	start_bp = int(start_bp)
	end_bp = int(end_bp)
	sampling_rate = 1
	if request.args.get('sampling_rate'):
		sampling_rate = int(request.args.get('sampling_rate'))
	if  track_id in MOCK_DATA:
		track = MOCK_DATA[track_id]

		start_bp = max([start_bp, track["startBp"]])
		end_bp = min([end_bp, track["endBp"]])
		ret = []
		if track["type"] == "sequence":
			num_samples = int((end_bp - start_bp) / float(sampling_rate))
			for i in xrange(0, num_samples):
				idx = i * sampling_rate + start_bp
				random.seed(str(idx)+track_id)
				ret.append(float(idx)/(track["endBp"] - track["startBp"])*0.5 + random.random()*0.5 )
		else:
			abort(500, "Unknown track type : %s", track["type"])

		return json.dumps({
			"startBp" : start_bp,
			"endBp" : end_bp,
			"samplingRate": sampling_rate,
			"values": ret
		})
	else:
		abort(404, "Track not found")

if __name__ == '__main__':
	app.run(debug=True)
	