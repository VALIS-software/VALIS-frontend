#!/bin/bash

export PROJECT_NAME="valis"
export PROJECT_ID="valis-194104"
export CLUSTER_NAME="cluster-sirius"
export CLOUDSDK_COMPUTE_ZONE="us-west1-b"


echo $GCLOUD_SERVICE_KEY | base64 --decode -i > ${HOME}//gcloud-service-key.json
sudo /google-cloud-sdk/bin/gcloud auth activate-service-account --key-file ${HOME}/gcloud-service-key.json
sudo /google-cloud-sdk/bin/gcloud config set project $PROJECT_ID
sudo /google-cloud-sdk/bin/gcloud --quiet config set container/cluster $CLUSTER_NAME
sudo /google-cloud-sdk/bin/gcloud config set compute/zone ${CLOUDSDK_COMPUTE_ZONE}
sudo /google-cloud-sdk/bin/gcloud --quiet container clusters get-credentials $CLUSTER_NAME

