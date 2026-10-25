#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
exec ./.sites-runtime/ai/llama/llama-b11856/llama-server \
 --model .sites-runtime/ai/qwen2.5-1.5b-instruct-q4_k_m.gguf \
 --host 127.0.0.1 --port 8090 --threads 3 --ctx-size 4096 --n-predict 450
