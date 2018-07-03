activate="venv/bin/activate"
.PHONY: install server

all: server

install: venv
	. $(activate) && pip install -r requirements.txt

server: install
	. $(activate) && python server.py

venv:
	virtualenv venv
