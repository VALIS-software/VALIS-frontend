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

### Dev
There are two ways to run the webpack-dev-server, which will be launched at localhost:8080
1. Run the frontend that connects to a local backend server at localhost:5000:
```
npm run dev
```
Note*: A simple backend server can be found in the tools/ folder, to start run (from repo root):
```
make mock-api
```
Visit the SIRIUS-backend repository for getting the fully functional backend server.

2. Run the frontend that connects to a remote backend server.
```
npm run dev-remote
```
The IP address of remote server is specified in `package.json`

### Pack and Deploy
To run webpack to generate the packaged web front in dist/: 
```
npm run pack
```
To pack and deploy the current copy to the cloud server:
```
npm run deploy
```
Note*: CircleCI has been configured to take any changes from a new push, and automatically deploy it to the server.



