#!/bin/bash
# JOAF Viral Features — Apply Patches
# Run this from your JOAF-main directory: bash APPLY_PATCHES.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(pwd)"

echo "🔧 Applying JOAF viral feature patches..."
echo "Repo: $REPO_DIR"
echo ""

# Copy files
cp "$SCRIPT_DIR/save-subscription.js" "$REPO_DIR/netlify/functions/save-subscription.js" && echo "✅ save-subscription.js"
cp "$SCRIPT_DIR/send-notification.js" "$REPO_DIR/netlify/functions/send-notification.js" && echo "✅ send-notification.js"
cp "$SCRIPT_DIR/components.js"        "$REPO_DIR/js/components.js"                        && echo "✅ js/components.js"
cp "$SCRIPT_DIR/joaf-polls.html"      "$REPO_DIR/joaf-polls.html"                         && echo "✅ joaf-polls.html"
cp "$SCRIPT_DIR/admin-index.html"     "$REPO_DIR/admin/index.html"                        && echo "✅ admin/index.html"

echo ""
echo "🚀 Committing and pushing..."
git add netlify/functions/save-subscription.js \
        netlify/functions/send-notification.js \
        js/components.js \
        joaf-polls.html \
        admin/index.html

git commit -m "feat: viral engagement — district push filter, blood notification, streak share card, polls district login

- save-subscription: district field Firestore এ save হবে
- send-notification: blood/alert/weather type এ district filter — শুধু matching subscriber পাবেন
- components.js: blood donor registration এ auto push notification (district + blood group সহ)
- components.js: joafSaveSubscription এ user district পাঠানো
- joaf-polls.html: streak share card (Canvas → WhatsApp/Facebook native share)
- joaf-polls.html: leaderboard এ share button, নিজের row এ 📤 button
- joaf-polls.html: login form এ district dropdown
- admin/index.html: blood/alert notification modal এ district selector"

git push

echo ""
echo "✅ সব done! Deploy হচ্ছে Netlify তে।"
