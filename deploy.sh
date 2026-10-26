#!/bin/bash
set -e

: "${HOST:?HOST required}"
: "${USER:?USER required}"

IMAGE_NAME=${IMAGE_NAME:-"looper-vps"}
DEPLOY_PATH=${DEPLOY_PATH:-"/var/looper2"}

echo "Building..."
CGO_ENABLED=1 CC=x86_64-linux-musl-gcc \
    go build -trimpath -ldflags="-s -w -linkmode external -extldflags=-static" \
    -o looper2 main.go

echo "Stopping remote service..."
ssh $USER@$HOST "sudo systemctl stop looper2 || true"

echo "Uploading..."
scp -r static templates looper2 .auth-key backup.sh cert.pem key.pem $USER@$HOST:$DEPLOY_PATH
scp looper2.service $USER@$HOST:/etc/systemd/system/

echo "Starting remote service..."
ssh $USER@$HOST << EOF
    sudo systemctl daemon-reload
    sudo systemctl enable looper2
    sudo systemctl start looper2
EOF

echo "Done."
