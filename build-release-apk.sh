#!/usr/bin/env bash
set -e

# ==============================================================================
# 🏟️ ATLAS Arena — Production Signed Release Build Engine
# Permanent keystore: android/app/atlas-release-key.keystore
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${PURPLE}${BOLD}"
echo "  █████╗ ████████╗██╗      █████╗ ███████╗     █████╗ ██████╗ ███████╗███╗   ██╗ █████╗ "
echo " ██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝    ██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗"
echo " ███████║   ██║   ██║     ███████║███████╗    ███████║██████╔╝█████╗  ██╔██╗ ██║███████║"
echo " ██╔══██║   ██║   ██║     ██╔══██║╚════██║    ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║"
echo " ██║  ██║   ██║   ███████╗██║  ██║███████║    ██║  ██║██║  ██║███████╗██║ ╚████║██║  ██║"
echo " ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${CYAN}${BOLD}📦 Locally Signed Android Production Release Builder${NC}"
echo -e "──────────────────────────────────────────────────────────────────────"

# 1. Environment Configuration
echo -e "\n${YELLOW}[1/5] Setting up JDK & Android Environment...${NC}"
if [ -d "$PROJECT_DIR/.jdk" ]; then
    export JAVA_HOME="$PROJECT_DIR/.jdk"
    export PATH="$JAVA_HOME/bin:$PATH"
    echo -e "  ${GREEN}✓${NC} Using JDK 21: ${JAVA_HOME}"
fi

if [ -f "$PROJECT_DIR/.android-sdk/platform-tools/adb" ]; then
    export ANDROID_HOME="$PROJECT_DIR/.android-sdk"
    export PATH="$PROJECT_DIR/.android-sdk/platform-tools:$PATH"
    ADB_BIN="$PROJECT_DIR/.android-sdk/platform-tools/adb"
else
    ADB_BIN="$(which adb 2>/dev/null || echo "")"
fi

# 2. Build Web Assets
echo -e "\n${YELLOW}[2/5] Building Web Shell with Vite...${NC}"
npm run build
echo -e "  ${GREEN}✓${NC} Web assets compiled."

# 3. Synchronize Capacitor Android
echo -e "\n${YELLOW}[3/5] Synchronizing Native Assets...${NC}"
npx cap copy android
echo -e "  ${GREEN}✓${NC} Native Android assets synchronized."

# 4. Compile Production Signed Release APK with Gradle
echo -e "\n${YELLOW}[4/5] Compiling Signed Release APK with Gradle...${NC}"
cd "$PROJECT_DIR/android"
./gradlew --stop >/dev/null 2>&1 || true
./gradlew assembleRelease
cd "$PROJECT_DIR"

OUTPUT_APK="$PROJECT_DIR/android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$OUTPUT_APK" ]; then
    echo -e "  ${RED}✗ Release APK not found at ${OUTPUT_APK}!${NC}"
    exit 1
fi

RELEASE_COPY="$PROJECT_DIR/atlas-arena-v1.1.0-signed.apk"
cp "$OUTPUT_APK" "$RELEASE_COPY"
cp "$OUTPUT_APK" "$PROJECT_DIR/atlas-arena-release.apk"

APK_SIZE=$(du -h "$RELEASE_COPY" | awk '{print $1}')
echo -e "  ${GREEN}✓${NC} Signed Release APK created: ${BOLD}${RELEASE_COPY}${NC} (${APK_SIZE})"

# 5. Deploy / Update onto connected phone if available
echo -e "\n${YELLOW}[5/5] Checking connected USB device for direct update...${NC}"
if [ -n "$ADB_BIN" ]; then
    TARGET_DEVICE=$("$ADB_BIN" devices 2>/dev/null | grep -w "device" | awk '{print $1}' | head -n 1 || true)
    if [ -n "$TARGET_DEVICE" ]; then
        echo -e "  🚀 Updating app directly on device [${BOLD}${TARGET_DEVICE}${NC}]..."
        # In-place update with -r -d flag
        "$ADB_BIN" -s "$TARGET_DEVICE" install -r "$RELEASE_COPY" || {
            echo -e "  ${YELLOW}ℹ Previous debug signature detected on phone. Performing fresh install of production key...${NC}"
            "$ADB_BIN" -s "$TARGET_DEVICE" uninstall com.atlas.arena 2>/dev/null || true
            "$ADB_BIN" -s "$TARGET_DEVICE" install "$RELEASE_COPY"
        }
        echo -e "  ${GREEN}✓ Production Signed APK installed on phone!${NC}"
        "$ADB_BIN" -s "$TARGET_DEVICE" shell am start -n com.atlas.arena/com.atlas.arena.MainActivity >/dev/null 2>&1 || true
        echo -e "  ${GREEN}✓ ATLAS Arena launched on screen!${NC}"
    else
        echo -e "  ${YELLOW}ℹ No authorized USB device detected. APK is ready in project root.${NC}"
    fi
fi

echo -e "\n──────────────────────────────────────────────────────────────────────"
echo -e "${GREEN}${BOLD}🎉 SUCCESS! PRODUCTION SIGNED APK GENERATED.${NC}"
echo -e "   File: ${CYAN}${RELEASE_COPY}${NC}"
echo -e "   Keystore: ${CYAN}android/app/atlas-release-key.keystore${NC}"
echo -e "──────────────────────────────────────────────────────────────────────\n"
