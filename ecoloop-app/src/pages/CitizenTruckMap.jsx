import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, 
  Clock, 
  MapPin, 
  Navigation, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import L from 'leaflet';

// Leaflet Icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create Truck Marker Icon
const truckIcon = L.divIcon({
  className: 'truck-custom-icon',
  html: `
    <div style="background-color: #10b981; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 14px rgba(16,185,129,0.7); display: flex; align-items: center; justify-content: center; color: white;">
      🚚
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Household Target Marker Icon
const homeIcon = L.divIcon({
  className: 'home-custom-icon',
  html: `
    <div style="background-color: #06b6d4; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 14px rgba(6,182,212,0.7); display: flex; align-items: center; justify-content: center; color: white;">
      🏠
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function CitizenTruckMap() {
  // Household Location (Mayur Heights, Aundh, Ward 14)
  const householdCoords = [18.5580, 73.8055];

  // Micro-tipper GPS route coordinates approaching household
  const routePath = [
    [18.5629, 73.8087], // DWCC Central Hub
    [18.5615, 73.8075],
    [18.5600, 73.8068],
    [18.5592, 73.8060], // Current Simulated Truck Position
    [18.5580, 73.8055], // Household Stop
    [18.5540, 73.7930], // Next Ward Stop
  ];

  // Dynamic moving truck position state
  const [truckPos, setTruckPos] = useState([18.5592, 73.8060]);
  const [etaMinutes, setEtaMinutes] = useState(6);
  const [distanceMeters, setDistanceMeters] = useState(420);
  const [audioChimeEnabled, setAudioChimeEnabled] = useState(true);
  const [wasteReadyConfirmed, setWasteReadyConfirmed] = useState(false);

  // Live truck simulation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setDistanceMeters((prev) => {
        if (prev <= 120) {
          return 420; // reset loop for demo
        }
        const nextDist = prev - 15;
        setEtaMinutes(Math.max(1, Math.round(nextDist / 70)));
        return nextDist;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  const handleConfirmReady = () => {
    setWasteReadyConfirmed(true);
    if ('speechSynthesis' in window && audioChimeEnabled) {
      const speech = new SpeechSynthesisUtterance("Driver notified: Your segregated waste is ready at doorstep.");
      speech.lang = 'en-IN';
      window.speechSynthesis.speak(speech);
    }
  };

  return (
    <div className="space-y-5">
      {/* Real-time Status Card */}
      <div className="glass-panel p-5 rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Truck className="w-7 h-7" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 animate-ping"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold font-['Outfit'] text-white">
                Micro-Tipper #MH-12-Q-4081
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ON ROUTE
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Driver: <strong className="text-slate-200">Santosh Shinde</strong> • Ward 14 Morning Route
            </p>

            <div className="flex items-center gap-3 text-xs font-mono text-cyan-300 mt-2">
              <span className="flex items-center gap-1 font-bold">
                <Navigation className="w-3.5 h-3.5" />
                <span>{distanceMeters} meters away</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                <span>ETA: ~{etaMinutes} minutes</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setAudioChimeEnabled(!audioChimeEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-colors ${
              audioChimeEnabled 
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Audio Arrival Chime"
          >
            {audioChimeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Chime {audioChimeEnabled ? 'On' : 'Off'}</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmReady}
            disabled={wasteReadyConfirmed}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              wasteReadyConfirmed
                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 cursor-default'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-950/50 active:scale-95'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{wasteReadyConfirmed ? '✓ Segregated Waste Confirmed Ready' : 'I Have Segregated Waste Ready'}</span>
          </button>
        </div>
      </div>

      {/* Embedded Citizen View of Leaflet Map */}
      <div className="glass-panel p-2 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
        <div className="h-[460px] w-full rounded-2xl overflow-hidden relative z-0">
          <MapContainer
            center={[18.5595, 73.8065]}
            zoom={15}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Approaching Route Path */}
            <Polyline
              positions={routePath}
              color="#06b6d4"
              weight={5}
              opacity={0.85}
              dashArray="6, 6"
            />

            {/* Truck Marker */}
            <Marker position={truckPos} icon={truckIcon}>
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <div className="font-bold text-slate-900">Micro-Tipper #MH-12-Q-4081</div>
                  <div className="text-slate-600 font-mono">Distance: {distanceMeters}m • ETA: {etaMinutes} min</div>
                </div>
              </Popup>
            </Marker>

            {/* Household Marker */}
            <Marker position={householdCoords} icon={homeIcon}>
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <div className="font-bold text-slate-900">Your Home (#PUN-W14-D402)</div>
                  <div className="text-emerald-700 font-mono">Mayur Heights, Flat 402, Aundh</div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Floating Map Guidance HUD */}
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Truck Live GPS Location</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
              <span>Your Doorstep (#PUN-W14-D402)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
