from pyensembl import EnsemblRelease
from flask import Flask, abort, request
from flask_cors import CORS
import genomedata
import random
import json
import numpy as np
import math
from six.moves import range


CHROMOSOME_SIZES = [
	248956422, 
	242193529, 
	198295559, 
	190214555, 
	181538259, 
	170805979,
	159345973,
	145138636,
	138394717,
	133797422,
	135086622,
	133275309,
	114364328,
	107043718,
	101991189,
	90338345,
	83257441,
	80373285,
	58617616,
	64444167,
	46709983,
	50818468,
	156040895,
	57227415
]

def chromosome_range(chr_str):
	idx = chromosome_to_idx(chr_str)
	if idx == 0:
		return [0, CHROMOSOME_SIZES[0]]
	else:
		start = sum(CHROMOSOME_SIZES[0:idx])
		end = start + CHROMOSOME_SIZES[idx]
		return [start, end]

def idx_to_chromosome(idx):
	if idx <= 21:
		return str(idx + 1)
	elif idx == 22:
		return "X"
	elif idx == 23: 
		return "Y"

def chromosome_to_idx(chr_str):
	if chr_str == "X":
		return 22
	elif chr_str == "Y":
		return 23
	else:
		return int(chr_str) - 1

def find_chromosome(bp):
	curr = 0
	idx = None
	for ch, sz in enumerate(CHROMOSOME_SIZES):
		curr += sz
		if curr >= bp:
			idx = ch
			break
	if idx != None:
		return idx_to_chromosome(idx)

# release 76 uses human reference genome GRCh38
ENSEMBL_DATA = EnsemblRelease(76)

def getMockAnnotations():
	return json.loads(open("mockAnnotations.json", "r").read())

def getMockData():
	return json.loads(open("mockData.json", "r").read())

app = Flask(__name__)
CORS(app)

@app.route("/graphs")
def graphs():
	return json.dumps(["ld_score"])

@app.route("/graphs/<string:graph_id>/<string:annotation_id1>/<string:annotation_id2>/<int:start_bp>/<int:end_bp>")
def graph(graph_id, annotation_id1, annotation_id2, start_bp, end_bp):
	start_bp = int(start_bp)
	end_bp = int(end_bp)
	
	sampling_rate = 1
	if request.args.get('sampling_rate'):
		sampling_rate = int(float(request.args.get('sampling_rate')))

	if graph_id != "ld_score":
		abort(500, "Unknown graph : %s", graph_id)

	if annotation_id1 != "cross-track-test-1" or annotation_id2 != "cross-track-test-2":
		abort(500, "no graph available")

	# send edge scores
	set1 = []
	set2 = []
	if sampling_rate < 50000:
		count = 0
		for i in xrange(0, 3000000000, 10000000):
			if i >= start_bp and i <= end_bp:
				annotation_name = "X%d" % count
				random.seed(annotation_name)
				set1.append(random.randint(0,1000000000))
			count += 1
		count = 0
		for i in xrange(0, 3000000000, 50000000):
			if i >= start_bp and i <= end_bp:
				annotation_name = "Y%d" % count
				random.seed(annotation_name)
				set2.append(random.randint(0,1000000000))
			count += 1

	edges = []
	for e1 in set1:
		for e2 in set2:
			random.seed("%d|%d" % (e1,e2))
			edges.append([e1, e2, random.random()])
	return json.dumps({
		"startBp" : start_bp,
		"endBp" : end_bp,
		"samplingRate": sampling_rate,
		"graphId": graph_id,
		"annotationIds": [annotation_id1, annotation_id2],
		"values": edges
	})

@app.route("/annotations")
def annotations():
	MOCK_ANNOTATIONS = getMockAnnotations()
	return json.dumps(MOCK_ANNOTATIONS.keys())

@app.route("/annotations/<string:annotation_id>")
def annotation(annotation_id):
	MOCK_ANNOTATIONS = getMockAnnotations()
	"""Return the annotation metadata"""
	if annotation_id in MOCK_ANNOTATIONS:
		return json.dumps(MOCK_ANNOTATIONS[annotation_id])
	else:
		abort(404, "Annotation not found")

