#!/bin/bash

# Exit on error
set -e

# --- Configuration ---
PROJECT_ID="summit-demo-469118"
if [ -z "$PROJECT_ID" ]; then
  read -p "Enter the GCP Project ID: " PROJECT_ID
fi
SERVICE_NAME="summit-demo"
REGION="us-central1"
# ---

# Build the container image using Google Cloud Build
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Deploy the container to Cloud Run
gcloud run deploy "$SERVICE_NAME" \
  --image "gcr.io/$PROJECT_ID/$SERVICE_NAME" \
  --platform "managed" \
  --region "$REGION" \
  --allow-unauthenticated \
  --session-affinity \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
  --project "$PROJECT_ID"

echo "Deployment complete. Access your service at the URL provided above."
