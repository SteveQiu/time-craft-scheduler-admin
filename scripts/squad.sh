#!/bin/bash
# Squad startup script for Unix/Linux/macOS
# Launches the Copilot CLI with the Squad coordinator agent

set -e

echo "🚀 Starting Squad coordinator..."
copilot --agent squad
