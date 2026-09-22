#!/bin/sh
# Local Supabase setup helper for SherPay (next-web/).
# Run this from the next-web/ directory.
#
# This script:
#   1. Verifies it is running from next-web/
#   2. Checks for the Supabase CLI
#   3. Logs in (interactive by default)
#   4. Links to the target Supabase project
#   5. Shows the DB diff
#   6. Pushes the migration after confirmation
#   7. Deploys the resend-verification function
#
# DO NOT commit real secrets. If you use a one-time login token,
# pass it via SUPABASE_LOGIN_TOKEN instead of pasting it into history.

set -eu

PROJECT_REF="jmmrcrnfwyrbejhechke"
REPO_ROOT="/Users/sherrie/Downloads/SherPay-complete"
NEXT_WEB_DIR="$REPO_ROOT/next-web"

if [ ! -f "$NEXT_WEB_DIR/supabase/config.toml" ]; then
  echo "ERROR: Expected Supabase config at: $NEXT_WEB_DIR/supabase/config.toml"
  echo "Run this script from: $NEXT_WEB_DIR"
  exit 1
fi

if [ "$(pwd)" != "$NEXT_WEB_DIR" ]; then
  echo "Changing directory to: $NEXT_WEB_DIR"
  cd "$NEXT_WEB_DIR"
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: 'supabase' CLI not found on PATH."
  echo "Install it first, for example:"
  echo "  brew install supabase"
  echo "If Homebrew installed it elsewhere, run this first:"
  echo "  export PATH=\"\$(brew --prefix supabase)/bin:\$PATH\""
  exit 1
fi

echo "Supabase CLI found:"
supabase --version 2>/dev/null || true
echo "Working directory:"
pwd
echo "Linked project ref target: $PROJECT_REF"
echo

if [ -n "${SUPABASE_LOGIN_TOKEN:-}" ]; then
  echo "Using supplied Supabase login token."
  supabase login --token "$SUPABASE_LOGIN_TOKEN"
else
  echo "No SUPABASE_LOGIN_TOKEN set."
  echo "Start interactive login now."
  echo "If your Supabase dashboard gave a one-time token, cancel this and run:"
  echo "  SUPABASE_LOGIN_TOKEN=<TOKEN> $0"
  echo "or run manually:"
  echo "  supabase login --token <TOKEN>"
  echo
  supabase login
fi

echo
echo "Linking local project to remote project ref: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

echo
echo "Checking database diff (schema: public)"
supabase db diff --schema public

echo
echo "============================================"
echo "DB diff complete."
echo "Review the output above before pushing."
echo "If everything looks correct, run the push with:"
echo "  supabase db push"
echo "Or run this script again with:"
echo "  $0 --push"
echo "============================================"

if [ "${1:-}" = "--push" ]; then
  echo
  echo "Pushing local migration to remote project..."
  supabase db push

  echo
  echo "Deploying resend-verification function..."
  supabase functions deploy resend-verification

  echo
  echo "Done."
  echo
  echo "Next checks:"
  echo "  - Signup should send a verification email (if Supabase Auth email is configured)."
  echo "  - Password reset should send a reset email."
  echo "  - For custom verification emails, deploy and configure the resend-verification function."
else
  echo
  echo "To continue, run this script again with: $0 --push"
fi
