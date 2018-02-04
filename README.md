# VALIS

VALIS (Visualization & Analytics for Life Science) is a powerful genome visualizer written using modern web-technologies (React, ES6 and WebGL). 

### Dependencies
* Node + NPM (https://nodejs.org/en/)

### Install

```
git clone git@github.com:saliksyed/VALIS.git
cd VALIS
npm install
```
There is a test server located in the `tools` directory. The server requires the following libraries, which are installable using pip.
* [PyEnsembl](https://github.com/hammerlab/pyensembl)
* [Flask](http://flask.pocoo.org/)
* [Flask-Cors](http://flask-cors.readthedocs.io/en/latest/)

Note: Currently all sequence and DNase track just contain dummy data.

### Run
```
npm run dev
```

To start the sample data server:
```
cd tools
python server.py
```


