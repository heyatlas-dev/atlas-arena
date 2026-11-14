#!/usr/bin/env bash
set -e

# ==============================================================================
# 🏟️ ATLAS Arena — Android Build & USB Debugging Direct Installer
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${PURPLE}${BOLD}"
echo "  █████╗ ████████╗██╗      █████╗ ███████╗     █████╗ ██████╗ ███████╗███╗   ██╗ █████╗ "
echo " ██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝    ██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗"
echo " ███████║   ██║   ██║     ███████║███████╗    ███████║██████╔╝█████╗  ██╔██╗ ██║███████║"
echo " ██╔══██║   ██║   ██║     ██╔══██║╚════██║    ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║"
echo " ██║  ██║   ██║   ███████╗██║  ██║███████║    ██║  ██║██║  ██║███████╗██║ ╚████║██║  ██║"
echo " ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${CYAN}${BOLD}⚡ Native Android Build & Instant USB Deployment Engine${NC}"
echo -e "──────────────────────────────────────────────────────────────────────"

# 1. Environment Configuration
echo -e "\n${YELLOW}[1/6] Configuring Android & JDK Environment...${NC}"

if [ -d "$PROJECT_DIR/.jdk" ]; then
    export JAVA_HOME="$PROJECT_DIR/.jdk"
    export PATH="$JAVA_HOME/bin:$PATH"
    echo -e "  ${GREEN}✓${NC} Using self-contained JDK 21: ${JAVA_HOME}"
else
    echo -e "  ${YELLOW}ℹ${NC} Using system Java: $(which java)"
fi

if [ -f "$PROJECT_DIR/.android-sdk/platform-tools/adb" ]; then
    export ANDROID_HOME="$PROJECT_DIR/.android-sdk"
    export PATH="$PROJECT_DIR/.android-sdk/platform-tools:$PATH"
    ADB_BIN="$PROJECT_DIR/.android-sdk/platform-tools/adb"
    echo -e "  ${GREEN}✓${NC} Using Android SDK ADB: ${ADB_BIN}"
else
    ADB_BIN="$(which adb 2>/dev/null || echo "")"
    if [ -z "$ADB_BIN" ]; then
        echo -e "  ${RED}✗ ADB not found! Installing platform-tools...${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} Using system ADB: ${ADB_BIN}"
fi

export ANDROID_USER_HOME="$PROJECT_DIR/.android"
export ADB_VENDOR_KEYS="$ANDROID_USER_HOME"
export GRADLE_USER_HOME="$PROJECT_DIR/.gradle"
export HOME="$PROJECT_DIR"
mkdir -p "$ANDROID_USER_HOME" "$GRADLE_USER_HOME"

# 2. Check for Connected USB Device
echo -e "\n${YELLOW}[2/6] Detecting Connected Android USB Devices...${NC}"
"$ADB_BIN" start-server >/dev/null 2>&1 || true

# Wait loop for authorization if device is connected but unauthorized
MAX_AUTH_WAIT=20
WAIT_COUNTER=0