@app.route("/annotations/<string:annotation_ids>/<int:start_bp>/<int:end_bp>")
def get_annotation_data(annotation_ids, start_bp, end_bp):
	MOCK_DATA = getMockData()
	MOCK_ANNOTATIONS = getMockAnnotations()
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
		annotation_results = []
		ANNOTATION_HEIGHT_PX = 25
		if annotation_id == "GRCh38_genes":
			# get chromosomes in range
			cStart = chromosome_to_idx(find_chromosome(start_bp))
			cEnd = chromosome_to_idx(find_chromosome(end_bp))
			last_gene_start = None
			gene_count = 0
			for ch_idx in xrange(cStart, cEnd + 1):
				ch = idx_to_chromosome(ch_idx)
				ch_range = chromosome_range(ch)
				for gene in ENSEMBL_DATA.genes(ch):
					name = gene.gene_name
					start = ch_range[0] + gene.start
					end = ch_range[0] + gene.end
					sz = end - start
					if sz/float(sampling_rate) > 20:
						annotation_results.append((name, start, end))

		count = 0
		if annotation_id == "cross-track-test-1":
			for i in xrange(0, 3000000000, 10000000):
				if i >= start_bp and i <= end_bp:
					annotation_results.append(("X%d" % count, i, i + 1000000))
				count += 1

		if annotation_id == "cross-track-test-2":
			for i in xrange(0, 3000000000, 50000000):
				if i >= start_bp and i <= end_bp:
					annotation_results.append(("Y%d" % count, i, i + 1000000))
				count += 1

		annotations = []
		for annotation_name, annotation_start, annotation_end in annotation_results:
			random.seed(annotation_name)
			color = [random.random()*0.5, random.random()*0.5, random.random()*0.5, 1.0]
			random.seed(annotation_name)
			annotations.append({
				"id": random.randint(0,1000000000),
				# label format: text, True = render text inside, False= render outside?, position: 0-left, 1-top, 2-right, 3-below, offset-x, offset-y
				"labels" : [[annotation_name, True, 0,0,0]],
				"startBp": annotation_start,
  				"endBp": annotation_end,
  				"yOffsetPx": 0,
  				"heightPx": ANNOTATION_HEIGHT_PX,
  				# segment format: startBp, endBp, textureName, [R,G,B,A], height
  				"segments": [[0, annotation_end - annotation_start, None, color, 20]]
			})
		# move overlaps that fit in track height, discard those that don't
		ret = []
		last = None
		padding = 20/sampling_rate
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
	MOCK_DATA = getMockData()
	return json.dumps(MOCK_DATA.keys())

@app.route("/tracks/<string:track_id>")
def track(track_id):
	MOCK_DATA = getMockData()
	"""Return the track metadata"""
	if track_id in MOCK_DATA:
		return json.dumps(MOCK_DATA[track_id])
	else:
		abort(404, "Track not found")

@app.route("/tracks/<string:track_id>/<int:start_bp>/<int:end_bp>")
def get_track_data(track_id, start_bp, end_bp):
	MOCK_DATA = getMockData()
	"""Return the data for the given track and base pair range"""
	start_bp = int(start_bp)
	end_bp = int(end_bp)
	sampling_rate = 1
	aggregations = ['none']
	track_data_type = 'signal'
	if request.args.get('sampling_rate'):
		sampling_rate = int(request.args.get('sampling_rate'))

	if request.args.get('aggregations'):
		aggregations = request.args.get('aggregations').split(',')
		if len(aggregations) == 0:
			aggregations = ['none']
	track_height_px = 0
	if request.args.get('track_height_px'):
		track_height_px = int(float(request.args.get('track_height_px')))

	if  track_id in MOCK_DATA:
		track = MOCK_DATA[track_id]
		start_bp = max([start_bp, track["startBp"]])
		end_bp = min([end_bp, track["endBp"]])
		ret = []
		
		data_key = track_id
		num_samples = int((end_bp - start_bp) / float(sampling_rate))
		dimensions = aggregations
		for i in range(0, num_samples):
			idx = i * sampling_rate + start_bp
			chrom = 'chr' + find_chromosome(idx)
			if chrom != 'chr1':
				d = 0.0
				if data_key == 'sequence':
					track_data_type = 'gbands'
					ret.append(0.0)
					curr = find_chromosome(idx)
					ret.append(chromosome_to_idx(curr))
					chr_range = chromosome_range(curr)
					ret.append(float(idx - chr_range[0]) / (chr_range[1] - chr_range[0]))
				else:
					for aggregation in aggregations:
						ret.append(float(d))
			else:
				if aggregations[0] == 'none':
					# just sample linearly
					if data_key == 'sequence':
						if sampling_rate == 1:
							track_data_type = 'basepairs'
							d = genomedata.get(data_key, chrom, idx, idx + 1)
							if float(d[0]) > 0.0 :
								ret.append(0.0)
							elif float(d[1]) > 0.0:
								ret.append(0.25)
							elif float(d[2]) > 0.0:
								ret.append(0.5)
							elif float(d[3]) > 0.0:
								ret.append(0.75)
						else:
							track_data_type = 'gbands'
							# TODO: should be computing g-band here
							ret.append(random.random())
						curr = find_chromosome(idx)
						ret.append(chromosome_to_idx(curr))
						chr_range = chromosome_range(curr)
						ret.append(float(idx - chr_range[0]) / (chr_range[1] - chr_range[0]))
					else:
						ret.append(float(genomedata.get(data_key, chrom, idx, idx + 1)[0]))
				else:

					d = float(genomedata.get(data_key, chrom, idx, idx + 1)[0])
					for aggregation in aggregations:
						if aggregation == 'max':
							ret.append(d*2.0)
						elif aggregation == 'mean':
							ret.append(d)
						elif aggregation == 'min':
							ret.append(d * 0.8)
						elif aggregation == 'median':
							ret.append(d * 1.5)
		
		if track_data_type == 'basepairs':
			dimensions = ['symbol', 'chromsome_index', 'chromosome_location']

		if track_data_type == 'gbands':
			dimensions = ['gvalue', 'chromsome_index', 'chromosome_location']

		return json.dumps({
			"startBp" : start_bp,
			"endBp" : end_bp,
			"samplingRate": sampling_rate,
			"numSamples": num_samples,
			"trackHeightPx": track_height_px,
			"values": ret,
			"dimensions": dimensions,
			"dataType": track_data_type
		})
	else:
		abort(404, "Track not found")

if __name__ == '__main__':
	app.run(debug=True)
	