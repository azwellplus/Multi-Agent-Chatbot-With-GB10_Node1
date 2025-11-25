#!/bin/bash
#
# Vision Model Connection Diagnostic Script
#

set -e

echo "=================================="
echo "Vision Model Connection Diagnosis"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check environment variable
echo "1. Checking VISION_MODEL_BASE_URL environment variable..."
if [ -z "$VISION_MODEL_BASE_URL" ]; then
    echo -e "${YELLOW}⚠  VISION_MODEL_BASE_URL not set (using default: http://qwen2.5-vl:8000/v1)${NC}"
    VISION_MODEL_URL="http://qwen2.5-vl:8000/v1"
else
    echo -e "${GREEN}✓ VISION_MODEL_BASE_URL = $VISION_MODEL_BASE_URL${NC}"
    VISION_MODEL_URL="$VISION_MODEL_BASE_URL"
fi
echo ""

# Extract host and port
BASE_URL=$(echo $VISION_MODEL_URL | sed 's|/v1||')
HOST=$(echo $BASE_URL | sed -e 's|http://||' -e 's|https://||' | cut -d: -f1)
PORT=$(echo $BASE_URL | sed -e 's|http://||' -e 's|https://||' | cut -d: -f2)

# If port not specified, use default 8000
if [ "$HOST" = "$PORT" ]; then
    PORT=8000
fi

echo "Extracted info:"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  Full URL: $BASE_URL"
echo ""

# 2. Check if backend container is running
echo "2. Checking backend container status..."
if docker ps | grep -q backend; then
    echo -e "${GREEN}✓ Backend container is running${NC}"
else
    echo -e "${RED}✗ Backend container is NOT running${NC}"
    exit 1
fi
echo ""

# 3. Check environment variable inside backend container
echo "3. Checking environment variable inside backend container..."
BACKEND_ENV=$(docker exec backend printenv VISION_MODEL_BASE_URL 2>/dev/null || echo "")
if [ -z "$BACKEND_ENV" ]; then
    echo -e "${YELLOW}⚠  VISION_MODEL_BASE_URL not found in backend container${NC}"
else
    echo -e "${GREEN}✓ Backend container has VISION_MODEL_BASE_URL = $BACKEND_ENV${NC}"
fi
echo ""

# 4. Ping test
echo "4. Testing network connectivity to vision model host..."
if docker exec backend ping -c 2 $HOST > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Can ping $HOST${NC}"
else
    echo -e "${RED}✗ Cannot ping $HOST${NC}"
    echo "  This might be normal if ICMP is blocked, but indicates potential network issues."
fi
echo ""

# 5. Port connectivity test
echo "5. Testing port connectivity..."
if docker exec backend timeout 5 bash -c "cat < /dev/null > /dev/tcp/$HOST/$PORT" 2>/dev/null; then
    echo -e "${GREEN}✓ Port $PORT on $HOST is reachable${NC}"
else
    echo -e "${RED}✗ Port $PORT on $HOST is NOT reachable${NC}"
    echo "  Possible causes:"
    echo "    - Vision model server not running"
    echo "    - Firewall blocking the port"
    echo "    - Wrong IP address"
fi
echo ""

# 6. HTTP health check
echo "6. Testing HTTP connectivity..."
HEALTH_URL="${BASE_URL}/health"
echo "  Trying: curl $HEALTH_URL"

HEALTH_RESPONSE=$(docker exec backend curl -s -o /dev/null -w "%{http_code}" --max-time 5 $HEALTH_URL 2>/dev/null || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ] || [ "$HEALTH_RESPONSE" = "404" ]; then
    echo -e "${GREEN}✓ HTTP server is responding (HTTP $HEALTH_RESPONSE)${NC}"

    # Try to get actual response
    HEALTH_BODY=$(docker exec backend curl -s --max-time 5 $HEALTH_URL 2>/dev/null || echo "")
    if [ ! -z "$HEALTH_BODY" ]; then
        echo "  Response: $HEALTH_BODY"
    fi
else
    echo -e "${RED}✗ HTTP server not responding (HTTP $HEALTH_RESPONSE)${NC}"
fi
echo ""

# 7. Test /v1/models endpoint
echo "7. Testing /v1/models endpoint..."
MODELS_URL="${VISION_MODEL_URL%/v1}/v1/models"
echo "  Trying: curl $MODELS_URL"

MODELS_RESPONSE=$(docker exec backend curl -s --max-time 5 $MODELS_URL 2>/dev/null || echo "")

if [ ! -z "$MODELS_RESPONSE" ]; then
    echo -e "${GREEN}✓ Models endpoint is responding${NC}"
    echo "  Response: ${MODELS_RESPONSE:0:200}"
    if [ ${#MODELS_RESPONSE} -gt 200 ]; then
        echo "  (truncated...)"
    fi
else
    echo -e "${RED}✗ Models endpoint not responding${NC}"
fi
echo ""

# 8. Check if local qwen2.5-vl container exists
echo "8. Checking for local qwen2.5-vl container..."
if docker ps | grep -q qwen2.5-vl; then
    echo -e "${YELLOW}⚠  Local qwen2.5-vl container is running${NC}"
    echo "  This might conflict if you're trying to use an external server."
    echo "  Consider stopping it: docker-compose -f docker-compose-models.yml stop qwen2.5-vl"
elif docker ps -a | grep -q qwen2.5-vl; then
    echo -e "${YELLOW}⚠  Local qwen2.5-vl container exists but is stopped${NC}"
else
    echo -e "${GREEN}✓ No local qwen2.5-vl container found${NC}"
fi
echo ""

# 9. Check backend logs for MCP initialization
echo "9. Checking backend logs for MCP server initialization..."
MCP_LOGS=$(docker logs backend 2>&1 | grep "image_understanding" | tail -5)
if [ ! -z "$MCP_LOGS" ]; then
    echo "Recent image_understanding logs:"
    echo "$MCP_LOGS"
else
    echo -e "${YELLOW}⚠  No image_understanding logs found${NC}"
fi
echo ""

# Summary
echo "=================================="
echo "Summary"
echo "=================================="
echo ""

if [ "$HEALTH_RESPONSE" = "200" ] || [ ! -z "$MODELS_RESPONSE" ]; then
    echo -e "${GREEN}✓ Vision model server appears to be working correctly!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Restart backend to ensure environment variables are loaded:"
    echo "     docker-compose restart backend"
    echo ""
    echo "  2. Test with an image upload in the frontend"
else
    echo -e "${RED}✗ Vision model server is not accessible${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo ""
    echo "  1. Verify external vision server is running:"
    echo "     ssh <external-host> 'docker ps | grep qwen2.5-vl'"
    echo ""
    echo "  2. Check if port is exposed on external machine:"
    echo "     ssh <external-host> 'netstat -tulpn | grep 8000'"
    echo ""
    echo "  3. Test from your machine directly:"
    echo "     curl http://$HOST:$PORT/health"
    echo ""
    echo "  4. Check firewall on external machine:"
    echo "     ssh <external-host> 'sudo ufw status'"
    echo ""
    echo "  5. Ensure VISION_MODEL_BASE_URL is set in docker-compose.yml:"
    echo "     grep VISION_MODEL_BASE_URL docker-compose.yml"
    echo ""
    echo "  6. Restart all services:"
    echo "     docker-compose restart"
fi
