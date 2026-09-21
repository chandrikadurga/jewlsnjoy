#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Collecting static files ==="
python manage.py collectstatic --no-input

echo "=== Running database migrations ==="
python manage.py migrate --no-input

# Note: Database seeding is intentionally omitted from production builds
# to prevent any possibility of overwriting admin changes or re-creating deleted products.

