#!/bin/bash

# Run the test and capture the output
npm run test -- --cache=remote:rw | tee test-output.log

cat test-output.log

# Check if the output contains "FULL TURBO"
if ! grep -q "FULL TURBO" test-output.log; then
  echo "FULL TURBO not found in output"
  exit 1
fi
