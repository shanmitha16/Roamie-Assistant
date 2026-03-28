import json
import uuid
import folium
from folium import plugins
import os

def load_data():
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'adsb_anomaly_report.json')
    with open(report_path, 'r') as f:
        return json.load(f)

def create_map(report_data):
    # Initialize map
    m = folium.Map(location=[20, 0], zoom_start=2, tiles='CartoDB dark_matter')
    
    # Create feature groups for different anomaly classes
    unexplained_group = folium.FeatureGroup(name='🔴 UNEXPLAINED Anomalies')
    unusual_group = folium.FeatureGroup(name='🟡 UNUSUAL Anomalies (Top 100)')
    
    # Process UNEXPLAINED First
    unexplained = [a for a in report_data['anomalies'] if a['classification'] == 'UNEXPLAINED']
    for a in unexplained:
        lat = a.get('lat')
        lon = a.get('lon')
        if lat is None or lon is None:
            continue
            
        alt = f"{a.get('altitude_ft', 0):.0f} ft"
        speed = f"{a.get('speed_kts', 0):.1f} kts"
        vrate = f"{a.get('vertical_rate_fpm', 0):+.0f} fpm"
        icao = a.get('icao', 'Unknown')
        callsign = a.get('callsign', 'Unknown')
        
        # Build tooltip and popup
        tooltip = f"UNEXPLAINED: {callsign} ({icao})"
        
        popup_html = f"""
        <div style="font-family: Arial, sans-serif; width: 300px;">
            <h4 style="color: #ff3333; margin-bottom: 5px;">🔴 UNEXPLAINED ANOMALY</h4>
            <b>Callsign:</b> {callsign}<br>
            <b>ICAO:</b> {icao}<br>
            <b>Altitude:</b> {alt}<br>
            <b>Speed:</b> {speed}<br>
            <b>V-Rate:</b> {vrate}<br>
            <hr style="margin: 5px 0;">
            <b>Anomalies Detected:</b><ul style="margin-top: 5px; padding-left: 20px;">
        """
        for an in a['anomalies']:
            popup_html += f"<li>{an['type']}</li>"
        popup_html += "</ul></div>"
        
        folium.Marker(
            location=[lat, lon],
            popup=folium.Popup(popup_html, max_width=350),
            tooltip=tooltip,
            icon=folium.Icon(color='red', icon='exclamation-sign')
        ).add_to(unexplained_group)

    # Process Top 100 UNUSUAL
    unusual = [a for a in report_data['anomalies'] if a['classification'] == 'UNUSUAL']
    for a in unusual[:100]:
        lat = a.get('lat')
        lon = a.get('lon')
        if lat is None or lon is None:
            continue
            
        alt = f"{a.get('altitude_ft', 0):.0f} ft"
        speed = f"{a.get('speed_kts', 0):.1f} kts"
        icao = a.get('icao', 'Unknown')
        callsign = a.get('callsign', 'Unknown')
        
        popup_html = f"""
        <div style="font-family: Arial, sans-serif; width: 250px;">
            <h5 style="color: #ffcc00; margin-bottom: 5px;">🟡 UNUSUAL EVENT</h5>
            <b>Callsign:</b> {callsign}<br>
            <b>ICAO:</b> {icao}<br>
            <b>Altitude:</b> {alt}<br>
            <b>Speed:</b> {speed}<br>
        </div>
        """
        
        folium.CircleMarker(
            location=[lat, lon],
            radius=6,
            popup=folium.Popup(popup_html, max_width=300),
            tooltip=f"{callsign} ({icao})",
            color='#ffcc00',
            fill=True,
            fillColor='#ffcc00'
        ).add_to(unusual_group)

    # Add feature groups to map
    unexplained_group.add_to(m)
    unusual_group.add_to(m)
    
    # Add Layer Control
    folium.LayerControl().add_to(m)
    
    # Save map
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'anomalies_map.html')
    m.save(output_path)
    print(f"Interactive map saved to {output_path}")

if __name__ == "__main__":
    report_data = load_data()
    create_map(report_data)
