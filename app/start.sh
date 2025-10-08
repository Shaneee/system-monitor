#!/bin/bash

# Set default values if environment variables are not set
WORKERS=${GUNICORN_WORKERS:-2}
THREADS=${GUNICORN_THREADS:-4}
TIMEOUT=${GUNICORN_TIMEOUT:-120}
PORT=${PORT:-3000}

echo "Starting System Monitor with:"
echo "Workers: $WORKERS"
echo "Threads: $THREADS"
echo "Timeout: $TIMEOUT seconds"
echo "Port: $PORT"

exec gunicorn \
    --bind "0.0.0.0:$PORT" \
    --workers "$WORKERS" \
    --threads "$THREADS" \
    --timeout "$TIMEOUT" \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --log-level "warning" \
    --access-logformat '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s' \
    "main:app"