#!/bin/bash
set -e

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
    set -e

    gunzip -c looper-deploy.tar.gz | docker load

    docker stop looper || true
    docker rm looper || true
    docker run -d \
        --name looper \
        --restart unless-stopped \
        -p 80:8080 \
        -e GIN_MODE=release \
        -e LOOPER_RELEASE=1 \
        -v girvel_looper2_db:/app/data \
        looper-vps:latest

    rm looper-deploy.tar.gz
    docker image prune -f # Remove old dangling images
EOF

echo "Deployment Complete!"
rm looper-deploy.tar.gz
