FROM circleci/node:8.9.4

ENV HOME /home/circleci

WORKDIR $HOME

RUN sudo apt-get update

RUN sudo apt-get install -y -qq --no-install-recommends wget unzip python php5-mysql php5-cli php5-cgi openjdk-7-jre-headless openssh-client python-openssl

ENV CLOUDSDK_PYTHON_SITEPACKAGES 1

RUN wget https://dl.google.com/dl/cloudsdk/channels/rapid/google-cloud-sdk.zip

RUN unzip google-cloud-sdk.zip

RUN rm google-cloud-sdk.zip

RUN google-cloud-sdk/install.sh --usage-reporting=true --path-update=true --bash-completion=true --rc-path=/.bashrc --additional-components app-engine-java app-engine-python app kubectl alpha beta gcd-emulator pubsub-emulator cloud-datastore-emulator app-engine-go bigtable

RUN mkdir .ssh

ENV PATH $HOME/google-cloud-sdk/bin:$PATH


