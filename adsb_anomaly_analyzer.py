#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           AEROSPACE ANOMALY DETECTION & ANTIGRAVITY RESEARCH               ║
║                   ADS-B Transponder Data Analyzer v2.0                     ║
║          OpenSky Network Live Feed → Physics-Based Analysis                ║
╚══════════════════════════════════════════════════════════════════════════════╝

Analyzes live ADS-B data for:
  - Anomalous flight behavior (altitude, speed, turn rate, hovering)
  - Gravitational anomaly indicators
  - Pattern classification (CONVENTIONAL / UNUSUAL / UNEXPLAINED)
  - Physics-based hypothesis generation
"""

import requests
import json
import math
import time
import sys
import os
from datetime import datetime, timezone
from collections import defaultdict

# ─────────────────────────── CONFIGURATION ──────────────────────────────────

OPENSKY_API_URL = "https://opensky-network.org/api/states/all"
OPENSKY_AUTH_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"

CLIENT_ID = "sit23sc048@sairamtap.edu.in-api-client"
CLIENT_SECRET = "YR6Ifrykv3BNVj8oMXhfezg5gjpRj80c"

# ─────────────── PHYSICS THRESHOLDS (based on known aircraft performance) ───

# Vertical rate thresholds (ft/min)
NORMAL_CLIMB_MAX = 3000        # Normal commercial climb
UNUSUAL_CLIMB_MAX = 6000       # Fighter jet climb rate
EXTREME_CLIMB = 10000          # Beyond known performance

NORMAL_DESCENT_MAX = -2000     # Normal approach descent
UNUSUAL_DESCENT_MAX = -6000    # Emergency descent
EXTREME_DESCENT = -10000       # Beyond known performance

# Speed thresholds (m/s → converted to knots where needed)
MIN_STALL_SPEED_KTS = 60       # Below this, fixed-wing can't sustain lift
SUPERSONIC_THRESHOLD_KTS = 661 # Mach 1 at sea level (~340 m/s)
HYPERSONIC_THRESHOLD_KTS = 3307 # Mach 5

# Hover detection
HOVER_SPEED_THRESHOLD_KTS = 15  # Near-zero groundspeed
HOVER_ALT_TOLERANCE_M = 50      # Altitude must be stable

# Acceleration limits (m/s²)
MAX_CONVENTIONAL_ACCEL = 50     # ~5g - fighter jet max
IMPOSSIBLE_ACCEL = 100          # ~10g - beyond human tolerance

# Turn rate limits (degrees/second)
NORMAL_TURN_RATE = 3            # Standard rate turn
UNUSUAL_TURN_RATE = 10          # High-performance
IMPOSSIBLE_TURN_RATE = 25       # Beyond structural limits

# ─────────────────── KNOWN ICAO RANGES (by country prefix) ─────────────────

KNOWN_ICAO_PREFIXES = {
    '0': 'Unknown/Invalid',
    'a': 'United States', 'A': 'United States',
    '3': 'Various (Italy/Spain/France)',
    '4': 'Various (UK/Germany/China)',
    '7': 'Various (Russia/Australia)',
    '8': 'Various (India/Japan)',
    'c': 'Canada', 'C': 'Canada',
    'e': 'Various (Germany/Netherlands)',
    'E': 'Various (Germany/Netherlands)',
}

# ICAO 24-bit address ranges for major registries
ICAO_RANGES = [
    (0x000000, 0x003FFF, "ICAO - Reserved/Unknown"),
    (0x004000, 0x0043FF, "Zimbabwe"),
    (0x006000, 0x006FFF, "Mozambique"),
    (0x008000, 0x00FFFF, "South Africa"),
    (0x010000, 0x017FFF, "Egypt"),
    (0x018000, 0x01FFFF, "Libya"),
    (0x020000, 0x027FFF, "Morocco"),
    (0x028000, 0x02FFFF, "Tunisia"),
    (0x030000, 0x0307FF, "Botswana"),
    (0x038000, 0x03FFFF, "Burundi → Various"),
    (0x040000, 0x04FFFF, "Various African"),
    (0x200000, 0x27FFFF, "Various Asian"),
    (0x300000, 0x33FFFF, "Various Asian"),
    (0x380000, 0x3BFFFF, "France"),
    (0x3C0000, 0x3FFFFF, "Germany"),
    (0x400000, 0x43FFFF, "United Kingdom"),
    (0x440000, 0x447FFF, "Austria"),
    (0x448000, 0x44FFFF, "Belgium"),
    (0x450000, 0x457FFF, "Bulgaria"),
    (0x458000, 0x45FFFF, "Denmark"),
    (0x460000, 0x467FFF, "Finland"),
    (0x480000, 0x497FFF, "Greece"),
    (0x498000, 0x49FFFF, "Hungary"),
    (0x4A0000, 0x4A7FFF, "Various European"),
    (0x500000, 0x5003FF, "Various European"),
    (0x600000, 0x67FFFF, "Various European"),
    (0x680000, 0x6FFFFF, "Portugal / Various"),
    (0x700000, 0x700FFF, "Various Middle East"),
    (0x710000, 0x71FFFF, "Various Middle East"),
    (0x720000, 0x727FFF, "Israel"),
    (0x738000, 0x73FFFF, "Various Middle East"),
    (0x740000, 0x747FFF, "Various South American"),
    (0x748000, 0x7BFFFF, "Various South American"),
    (0x7C0000, 0x7FFFFF, "Australia"),
    (0x800000, 0x83FFFF, "India"),
    (0x840000, 0x87FFFF, "Japan"),
    (0x880000, 0x887FFF, "China"),
    (0x890000, 0x890FFF, "Various Pacific"),
    (0x894000, 0x894FFF, "Various Pacific"),
    (0x895000, 0x8953FF, "Various Pacific"),
    (0x896000, 0x896FFF, "Various Pacific"),
    (0x897000, 0x89FFFF, "Various Asian"),
    (0x900000, 0x9FFFFF, "Various Asian"),
    (0xA00000, 0xAFFFFF, "United States"),
    (0xC00000, 0xC3FFFF, "Canada"),
    (0xE00000, 0xE3FFFF, "Argentina / Brazil Area"),
    (0xE40000, 0xEFFFFF, "Brazil"),
]


def ms_to_knots(speed_ms):
    """Convert m/s to knots"""
    if speed_ms is None:
        return None
    return speed_ms * 1.94384

def meters_to_feet(alt_m):
    """Convert meters to feet"""
    if alt_m is None:
        return None
    return alt_m * 3.28084

def fpm_from_ms(vertical_rate_ms):
    """Convert m/s vertical rate to ft/min"""
    if vertical_rate_ms is None:
        return None
    return vertical_rate_ms * 196.85

def lookup_icao_registry(icao_hex):
    """Look up ICAO address against known registries"""
    try:
        icao_int = int(icao_hex, 16)
        for start, end, registry in ICAO_RANGES:
            if start <= icao_int <= end:
                return registry
        return "UNREGISTERED/UNKNOWN"
    except (ValueError, TypeError):
        return "INVALID ICAO"


class FlightAnomalyDetector:
    """Core anomaly detection engine"""

    def __init__(self):
        self.anomalies = []
        self.flight_history = defaultdict(list)  # For multi-snapshot analysis
        self.stats = {
            'total_aircraft': 0,
            'with_position': 0,
            'anomalous': 0,
            'conventional': 0,
            'unusual': 0,
            'unexplained': 0,
            'unregistered_icao': 0,
        }

    def analyze_flight(self, flight_data):
        """Analyze a single flight state vector for anomalies"""
        icao = flight_data.get('icao', 'unknown')
        callsign = flight_data.get('callsign', '').strip()
        lat = flight_data.get('lat')
        lon = flight_data.get('lon')
        alt_m = flight_data.get('altitude')
        v_rate_ms = flight_data.get('vertical_rate')
        speed_ms = flight_data.get('speed')
        heading = flight_data.get('heading')
        on_ground = flight_data.get('on_ground', False)
        timestamp = flight_data.get('timestamp')
        baro_alt = flight_data.get('baro_altitude')
        geo_alt = flight_data.get('geo_altitude')
        squawk = flight_data.get('squawk')
        spi = flight_data.get('spi')

        # Convert units
        alt_ft = meters_to_feet(baro_alt if baro_alt is not None else alt_m)
        speed_kts = ms_to_knots(speed_ms)
        v_rate_fpm = fpm_from_ms(v_rate_ms)

        anomalies_found = []
        classification = "CONVENTIONAL"

        if on_ground:
            return None  # Skip ground traffic

        # ═══════════════════════ ANOMALY DETECTION ═══════════════════════

        # 1. VERTICAL RATE ANOMALIES
        if v_rate_fpm is not None:
            if abs(v_rate_fpm) > EXTREME_CLIMB:
                anomalies_found.append({
                    'type': 'EXTREME_VERTICAL_RATE',
                    'detail': f'Vertical rate: {v_rate_fpm:+.0f} ft/min — exceeds ALL known aircraft performance envelopes',
                    'severity': 'CRITICAL',
                    'classification': 'UNEXPLAINED'
                })
                classification = "UNEXPLAINED"
            elif abs(v_rate_fpm) > UNUSUAL_CLIMB_MAX:
                anomalies_found.append({
                    'type': 'UNUSUAL_VERTICAL_RATE',
                    'detail': f'Vertical rate: {v_rate_fpm:+.0f} ft/min — military/experimental performance range',
                    'severity': 'HIGH',
                    'classification': 'UNUSUAL'
                })
                if classification != "UNEXPLAINED":
                    classification = "UNUSUAL"

        # 2. SPEED ANOMALIES
        if speed_kts is not None and not on_ground:
            # Too slow for fixed-wing sustained flight
            if 0 < speed_kts < MIN_STALL_SPEED_KTS and alt_ft is not None and alt_ft > 1000:
                anomalies_found.append({
                    'type': 'SUB_STALL_SPEED',
                    'detail': f'Speed: {speed_kts:.1f} kts at {alt_ft:.0f} ft — below minimum stall speed for fixed-wing',
                    'severity': 'HIGH',
                    'classification': 'UNUSUAL'
                })
                if classification == "CONVENTIONAL":
                    classification = "UNUSUAL"

            # Supersonic
            if speed_kts > SUPERSONIC_THRESHOLD_KTS:
                anomalies_found.append({
                    'type': 'SUPERSONIC_SPEED',
                    'detail': f'Speed: {speed_kts:.1f} kts — SUPERSONIC (Mach {speed_kts/661:.2f})',
                    'severity': 'CRITICAL',
                    'classification': 'UNUSUAL'
                })
                if classification == "CONVENTIONAL":
                    classification = "UNUSUAL"

            # Hypersonic
            if speed_kts > HYPERSONIC_THRESHOLD_KTS:
                anomalies_found.append({
                    'type': 'HYPERSONIC_SPEED',
                    'detail': f'Speed: {speed_kts:.1f} kts — HYPERSONIC (Mach {speed_kts/661:.2f})',
                    'severity': 'CRITICAL',
                    'classification': 'UNEXPLAINED'
                })
                classification = "UNEXPLAINED"

        # 3. HOVER DETECTION (fixed-wing impossible, rotary unusual at altitude)
        if speed_kts is not None and alt_ft is not None:
            if speed_kts < HOVER_SPEED_THRESHOLD_KTS and alt_ft > 500 and not on_ground:
                hover_type = 'UNEXPLAINED' if alt_ft > 15000 else 'UNUSUAL'
                anomalies_found.append({
                    'type': 'HOVER_DETECTED',
                    'detail': f'Near-zero groundspeed ({speed_kts:.1f} kts) at {alt_ft:.0f} ft — possible hovering',
                    'severity': 'HIGH' if alt_ft > 15000 else 'MEDIUM',
                    'classification': hover_type
                })
                if hover_type == 'UNEXPLAINED':
                    classification = "UNEXPLAINED"
                elif classification == "CONVENTIONAL":
                    classification = "UNUSUAL"

        # 4. GRAVITATIONAL ANOMALY: altitude maintenance with zero groundspeed
        if speed_kts is not None and v_rate_fpm is not None and alt_ft is not None:
            if speed_kts < 5 and abs(v_rate_fpm) < 100 and alt_ft > 5000:
                anomalies_found.append({
                    'type': 'GRAVITATIONAL_ANOMALY',
                    'detail': f'Zero groundspeed ({speed_kts:.1f} kts), zero vertical rate ({v_rate_fpm:+.0f} fpm) at {alt_ft:.0f} ft — defies conventional aerodynamics',
                    'severity': 'CRITICAL',
                    'classification': 'UNEXPLAINED'
                })
                classification = "UNEXPLAINED"

        # 5. ALTITUDE/SPEED RATIO ANOMALY
        if v_rate_fpm is not None and speed_kts is not None and speed_kts > 0:
            climb_gradient = abs(v_rate_fpm) / (speed_kts * 101.269)  # fpm to ft/nm
            if climb_gradient > 0.5 and alt_ft is not None and alt_ft > 5000:
                anomalies_found.append({
                    'type': 'ANOMALOUS_CLIMB_GRADIENT',
                    'detail': f'Climb gradient: {climb_gradient:.2f} — exceeds aerodynamic efficiency limits',
                    'severity': 'HIGH',
                    'classification': 'UNUSUAL'
                })
                if classification == "CONVENTIONAL":
                    classification = "UNUSUAL"

        # 6. BAROMETRIC vs GEOMETRIC ALTITUDE DISCREPANCY
        if baro_alt is not None and geo_alt is not None:
            alt_discrepancy = abs(meters_to_feet(baro_alt) - meters_to_feet(geo_alt))
            if alt_discrepancy > 1000:
                anomalies_found.append({
                    'type': 'ALTITUDE_DISCREPANCY',
                    'detail': f'Baro/Geo altitude discrepancy: {alt_discrepancy:.0f} ft — possible sensor spoofing or atmospheric anomaly',
                    'severity': 'MEDIUM',
                    'classification': 'UNUSUAL'
                })
                if classification == "CONVENTIONAL":
                    classification = "UNUSUAL"

        # 7. SQUAWK CODE ANALYSIS
        if squawk:
            if squawk == '7500':
                anomalies_found.append({
                    'type': 'SQUAWK_HIJACK', 'detail': 'Squawk 7500 — HIJACK CODE',
                    'severity': 'CRITICAL', 'classification': 'CONVENTIONAL'
                })
            elif squawk == '7600':
                anomalies_found.append({
                    'type': 'SQUAWK_COMMS_FAIL', 'detail': 'Squawk 7600 — Communications Failure',
                    'severity': 'HIGH', 'classification': 'CONVENTIONAL'
                })
            elif squawk == '7700':
                anomalies_found.append({
                    'type': 'SQUAWK_EMERGENCY', 'detail': 'Squawk 7700 — GENERAL EMERGENCY',
                    'severity': 'CRITICAL', 'classification': 'CONVENTIONAL'
                })

        # 8. ICAO REGISTRY CHECK
        registry = lookup_icao_registry(icao)
        icao_flagged = False
        if registry in ("UNREGISTERED/UNKNOWN", "INVALID ICAO", "ICAO - Reserved/Unknown"):
            anomalies_found.append({
                'type': 'UNREGISTERED_ICAO',
                'detail': f'ICAO {icao} does not match any known national registry — {registry}',
                'severity': 'MEDIUM',
                'classification': 'UNUSUAL'
            })
            icao_flagged = True
            if classification == "CONVENTIONAL":
                classification = "UNUSUAL"

        # Build result
        if anomalies_found:
            return {
                'icao': icao,
                'callsign': callsign if callsign else 'N/A',
                'lat': lat,
                'lon': lon,
                'altitude_ft': alt_ft,
                'vertical_rate_fpm': v_rate_fpm,
                'speed_kts': speed_kts,
                'heading': heading,
                'timestamp': timestamp,
                'registry': registry,
                'icao_flagged': icao_flagged,
                'classification': classification,
                'anomalies': anomalies_found,
                'squawk': squawk,
                'on_ground': on_ground,
                'baro_alt_ft': meters_to_feet(baro_alt),
                'geo_alt_ft': meters_to_feet(geo_alt),
            }
        return None

    def generate_hypotheses(self, anomaly_result):
        """Generate physics-based hypotheses for UNEXPLAINED events"""
        hypotheses = []

        for anomaly in anomaly_result.get('anomalies', []):
            if anomaly['classification'] != 'UNEXPLAINED':
                continue

            atype = anomaly['type']

            if atype == 'EXTREME_VERTICAL_RATE':
                hypotheses.append({
                    'anomaly': atype,
                    'conventional': [
                        'ADS-B transponder malfunction / encoding error',
                        'GPS altitude spike due to ionospheric interference',
                        'Military rocket-assisted takeoff (RATO) or ejection event',
                        'Meteorological phenomena (severe updraft/downdraft in CB)',
                    ],
                    'unconventional': [
                        'Localized gravitational field manipulation reducing effective mass',
                        'Inertial mass reduction via electromagnetic field coupling (Podkletnov-type effect)',
                        'Alcubierre-like metric distortion creating localized spacetime gradient',
                    ]
                })
            elif atype == 'GRAVITATIONAL_ANOMALY':
                hypotheses.append({
                    'anomaly': atype,
                    'conventional': [
                        'Rotary-wing aircraft (helicopter) — ADS-B not distinguishing type',
                        'Lighter-than-air craft (blimp/aerostat) with precision station-keeping',
                        'Fixed-wing in strong headwind matching airspeed (apparent zero groundspeed)',
                        'Transponder data staleness / frozen GPS fix',
                    ],
                    'unconventional': [
                        'Electrogravitic lift system maintaining altitude without aerodynamic surfaces',
                        'Biefeld-Brown effect capacitor array generating ionic thrust',
                        'Casimir-effect vacuum energy extraction providing static lift',
                        'Rotating superconducting mass creating frame-dragging amplification',
                    ]
                })
            elif atype == 'HOVER_DETECTED':
                hypotheses.append({
                    'anomaly': atype,
                    'conventional': [
                        'Helicopter or multirotor UAS',
                        'VTOL aircraft (F-35B, V-22 Osprey) in hover mode',
                        'Tethered aerostat or balloon',
                        'ADS-B position data latency creating apparent hover',
                    ],
                    'unconventional': [
                        'Magnetohydrodynamic (MHD) propulsion system creating static lift',
                        'Diamagnetic levitation in localized high-gradient magnetic field',
                        'Exotic matter with negative mass-energy creating repulsive gravity',
                    ]
                })
            elif atype == 'HYPERSONIC_SPEED':
                hypotheses.append({
                    'anomaly': atype,
                    'conventional': [
                        'ADS-B transponder velocity encoding error',
                        'GPS velocity calculation error (multipath reflection)',
                        'Military hypersonic test vehicle (X-51, DF-ZF class)',
                    ],
                    'unconventional': [
                        'Warp bubble propulsion compressing spacetime ahead of vehicle',
                        'Quantum tunneling macro-scale effect on vehicle center of mass',
                        'Zero-point energy field propulsion eliminating inertial drag',
                    ]
                })

        return hypotheses


def fetch_opensky_data_authenticated():
    """Fetch live ADS-B data using OAuth2 client credentials"""
    print("\n  ⟐ Authenticating with OpenSky Network OAuth2...")

    try:
        # Get access token
        token_response = requests.post(
            OPENSKY_AUTH_URL,
            data={
                'grant_type': 'client_credentials',
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=15
        )

        if token_response.status_code == 200:
            token_data = token_response.json()
            access_token = token_data.get('access_token')
            if access_token:
                print("  ✓ Authentication successful (OAuth2 token acquired)")
                print(f"  ⟐ Fetching live ADS-B states...")
                response = requests.get(
                    OPENSKY_API_URL,
                    headers={'Authorization': f'Bearer {access_token}'},
                    timeout=30
                )
                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"  ⚠ Authenticated API call failed ({response.status_code}), trying anonymous...")
        else:
            print(f"  ⚠ Auth failed ({token_response.status_code}): {token_response.text[:200]}")
            print("  ⟐ Falling back to anonymous access...")

    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Auth request error: {e}")
        print("  ⟐ Falling back to anonymous access...")

    return None


def fetch_opensky_data_anonymous():
    """Fetch live ADS-B data without authentication (rate-limited)"""
    print("  ⟐ Fetching live ADS-B data (anonymous access)...")
    try:
        response = requests.get(OPENSKY_API_URL, timeout=30)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  ✗ API error: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"  ✗ Connection error: {e}")
        return None


def parse_opensky_states(data):
    """Parse OpenSky state vectors into structured flight data"""
    flights = []
    if not data or 'states' not in data:
        return flights

    for state in data['states']:
        if state is None:
            continue
        try:
            flight = {
                'icao': state[0] if state[0] else 'unknown',
                'callsign': (state[1] or '').strip(),
                'origin_country': state[2] if state[2] else 'Unknown',
                'timestamp': state[3],
                'last_contact': state[4],
                'lon': state[5],
                'lat': state[6],
                'baro_altitude': state[7],      # meters
                'on_ground': state[8],
                'speed': state[9],               # m/s ground speed
                'heading': state[10],            # degrees
                'vertical_rate': state[11],      # m/s
                'sensors': state[12],
                'geo_altitude': state[13],       # meters
                'squawk': state[14],
                'spi': state[15],
                'position_source': state[16],
                'altitude': state[7],            # alias for baro_altitude
            }
            flights.append(flight)
        except (IndexError, TypeError):
            continue

    return flights


def print_banner():
    print("""
