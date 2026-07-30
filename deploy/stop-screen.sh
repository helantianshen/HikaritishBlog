#!/usr/bin/env bash
set -euo pipefail

api_session="${API_SCREEN_NAME:-hikaritish-api}"
web_session="${WEB_SCREEN_NAME:-hikaritish-web}"

for session_name in "${api_session}" "${web_session}"; do
  if [[ ! "${session_name}" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "invalid screen session name: ${session_name}"
    exit 1
  fi
done

for session_name in "${web_session}" "${api_session}"; do
  if screen -list | grep -q "[.]${session_name}[[:space:]]"; then
    # Send Ctrl+C first so Gin can handle SIGINT and close gracefully.
    screen -S "${session_name}" -p 0 -X stuff $'\003'
    for _ in {1..10}; do
      if ! screen -list | grep -q "[.]${session_name}[[:space:]]"; then
        break
      fi
      sleep 1
    done
    if screen -list | grep -q "[.]${session_name}[[:space:]]"; then
      echo "Session did not stop gracefully; forcing quit: ${session_name}"
      screen -S "${session_name}" -X quit
    else
      echo "Stopped ${session_name}"
    fi
  else
    echo "Session is not running: ${session_name}"
  fi
done
