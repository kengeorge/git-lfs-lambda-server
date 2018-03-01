#!/bin/bash

#runs the sam local api in the dev directory for live testing while developing

templateFile=testTemplate.yaml
runDir="."

GLL_ARTIFACTS_BUCKET=cloudrepo-git-lfs-lambda \
GLL_ENDPOINT=127.0.0.1:3000 \
sam local start-api --template $runDir/$templateFile
