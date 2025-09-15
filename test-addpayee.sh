#!/bin/bash

echo "=== Running addPayee Concurrency Test ==="
echo ""

# Check if environment variables are set
if [ -z "$TEST_LIT_RELAYER_API_KEY" ] || [ -z "$TEST_LIT_PAYER_SECRET_KEY" ]; then
    echo "❌ Error: Please set TEST_LIT_RELAYER_API_KEY and TEST_LIT_PAYER_SECRET_KEY in your .env file"
    exit 1
fi

# Start the server in background if not already running
if ! curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "🚀 Starting development server..."
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to start
    echo "⏳ Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            echo "✅ Server is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Server failed to start in 30 seconds"
            kill $SERVER_PID 2>/dev/null
            exit 1
        fi
        sleep 1
    done
else
    echo "✅ Server is already running"
    SERVER_PID=""
fi

# Set number of test requests (default: 10)
export TEST_NUM_REQUESTS=${1:-10}

echo "📝 Running test with $TEST_NUM_REQUESTS concurrent requests..."
echo ""

# Run the test
npm test -- tests/routes/delegate/addPayee.test.ts

TEST_EXIT_CODE=$?

# Cleanup: kill server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo "🛑 Stopping development server..."
    kill $SERVER_PID 2>/dev/null
    wait $SERVER_PID 2>/dev/null
fi

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Test completed successfully!"
else
    echo "❌ Test failed"
fi

exit $TEST_EXIT_CODE