\033[96m╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   █████╗ ██████╗ ███████╗      ██████╗      █████╗ ███╗   ██╗ ██████╗       ║
║  ██╔══██╗██╔══██╗██╔════╝      ██╔══██╗    ██╔══██╗████╗  ██║██╔═══██╗      ║
║  ███████║██║  ██║███████╗█████╗██████╔╝    ███████║██╔██╗ ██║██║   ██║      ║
║  ██╔══██║██║  ██║╚════██║╚════╝██╔══██╗    ██╔══██║██║╚██╗██║██║   ██║      ║
║  ██║  ██║██████╔╝███████║      ██████╔╝    ██║  ██║██║ ╚████║╚██████╔╝      ║
║  ╚═╝  ╚═╝╚═════╝ ╚══════╝      ╚═════╝     ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝       ║
║                                                                              ║
║        ◈ AEROSPACE ANOMALY DETECTION & ANTIGRAVITY RESEARCH ◈               ║
║           ADS-B Transponder Analysis  ·  OpenSky Network Feed                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝\033[0m
""")


def print_section(title):
    width = 76
    print(f"\n\033[93m{'━' * width}")
    print(f"  ◈ {title}")
    print(f"{'━' * width}\033[0m")


def severity_color(severity):
    colors = {
        'CRITICAL': '\033[91m',  # red
        'HIGH': '\033[33m',      # yellow
        'MEDIUM': '\033[36m',    # cyan
        'LOW': '\033[37m',       # white
    }
    return colors.get(severity, '\033[0m')


def classification_color(cls):
    colors = {
        'CONVENTIONAL': '\033[32m',   # green
        'UNUSUAL': '\033[33m',        # yellow
        'UNEXPLAINED': '\033[91m',    # red
    }
    return colors.get(cls, '\033[0m')


def main():
    print_banner()

    print(f"  Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  Analysis Engine: Aerospace Anomaly Detector v2.0")
    print(f"  Data Source: OpenSky Network (live ADS-B)")

    # ─── FETCH DATA ──────────────────────────────────────────────────────

    print_section("DATA ACQUISITION")

    data = fetch_opensky_data_authenticated()
    if not data:
        data = fetch_opensky_data_anonymous()

    if not data or 'states' not in data:
        print("\n  \033[91m✗ CRITICAL: Unable to fetch ADS-B data from OpenSky Network.\033[0m")
        print("  Possible causes:")
        print("    • Rate limiting (anonymous: 1 req/10s, authenticated: 1 req/5s)")
        print("    • Network connectivity issue")
        print("    • OpenSky API downtime")
        print("\n  Retry in 15 seconds or check https://opensky-network.org/network/explorer")
        sys.exit(1)

    api_timestamp = data.get('time', 0)
    api_time_str = datetime.fromtimestamp(api_timestamp, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC') if api_timestamp else 'Unknown'
    total_states = len(data.get('states', []))

    print(f"\n  ✓ Data acquired successfully")
    print(f"    API Timestamp : {api_time_str}")
    print(f"    Total Aircraft: {total_states}")

    # ─── PARSE & ANALYZE ─────────────────────────────────────────────────

    print_section("FLIGHT DATA PARSING")

    flights = parse_opensky_states(data)
    print(f"  Parsed {len(flights)} flight state vectors")

    detector = FlightAnomalyDetector()
    detector.stats['total_aircraft'] = len(flights)

    airborne_flights = [f for f in flights if not f.get('on_ground', True)]
    grounded_flights = [f for f in flights if f.get('on_ground', True)]
    with_position = [f for f in flights if f.get('lat') is not None]

    print(f"  Airborne        : {len(airborne_flights)}")
    print(f"  On Ground       : {len(grounded_flights)}")
    print(f"  With Position   : {len(with_position)}")
    detector.stats['with_position'] = len(with_position)

    # ─── ANOMALY DETECTION ───────────────────────────────────────────────

    print_section("ANOMALY DETECTION ENGINE")
    print(f"  Scanning {len(flights)} aircraft for anomalous behavior...\n")

    anomaly_results = []
    for flight in flights:
        result = detector.analyze_flight(flight)
        if result:
            anomaly_results.append(result)

    # Classify counts
    for r in anomaly_results:
        if r['classification'] == 'CONVENTIONAL':
            detector.stats['conventional'] += 1
        elif r['classification'] == 'UNUSUAL':
            detector.stats['unusual'] += 1
        elif r['classification'] == 'UNEXPLAINED':
            detector.stats['unexplained'] += 1
        if r.get('icao_flagged'):
            detector.stats['unregistered_icao'] += 1

    detector.stats['anomalous'] = len(anomaly_results)

    # ─── RESULTS ─────────────────────────────────────────────────────────

    print_section("ANALYSIS RESULTS — SUMMARY")

    anomaly_pct = (detector.stats['anomalous'] / detector.stats['total_aircraft'] * 100) if detector.stats['total_aircraft'] > 0 else 0

    print(f"""
  ┌─────────────────────────────────────────────────────────────┐
  │  Total Aircraft Analyzed     : {detector.stats['total_aircraft']:>8,}                     │
  │  Aircraft with Position Data : {detector.stats['with_position']:>8,}                     │
  │  ──────────────────────────────────────────────────────     │
  │  \033[91mAnomalous Flights Detected   : {detector.stats['anomalous']:>8,}  ({anomaly_pct:.1f}%)\033[0m          │
  │  ──────────────────────────────────────────────────────     │
  │  \033[32m  CONVENTIONAL               : {detector.stats['conventional']:>8,}\033[0m                     │
  │  \033[33m  UNUSUAL                     : {detector.stats['unusual']:>8,}\033[0m                     │
  │  \033[91m  UNEXPLAINED                 : {detector.stats['unexplained']:>8,}\033[0m                     │
  │  ──────────────────────────────────────────────────────     │
  │  Unregistered ICAO Addresses : {detector.stats['unregistered_icao']:>8,}                     │
  └─────────────────────────────────────────────────────────────┘
""")

    # ─── DETAILED ANOMALY REPORTS ────────────────────────────────────────

    # Sort by severity: UNEXPLAINED → UNUSUAL → CONVENTIONAL
    severity_order = {'UNEXPLAINED': 0, 'UNUSUAL': 1, 'CONVENTIONAL': 2}
    anomaly_results.sort(key=lambda x: severity_order.get(x['classification'], 3))

    # Print top anomalies (limit to 50 for readability)
    display_limit = min(50, len(anomaly_results))

    if anomaly_results:
        print_section(f"DETAILED ANOMALY REPORTS (Top {display_limit} of {len(anomaly_results)})")

        for i, result in enumerate(anomaly_results[:display_limit]):
            cls_color = classification_color(result['classification'])
            reset = '\033[0m'

            print(f"\n  {'─' * 72}")
            print(f"  ⟐ ANOMALY #{i+1}")
            print(f"    ICAO        : {result['icao']}")
            print(f"    Callsign    : {result['callsign']}")
            print(f"    Registry    : {result['registry']}")
            print(f"    Position    : {result['lat']:.4f}°N, {result['lon']:.4f}°E" if result['lat'] and result['lon'] else "    Position    : Unknown")
            print(f"    Altitude    : {result['altitude_ft']:.0f} ft" if result['altitude_ft'] else "    Altitude    : N/A")
            print(f"    Speed       : {result['speed_kts']:.1f} kts" if result['speed_kts'] else "    Speed       : N/A")
            print(f"    Heading     : {result['heading']:.1f}°" if result['heading'] else "    Heading     : N/A")
            print(f"    Vert. Rate  : {result['vertical_rate_fpm']:+.0f} ft/min" if result['vertical_rate_fpm'] else "    Vert. Rate  : N/A")
            print(f"    Squawk      : {result['squawk']}" if result['squawk'] else "    Squawk      : N/A")
            print(f"    Classification: {cls_color}[{result['classification']}]{reset}")

            if result.get('baro_alt_ft') and result.get('geo_alt_ft'):
                print(f"    Baro Alt    : {result['baro_alt_ft']:.0f} ft")
                print(f"    Geo Alt     : {result['geo_alt_ft']:.0f} ft")

            print(f"\n    Detected Anomalies:")
            for anomaly in result['anomalies']:
                sev_c = severity_color(anomaly['severity'])
                cls_c = classification_color(anomaly['classification'])
                print(f"      {sev_c}[{anomaly['severity']:>8}]{reset} {anomaly['type']}")
                print(f"               {anomaly['detail']}")
                print(f"               Classification: {cls_c}[{anomaly['classification']}]{reset}")

        # ─── HYPOTHESIS GENERATION ───────────────────────────────────────

        unexplained = [r for r in anomaly_results if r['classification'] == 'UNEXPLAINED']

        if unexplained:
            print_section(f"HYPOTHESIS GENERATION — {len(unexplained)} UNEXPLAINED EVENT(S)")

            for i, result in enumerate(unexplained[:20]):
                hypotheses = detector.generate_hypotheses(result)
                if hypotheses:
                    print(f"\n  {'━' * 72}")
                    print(f"  AIRCRAFT: {result['icao']} / {result['callsign']}")
                    print(f"  Position: {result['lat']:.4f}°N, {result['lon']:.4f}°E" if result['lat'] and result['lon'] else "  Position: Unknown")
                    print(f"  Altitude: {result['altitude_ft']:.0f} ft" if result['altitude_ft'] else "  Altitude: N/A")

                    for h in hypotheses:
                        print(f"\n    ◈ Anomaly Type: {h['anomaly']}")

                        print(f"\n    \033[32mConventional Explanations (Occam's Razor):\033[0m")
                        for j, exp in enumerate(h['conventional'], 1):
                            print(f"      {j}. {exp}")

                        print(f"\n    \033[91mUnconventional / Exotic Physics Hypotheses:\033[0m")
                        for j, exp in enumerate(h['unconventional'], 1):
                            print(f"      {j}. {exp}")

    # ─── RAW DATA TABLE (Top 20 flights) ────────────────────────────────

    print_section("RAW ADS-B DATA FEED (Top 30 Airborne Aircraft)")
    print()
    header = f"  {'ICAO':<10} {'Callsign':<10} {'Lat':>10} {'Lon':>10} {'Alt(ft)':>10} {'VRate(fpm)':>12} {'Spd(kts)':>10} {'Hdg':>7} {'Country':<15}"
    print(f"\033[96m{header}\033[0m")
    print(f"  {'─' * len(header)}")

    displayed = 0
    for f in flights:
        if f.get('on_ground', True):
            continue
        if displayed >= 30:
            break

        lat_s = f"{f['lat']:.4f}" if f['lat'] is not None else "N/A"
        lon_s = f"{f['lon']:.4f}" if f['lon'] is not None else "N/A"
        alt_s = f"{meters_to_feet(f['baro_altitude']):.0f}" if f['baro_altitude'] is not None else "N/A"
        vr_s = f"{fpm_from_ms(f['vertical_rate']):+.0f}" if f['vertical_rate'] is not None else "N/A"
        spd_s = f"{ms_to_knots(f['speed']):.1f}" if f['speed'] is not None else "N/A"
        hdg_s = f"{f['heading']:.1f}" if f['heading'] is not None else "N/A"
        cs = f['callsign'] if f['callsign'] else 'N/A'
        country = f.get('origin_country', 'Unknown')[:14]

        print(f"  {f['icao']:<10} {cs:<10} {lat_s:>10} {lon_s:>10} {alt_s:>10} {vr_s:>12} {spd_s:>10} {hdg_s:>7} {country:<15}")
        displayed += 1

    # ─── GEOGRAPHIC DISTRIBUTION ─────────────────────────────────────────

    print_section("ORIGIN COUNTRY DISTRIBUTION (Top 15)")

    country_count = defaultdict(int)
    for f in flights:
        if not f.get('on_ground', True):
            country_count[f.get('origin_country', 'Unknown')] += 1

    sorted_countries = sorted(country_count.items(), key=lambda x: x[1], reverse=True)[:15]
    max_count = sorted_countries[0][1] if sorted_countries else 1

    for country, count in sorted_countries:
        bar_len = int(count / max_count * 40)
        bar = '█' * bar_len
        print(f"  {country:<20} {count:>6}  \033[36m{bar}\033[0m")

    # ─── FINAL ASSESSMENT ────────────────────────────────────────────────

    print_section("FINAL ASSESSMENT")

    if detector.stats['unexplained'] > 0:
        print(f"""
  \033[91m╔══════════════════════════════════════════════════════════════════╗
  ║  ⚠  {detector.stats['unexplained']} UNEXPLAINED ANOMALI{'ES' if detector.stats['unexplained'] > 1 else 'Y'} DETECTED                              ║
  ║                                                                  ║
  ║  These events exhibit characteristics inconsistent with known    ║
  ║  aircraft performance envelopes and conventional aerodynamics.   ║
  ║                                                                  ║
  ║  RECOMMENDATION: Cross-reference with radar data, satellite      ║
  ║  imagery, and military flight schedules for further analysis.    ║
  ╚══════════════════════════════════════════════════════════════════╝\033[0m
""")
    elif detector.stats['unusual'] > 0:
        print(f"""
  \033[33m╔══════════════════════════════════════════════════════════════════╗
  ║  ⚡ {detector.stats['unusual']} UNUSUAL ANOMALI{'ES' if detector.stats['unusual'] > 1 else 'Y'} DETECTED                                 ║
  ║                                                                  ║
  ║  These events show deviations from standard flight profiles      ║
  ║  but may be attributable to military operations, sensor errors,  ║
  ║  rotary-wing aircraft, or atmospheric conditions.                ║
  ╚══════════════════════════════════════════════════════════════════╝\033[0m
""")
    else:
        print(f"""
  \033[32m╔══════════════════════════════════════════════════════════════════╗
  ║  ✓ NO ANOMALIES DETECTED                                        ║
  ║                                                                  ║
  ║  All {detector.stats['total_aircraft']:,} aircraft operating within normal parameters.    ║
  ╚══════════════════════════════════════════════════════════════════╝\033[0m
""")

    print(f"\n  Analysis completed at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    # ─── SAVE REPORT TO FILE ─────────────────────────────────────────────
    save_report(anomaly_results, detector, flights, api_time_str)


def save_report(anomaly_results, detector, flights, api_time_str):
    """Save analysis results to JSON for further processing"""
    report = {
        'analysis_timestamp': datetime.now(timezone.utc).isoformat(),
        'api_timestamp': api_time_str,
        'statistics': detector.stats,
        'anomalies': [],
    }

    for r in anomaly_results:
        entry = {
            'icao': r['icao'],
            'callsign': r['callsign'],
            'lat': r['lat'],
            'lon': r['lon'],
            'altitude_ft': r['altitude_ft'],
            'speed_kts': r['speed_kts'],
            'vertical_rate_fpm': r['vertical_rate_fpm'],
            'heading': r['heading'],
            'classification': r['classification'],
            'registry': r['registry'],
            'anomalies': r['anomalies'],
        }
        if r['classification'] == 'UNEXPLAINED':
            entry['hypotheses'] = detector.generate_hypotheses(r)
        report['anomalies'].append(entry)

    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'adsb_anomaly_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    print(f"  📄 Full report saved to: {report_path}")


if __name__ == '__main__':
    main()
