#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# BloodSync API Demo
# Assumes `npm run dev` is already running on http://localhost:5001
# (port 5000 is reserved by AirPlay on macOS — override with PORT=5001 npm run dev)
# ─────────────────────────────────────────────────────────────────────────────

BASE="http://localhost:5001/api"
BOLD=$(tput bold 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")
CYAN=$(tput setaf 6 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")
RED=$(tput setaf 1 2>/dev/null || echo "")

step() { echo; echo "${BOLD}${CYAN}── $1 ──${RESET}"; }
ok()   { echo "${GREEN}✔  $1${RESET}"; }
info() { echo "${YELLOW}   $1${RESET}"; }
fail() { echo "${RED}✘  $1${RESET}"; }

pretty() {
  if command -v jq &>/dev/null; then
    echo "$1" | jq .
  else
    echo "$1"
  fi
}

# Globals set by call(): RESP_BODY, RESP_HTTP
call() {
  # call <METHOD> <PATH> [BODY] [TOKEN]
  local method=$1 path=$2 body=${3:-} token=${4:-}
  local tmpfile; tmpfile=$(mktemp)
  local headers=(-s -o "$tmpfile" -w "%{http_code}" -X "$method" -H "Content-Type: application/json")
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  [[ -n "$body"  ]] && headers+=(-d "$body")
  RESP_HTTP=$(curl "${headers[@]}" "$BASE$path")
  RESP_BODY=$(cat "$tmpfile")
  rm -f "$tmpfile"
}

# ─── 0. Health check ─────────────────────────────────────────────────────────
step "0 / Health check"
call GET /health
if [[ "$RESP_HTTP" == "200" ]]; then
  ok "Server is up (HTTP $RESP_HTTP)"
  pretty "$RESP_BODY"
else
  fail "Server not responding (HTTP $RESP_HTTP). Is 'PORT=5001 npm run dev' running?"
  exit 1
fi

# ─── 1. Register a donor ─────────────────────────────────────────────────────
step "1 / Register donor account"
DONOR_EMAIL="demo.donor.$(date +%s)@bloodsync.test"
call POST /auth/register '{
  "email": "'"$DONOR_EMAIL"'",
  "password": "DemoPass123!",
  "userType": "DONOR"
}'
ok "POST /api/auth/register  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"
DONOR_TOKEN=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)
info "Donor JWT: ${DONOR_TOKEN:0:40}..."

# ─── 2. Register a hospital ───────────────────────────────────────────────────
step "2 / Register hospital account"
HOSP_EMAIL="demo.hospital.$(date +%s)@bloodsync.test"
call POST /auth/register '{
  "email": "'"$HOSP_EMAIL"'",
  "password": "HospitalPass123!",
  "userType": "HOSPITAL"
}'
ok "POST /api/auth/register  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"
HOSP_TOKEN=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

# ─── 3. Login ─────────────────────────────────────────────────────────────────
step "3 / Login as donor"
call POST /auth/login '{
  "email": "'"$DONOR_EMAIL"'",
  "password": "DemoPass123!"
}'
ok "POST /api/auth/login  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 4. Get own profile (GET /auth/me) ───────────────────────────────────────
step "4 / Get authenticated donor profile"
call GET /auth/me "" "$DONOR_TOKEN"
ok "GET /api/auth/me  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 5. Create donor profile ──────────────────────────────────────────────────
step "5 / Create donor profile"
call POST /donors '{
  "fullName": "Ahmad Al-Rashidi",
  "bloodType": "O+",
  "phone": "+96891234567",
  "email": "'"$DONOR_EMAIL"'",
  "age": 33,
  "neighborhood": "Bausher",
  "weight": 75
}' "$DONOR_TOKEN"
ok "POST /api/donors  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 6. Eligibility quiz ─────────────────────────────────────────────────────
step "6 / Submit eligibility quiz (15 questions, all false = ELIGIBLE)"
call POST /quiz/submit '{
  "answers": {
    "q1": false, "q2": false, "q3": false, "q4": false, "q5": false,
    "q6": false, "q7": false, "q8": false, "q9": false, "q10": false,
    "q11": false, "q12": false, "q13": false, "q14": false, "q15": false
  }
}' "$DONOR_TOKEN"
ok "POST /api/quiz/submit  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 7. Create hospital profile ───────────────────────────────────────────────
step "7 / Create hospital profile"
call POST /hospitals '{
  "hospitalName": "Demo Medical Centre",
  "contactPerson": "Dr. Fatima Al-Balushi",
  "phone": "+96824000000",
  "email": "'"$HOSP_EMAIL"'",
  "address": "Al Khuwair, Muscat",
  "neighborhood": "Al Khuwair",
  "operatingHours": "8am-10pm",
  "licenseNumber": "MOH-DEMO-999"
}' "$HOSP_TOKEN"
ok "POST /api/hospitals  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 8. Search for compatible donors ─────────────────────────────────────────
step "8 / Hospital searches for O+ donors near Al Khuwair"
call POST /search/donors '{
  "bloodType": "O+",
  "neighborhood": "Al Khuwair",
  "urgency": "URGENT"
}' "$HOSP_TOKEN"
ok "POST /api/search/donors  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

DONOR_PROFILE_ID=$(echo "$RESP_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
donors = d.get('data', [])
if donors:
    print(donors[0].get('_id', ''))
" 2>/dev/null)
info "First donor profile ID from search: $DONOR_PROFILE_ID"

# ─── 9. Post an urgent blood request ─────────────────────────────────────────
step "9 / Post urgent blood request (broadcasts to donors)"
call POST /urgent-requests '{
  "bloodType": "O+",
  "unitsNeeded": 3,
  "urgencyLevel": "CRITICAL",
  "notes": "Emergency surgery patient — O+ urgently needed"
}' "$HOSP_TOKEN"
ok "POST /api/urgent-requests  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"
URGENT_ID=$(echo "$RESP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('_id',''))" 2>/dev/null)
info "Urgent request ID: $URGENT_ID"

# ─── 10. Public active urgent requests ────────────────────────────────────────
step "10 / Public feed — active urgent requests"
call GET /urgent-requests/active
ok "GET /api/urgent-requests/active  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 11. Hospital's own request history ───────────────────────────────────────
step "11 / Hospital views its own request history"
call GET /urgent-requests/hospital "" "$HOSP_TOKEN"
ok "GET /api/urgent-requests/hospital  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 12. Donor checks their notifications ─────────────────────────────────────
step "12 / Donor checks notifications"
call GET /notifications/donor "" "$DONOR_TOKEN"
ok "GET /api/notifications/donor  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 13. Donor's donation history ─────────────────────────────────────────────
step "13 / Donor views donation history"
call GET /donations/my "" "$DONOR_TOKEN"
ok "GET /api/donations/my  →  HTTP $RESP_HTTP"
pretty "$RESP_BODY"

# ─── 14. Fulfill urgent request ───────────────────────────────────────────────
if [[ -n "$URGENT_ID" ]]; then
  step "14 / Fulfill the urgent request"
  call PUT "/urgent-requests/$URGENT_ID/fulfill" "" "$HOSP_TOKEN"
  ok "PUT /api/urgent-requests/$URGENT_ID/fulfill  →  HTTP $RESP_HTTP"
  pretty "$RESP_BODY"
fi

# ─── Done ────────────────────────────────────────────────────────────────────
echo
echo "${BOLD}${GREEN}━━━ Demo complete ━━━${RESET}"
echo "Donor email : $DONOR_EMAIL"
echo "Hospital    : $HOSP_EMAIL"
echo "All requests above should show HTTP 2xx."
