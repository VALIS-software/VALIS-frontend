# VALIS

VALIS (Visualization & Analytics for Life Science) is a powerful genome visualizer written using modern web-technologies (React, ES6 and WebGL). 

### Dependencies
* Node + NPM (https://nodejs.org/en/)

### Install

```
git clone git@github.com:saliksyed/WebGLGenomeBrowser.git
cd WebGLGenomeBrowser
npm install
```
There is a test server located in the `tools` directory. The server requires the following libraries, which are installable using pip.
* [PyEnsembl](https://github.com/hammerlab/pyensembl)
* [Flask](http://flask.pocoo.org/)
* [Flask-Cors](http://flask-cors.readthedocs.io/en/latest/)
* [bcolz](http://bcolz.blosc.org/en/latest/)

You also need [gsutil](https://cloud.google.com/storage/docs/gsutil) for accessing data located on Google Cloud.

### Download Sample Data
* `pyensembl install --release 76 --species human`
* `gsutil -m cp -r gs://elastic-genomics/dev-data/elastic-genome-data ~/data/`


### Run
```
npm run dev
```

To start the sample data server:
```
cd tools
python server.py
```


