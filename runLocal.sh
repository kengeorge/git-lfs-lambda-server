#!/bin/bash

#runs the sam local api in the dev directory for live testing while developing

templateFile=testTemplate.yaml
envFile=testEnvVars.json
runDir="."

params="bucketName=gll-server-dev-artifacts"

GLL_ARTIFACTS_BUCKET=cloudrepo-git-lfs-lambda sam local start-api --template $runDir/$templateFile --parameter-values "$params" --env-vars $runDir/$envFile
