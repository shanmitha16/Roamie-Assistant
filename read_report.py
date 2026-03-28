import json

with open('adsb_anomaly_report.json', 'r') as f:
    data = json.load(f)

print("=" * 70)
print("  ANALYSIS STATISTICS")
print("=" * 70)
for k, v in data['statistics'].items():
    print(f"  {k:<30}: {v}")

print(f"\n  Total anomalies in report: {len(data['anomalies'])}")

print("\n" + "=" * 70)
print("  ANOMALOUS FLIGHTS")
print("=" * 70)

for i, a in enumerate(data['anomalies'][:50]):
    print(f"\n  --- Anomaly #{i+1} ---")
    print(f"  ICAO       : {a['icao']}")
    print(f"  Callsign   : {a['callsign']}")
    print(f"  Registry   : {a['registry']}")
    print(f"  Position   : {a.get('lat', 'N/A')}, {a.get('lon', 'N/A')}")
    print(f"  Altitude   : {a.get('altitude_ft', 'N/A')} ft")
    print(f"  Speed      : {a.get('speed_kts', 'N/A')} kts")
    print(f"  Vert Rate  : {a.get('vertical_rate_fpm', 'N/A')} fpm")
    print(f"  Heading    : {a.get('heading', 'N/A')}")
    print(f"  Class      : [{a['classification']}]")
    for an in a['anomalies']:
        print(f"    [{an['severity']:>8}] {an['type']}: {an['detail']}")
    if 'hypotheses' in a and a['hypotheses']:
        print(f"  HYPOTHESES:")
        for h in a['hypotheses']:
            print(f"    Anomaly: {h['anomaly']}")
            print(f"    Conventional:")
            for j, c in enumerate(h['conventional'], 1):
                print(f"      {j}. {c}")
            print(f"    Unconventional:")
            for j, u in enumerate(h['unconventional'], 1):
                print(f"      {j}. {u}")
