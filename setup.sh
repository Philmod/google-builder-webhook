#!/bin/bash

[ -z "$PROJECT_ID" ] && echo "Need to set PROJECT_ID" && exit 1;
gcloud config set project $PROJECT_ID

[ -z "$WEBHOOK" ] && echo "Need to set WEBHOOK" && exit 1;

# Create config file with constants.
if [ -z "$GC_STATUS" ]; then
  export GC_STATUS="SUCCESS FAILURE TIMEOUT INTERNAL_ERROR"
fi
arr=(`echo ${GC_STATUS}`);
json_array() {
  echo -n '['
  while [ $# -gt 0 ]; do
    x=${1//\\/\\\\}
    echo -n \"${x//\"/\\\"}\"
    [ $# -gt 1 ] && echo -n ', '
    shift
  done
  echo ']'
}
cat <<EOF > config.json
{
  "WEBHOOK" : "$WEBHOOK",
  "GC_STATUS": $(json_array "${arr[@]}")
}
EOF

# Create bucket name if not set.
if [ -z "$BUCKET_NAME" ]; then
  # Create pseudo random bucket name, otherwise an attacker
  # could use the pattern to create a bucket and get the
  # function code.
  md5=md5 && [[ -n "$(which md5)" ]] || md5=md5sum
  export BUCKET_NAME="$PROJECT_ID-gcf-$(date | $md5 | cut -c -10)"
fi

# Create bucket.
gsutil mb -p $PROJECT_ID gs://$BUCKET_NAME

# Deploy function.
if [ -z "$FUNCTION_NAME" ]; then
  export FUNCTION_NAME="containerEmailIntegration"
fi
if [ -z "$REGION" ]; then
  export REGION="us-central1"
fi
gcloud beta functions deploy $FUNCTION_NAME --stage-bucket $BUCKET_NAME --trigger-topic cloud-builds --entry-point subscribe --region $REGION