while true; do
    DEVICES_RAW=$("$ADB_BIN" devices | grep -v "List of devices" | grep -v "^$" || true)
    
    if [ -z "$DEVICES_RAW" ]; then
        echo -e "  ${RED}✗ No USB device detected!${NC}"
        echo -e "    ${YELLOW}1.${NC} Plug your Android phone into this computer with a USB cable."
        echo -e "    ${YELLOW}2.${NC} Turn ON ${BOLD}Developer Options${NC} and enable ${BOLD}USB Debugging${NC}."
        echo -e "    ${YELLOW}3.${NC} Run this script again: ${BOLD}./install-on-device.sh${NC}"
        break
    fi

    # Check if we have an authorized device
    AUTHORIZED_DEV=$(echo "$DEVICES_RAW" | grep -w "device" | awk '{print $1}' | head -n 1 || true)
    if [ -n "$AUTHORIZED_DEV" ]; then
        MODEL=$("$ADB_BIN" -s "$AUTHORIZED_DEV" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "Android Device")
        echo -e "  ${GREEN}✓ Authorized Device Detected:${NC} 📱 ${BOLD}${MODEL}${NC} (${AUTHORIZED_DEV})"
        break
    fi

    # Device is present but unauthorized
    UNAUTH_DEV=$(echo "$DEVICES_RAW" | grep -w "unauthorized" | awk '{print $1}' | head -n 1 || true)
    if [ -n "$UNAUTH_DEV" ]; then
        if [ $WAIT_COUNTER -eq 0 ]; then
            echo -e "  ${YELLOW}⚠️ Phone detected (${UNAUTH_DEV}) but UNCONFIRMED!${NC}"
            echo -e "  👉 ${BOLD}Please check your phone screen now and tap 'Allow USB debugging' (check 'Always allow')...${NC}"
        fi
        sleep 2
        WAIT_COUNTER=$((WAIT_COUNTER + 2))
        if [ $WAIT_COUNTER -ge $MAX_AUTH_WAIT ]; then
            echo -e "  ${YELLOW}Timed out waiting for authorization prompt.${NC}"
            break
        fi
        continue
    fi

    break
done

# 3. Compile Web Assets (Vite)
echo -e "\n${YELLOW}[3/6] Building Web Shell with Vite...${NC}"
npm run build
echo -e "  ${GREEN}✓${NC} Web distribution built successfully in dist/"

# 4. Sync Web Assets to Android Project
echo -e "\n${YELLOW}[4/6] Copying Assets to Android Native Project...${NC}"
npx cap copy android
echo -e "  ${GREEN}✓${NC} Native Android assets synchronized."

# 5. Compile Android Debug APK with Gradle
echo -e "\n${YELLOW}[5/6] Compiling Native Android APK with Gradle...${NC}"
cd "$PROJECT_DIR/android"
./gradlew --stop >/dev/null 2>&1 || true
./gradlew assembleDebug
cd "$PROJECT_DIR"

APK_PATH="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

if [ ! -f "$APK_PATH" ]; then
    echo -e "  ${RED}✗ Build failed: APK not found at ${APK_PATH}${NC}"
    exit 1
fi

APK_SIZE=$(du -h "$APK_PATH" | awk '{print $1}')
echo -e "  ${GREEN}✓${NC} Debug APK generated: ${BOLD}${APK_PATH}${NC} (${APK_SIZE})"

# 6. Install APK onto Device via ADB
echo -e "\n${YELLOW}[6/6] Deploying to Connected Android Device via USB...${NC}"
TARGET_DEVICE=$("$ADB_BIN" devices | grep -w "device" | awk '{print $1}' | head -n 1 || true)

if [ -n "$TARGET_DEVICE" ]; then
    echo -e "  🚀 Installing APK onto device [${BOLD}${TARGET_DEVICE}${NC}]..."
    "$ADB_BIN" -s "$TARGET_DEVICE" install -r "$APK_PATH"
    echo -e "  ${GREEN}✓ APK installed successfully!${NC}"

    echo -e "  ⚡ Launching ATLAS Arena..."
    "$ADB_BIN" -s "$TARGET_DEVICE" shell am start -n com.atlas.arena/com.atlas.arena.MainActivity >/dev/null 2>&1 || true
    echo -e "  ${GREEN}✓ ATLAS Arena launched on screen!${NC}"
else
    echo -e "  ${YELLOW}ℹ No authorized USB device was available for auto-installation.${NC}"
    echo -e "  You can manually install the APK anytime by running:"
    echo -e "    ${BOLD}adb install -r \"${APK_PATH}\"${NC}"
fi

echo -e "\n──────────────────────────────────────────────────────────────────────"
echo -e "${GREEN}${BOLD}🎉 SUCCESS! ATLAS Arena is ready.${NC}"
echo -e "   APK Location: ${CYAN}${APK_PATH}${NC}"
echo -e "──────────────────────────────────────────────────────────────────────\n"
