#!/bin/bash

VPS_USER="girvel"
VPS_HOST="185.167.234.186"
IMAGE_NAME="looper-vps"

echo "Building Docker Image (amd64)..."
docker build --platform linux/amd64 -t $IMAGE_NAME:latest .

echo "Compressing Image..."
docker save $IMAGE_NAME:latest | gzip > looper-deploy.tar.gz

echo "Uploading Assets..."
scp looper-deploy.tar.gz nginx.conf docker-compose.prod.yaml $VPS_USER@$VPS_HOST:~

echo "Remote: Loading & Restarting..."
ssh $VPS_USER@$VPS_HOST << EOF
  touch looper2.db

  # 1. Load the new image
  gunzip -c looper-deploy.tar.gz | docker load
  
  # 2. Restart the container using the prod compose file
  mv docker-compose.prod.yaml docker-compose.yaml
  docker compose up -d
  
  # 3. Cleanup
  rm looper-deploy.tar.gz
  docker image prune -f # Remove old dangling images
EOF

echo "Deployment Complete!"
rm looper-deploy.tar.gz
