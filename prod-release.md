# Deploy Relay Server

This document show an end to end pipeline on how we can build, release & deploy an `relay-server` into AWS PROD env

## Setup
- Open a new shell console terminal, cd to this `current directoty` & paste your AWS credentials. Then, run below command
```
# build sample service docker image
make build

# push docker image into AWS prod ecr
make release-prod

# deploy sample service into PROD env
make deploy-k8s-prod
```
