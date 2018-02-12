#!/bin/bash

# Exit on any error
set -e

#sudo chown -R ubuntu:ubuntu /home/ubuntu/.kube

# use an annotation of date to triggle an roll-out
d=$(echo $(date) | tr -d ' ') # remove space
kubectl patch deployment sirius-dev -p '{"spec":{"template":{"metadata":{"annotations":{"date":"'$d'"}}}}}'

