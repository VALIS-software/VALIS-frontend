
from flask import Flask, abort, request
from flask_cors import CORS
import random
import json
import math


MOCK_DATA = json.loads(open("mockData.json", "r").read())
MOCK_ANNOTATIONS = json.loads(open("mockAnnotations.json", "r").read())

app = Flask(__name__)
CORS(app)

@app.route("/annotations")
def annotations():
	"""Return a list of all annotation_ids"""
	return json.dumps(MOCK_ANNOTATIONS.keys())

@app.route("/annotations/<string:annotation_id>")
def annotation(annotation_id):
	"""Return the annotation metadata"""
	if annotation_id in MOCK_ANNOTATIONS.keys():
		return json.dumps(MOCK_ANNOTATIONS[annotation_id])
	else:
		abort(404, "Annotation %s not found" % annotation_id)

@app.route("/genomes")
def genomes():
	"""Return a list of all genome_ids"""
	return json.dumps(MOCK_DATA.keys())

@app.route("/genomes/<string:genome_id>")
def tracks(genome_id):
	"""Return the track_id's and track metadata (type) for the given genome_id"""
	if genome_id in MOCK_DATA.keys():
		return json.dumps(MOCK_DATA[genome_id])
	else:
		abort(404, "Genome %s not found" % genome_id)

@app.route("/genomes/<string:genome_id>/<string:track_id>")
def track(genome_id, track_id):
	"""Return the track_id's and track metadata (type) for the given genome_id"""
	if genome_id in MOCK_DATA.keys():
		if track_id in MOCK_DATA[genome_id]:
			return json.dumps(MOCK_DATA[genome_id][track_id])
		else:
			abort(404, "Track %s is not in genome %s" % (track_id, genome_id))
	else:
		abort(404, "Genome %s not found" % genome_id)

@app.route("/genomes/<string:genome_id>/<string:track_id>/<int:start_bp>/<int:end_bp>")
def get_data(genome_id, track_id, start_bp, end_bp):
	"""Return the data for the given track and base pair range"""
	start_bp = int(start_bp)
	end_bp = int(end_bp)
	sampling_rate = 1
	if request.args.get('sampling_rate'):
		sampling_rate = int(request.args.get('sampling_rate'))

	if genome_id in MOCK_DATA:
		if  track_id in MOCK_DATA[genome_id]:
			track = MOCK_DATA[genome_id][track_id]

			if start_bp < track["startBp"] or start_bp > track["endBp"]:
				abort(500, "Request out of bounds")

			if end_bp < track["startBp"] or end_bp > track["endBp"]:
				abort(500, "Request out of bounds")

			if start_bp > end_bp:
				abort(500, "Start base pair must be less than end base pair")


			ret = []
			if track["type"] == "sequence":
				for i in xrange(0, int((end_bp - start_bp) / float(sampling_rate))):
					idx = i + start_bp
					ret.append(math.sin(idx)*0.5 + 0.5)
			else:
				abort(500, "Unknown track type : %s", track["type"])

			return json.dumps({
				"startBp" : start_bp,
				"endBp" : end_bp,
				"samplingRate": sampling_rate,
				"values": ret
			})
		else:
			abort(404, "Track %s is not in genome %s" % (track_id, genome_id))
	else:
		abort(404, "Genome %s not found" % genome_id)

if __name__ == '__main__':
	app.run(debug=True)
	