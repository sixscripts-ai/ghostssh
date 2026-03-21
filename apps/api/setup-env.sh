#!/bin/bash
cd /Users/villain/ghostssh/apps/api
set -e

environments=("production" "preview" "development")
vars=(
  "MINIMAX_MODEL MiniMax-M2.7"
  "ANTHROPIC_MODEL claude-sonnet-4-5"
  "OPENAI_MODEL gpt-4o"
  "GEMINI_MODEL gemini-2.5-pro"
  "OPENROUTER_MODEL openai/gpt-4o"
  "DEFAULT_PROVIDER minimax"
  "FALLBACK_PROVIDER anthropic"
  "USER_AGENT ghostssh/1.0"
  "APPWRITE_ENDPOINT https://sfo.cloud.appwrite.io/v1"
  "APPWRITE_PROJECT_ID sfo-69be176f00077d92699d"
  "APPWRITE_DATABASE_ID ghostssh"
  "APPWRITE_JOBS_COLLECTION_ID jobs"
  "APPWRITE_PROFILES_COLLECTION_ID profiles"
  "APPWRITE_APPLICATIONS_COLLECTION_ID applications"
)

for env in "${environments[@]}"; do
  for var in "${vars[@]}"; do
    key=$(echo $var | awk '{print $1}')
    value=$(echo $var | awk '{print $2}')
    echo "Setting $key for $env"
    echo "$value" | npx vercel env add $key $env || true
  done
done
