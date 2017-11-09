
from flask import Flask, abort
import random
import json


MOCK_DATA = json.loads(open("mockData.json", "r").read())

app = Flask(__name__)

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
	if genome_id in MOCK_DATA:
		if  track_id in MOCK_DATA[genome_id]:
			track = MOCK_DATA[genome_id][track_id]
			print "HELLO"
			if start_bp < track["start"] or start_bp > track["end"]:
				abort(500, "Request out of bounds")

			if end_bp < track["start"] or end_bp > track["end"]:
				abort(500, "Request out of bounds")

			if start_bp > end_bp:
				abort(500, "Start base pair must be less than end base pair")

			# generate random data using seed
			# TODO: improve this resemble real data a bit more
			random.seed(track["id"] + track["type"] + str(start_bp))
			ret = []
			print track["type"]
			if track["type"] == "rnaseq":
				for i in xrange(0, end_bp - start_bp):
					ret.append(random.random()*10.0)
			elif track["type"] == "methylation":
				for i in xrange(0, end_bp - start_bp):
					ret.append(random.random()*5.0 - 2.5)
			elif track["type"] == "sequence":
				for i in xrange(0, end_bp - start_bp):
					ret.append(random.randint(0,4))
			else:
				abort(500, "Unknown track type : %s", track["type"])

			return json.dumps(ret)
		else:
			abort(404, "Track %s is not in genome %s" % (track_id, genome_id))
	else:
		abort(404, "Genome %s not found" % genome_id)

if __name__ == '__main__':
	app.run(debug=True)
	