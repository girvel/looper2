FROM golang:1.25-bookworm AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY main.go ./
COPY src ./src

RUN CGO_ENABLED=1 GOOS=linux go build -o server main.go

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/server .
COPY templates ./templates
COPY static ./static
EXPOSE 8080
CMD ["./server"]
