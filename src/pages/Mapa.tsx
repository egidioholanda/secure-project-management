import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { MapPin, Search, FolderKanban, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeoProject extends Project {
  lat: number;
  lng: number;
  geocodeStatus: "ok" | "error";
  displayAddress: string;
}

// ─── Address helpers ──────────────────────────────────────────────────────────

const SEP = "|||";

function parseAddr(raw: string) {
  const parts = raw.split(SEP);
  return parts.length === 3
    ? { street: parts[0], city: parts[1], state: parts[2] }
    : { street: raw,      city: "",       state: ""       };
}

function geoQuery(raw: string): string | null {
  const { street, city, state } = parseAddr(raw || "");
  if (city && state) return `${street ? street + ", " : ""}${city}, ${state}, Brasil`;
  if (city)          return `${city}, Brasil`;
  if (street)        return `${street}, Brasil`;
  return null;
}

function displayAddr(raw: string) {
  const { street, city, state } = parseAddr(raw || "");
  return [street, city, state].filter(Boolean).join(", ");
}

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; hex: string }> = {
  planning:       { label: "Planejamento",  hex: "#3b82f6" },
  execution:      { label: "Em Execução",   hex: "#f97316" },
  completed:      { label: "Concluído",     hex: "#10b981" },
  onhold:         { label: "Em Espera",     hex: "#f59e0b" },
  "Em Andamento": { label: "Em Andamento",  hex: "#f97316" },
  "in_progress":  { label: "Em Andamento",  hex: "#f97316" },
  "Planejamento": { label: "Planejamento",  hex: "#3b82f6" },
  "Concluído":    { label: "Concluído",     hex: "#10b981" },
};
const st = (s: string) => STATUS[s] ?? { label: s, hex: "#6b7280" };

// ─── Marker icon ─────────────────────────────────────────────────────────────

function dotIcon(hex: string, active = false) {
  const sz  = active ? 18 : 13;
  const ring = active ? `box-shadow:0 0 0 4px ${hex}44,0 2px 8px rgba(0,0,0,.4)` : "box-shadow:0 2px 5px rgba(0,0,0,.35)";
  return L.divIcon({
    className: "",
    html: `<div style="width:${sz}px;height:${sz}px;background:${hex};border:2.5px solid #fff;border-radius:50%;${ring}"></div>`,
    iconSize:    [sz, sz],
    iconAnchor:  [sz / 2, sz / 2],
    popupAnchor: [0, -(sz / 2 + 4)],
  });
}

// ─── FlyTo ───────────────────────────────────────────────────────────────────

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 14, { duration: 1.2 }); }, [lat, lng, map]);
  return null;
}

// ─── Geocoding ────────────────────────────────────────────────────────────────

async function geocode(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`,
      { headers: { "Accept-Language": "pt-BR,pt;q=0.9" } }
    );
    const d = await r.json();
    return d.length ? { lat: +d[0].lat, lng: +d[0].lon } : null;
  } catch { return null; }
}

// ─── Page ────────────────────────────────────────────────────────────────────

const LEGEND = [
  { label: "Planejamento", hex: "#3b82f6" },
  { label: "Em Execução",  hex: "#f97316" },
  { label: "Concluído",    hex: "#10b981" },
  { label: "Em Espera",    hex: "#f59e0b" },
];

// AppLayout: header fixo 64px (pt-16) + padding inferior p-6 (24px) + nossa topbar (~53px)
const MAP_H = "calc(100vh - 64px - 24px - 53px)";

const Mapa = () => {
  const { projects, loading } = useProjects();
  const [geoProjects, setGeoProjects] = useState<GeoProject[]>([]);
  const [geocoding,   setGeocoding]   = useState(false);
  const [search,      setSearch]      = useState("");
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [flyTarget,   setFlyTarget]   = useState<{ lat: number; lng: number } | null>(null);
  const didGeocode = useRef(false);

  useEffect(() => {
    if (loading || projects.length === 0 || didGeocode.current) return;
    didGeocode.current = true;
    setGeocoding(true);

    (async () => {
      const out: GeoProject[] = [];
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i];
        const q = geoQuery(p.address || "");
        let lat = 0, lng = 0, ok = false;
        if (q) {
          const g = await geocode(q);
          if (g) { lat = g.lat; lng = g.lng; ok = true; }
          if (i < projects.length - 1) await new Promise(r => setTimeout(r, 1100));
        }
        out.push({ ...p, lat, lng, geocodeStatus: ok ? "ok" : "error", displayAddress: displayAddr(p.address || "") });
      }
      setGeoProjects(out);
      setGeocoding(false);
    })();
  }, [loading, projects]);

  const mapped   = geoProjects.filter(p => p.geocodeStatus === "ok");
  const failed   = geoProjects.filter(p => p.geocodeStatus === "error");
  const filtered = geoProjects.filter(p =>
    [p.name, p.client, p.displayAddress].some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const select = useCallback((p: GeoProject) => {
    if (p.geocodeStatus !== "ok") return;
    setActiveId(p.id);
    setFlyTarget({ lat: p.lat, lng: p.lng });
  }, []);

  return (
    // Negative horizontal and bottom margins to break out of AppLayout p-6 padding
    <div style={{ margin: "0 -24px -24px -24px" }}>

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 border-b border-border bg-card"
           style={{ height: 53 }}>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Mapa de Projetos</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {geocoding && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Localizando endereços…
            </span>
          )}
          {!geocoding && geoProjects.length > 0 && (
            <>
              <span className="flex items-center gap-1.5 text-success font-medium">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />
                {mapped.length} localizado{mapped.length !== 1 ? "s" : ""}
              </span>
              {failed.length > 0 && (
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {failed.length} sem endereço
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="flex" style={{ height: MAP_H }}>

        {/* Sidebar */}
        <div className="border-r border-border bg-card flex flex-col" style={{ width: 280, minWidth: 280 }}>
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 h-9 text-sm" placeholder="Buscar projeto…"
                     value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading || (geocoding && geoProjects.length === 0) ? (
              <div className="p-3 space-y-2">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhum projeto encontrado</p>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map(p => {
                  const info     = st(p.status);
                  const isActive = p.id === activeId;
                  const hasGeo   = p.geocodeStatus === "ok";
                  return (
                    <button key={p.id} onClick={() => select(p)} disabled={!hasGeo}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2.5 transition-colors focus:outline-none hover:bg-muted/70",
                        isActive && "bg-primary/8 border border-primary/20",
                        !hasGeo  && "opacity-50 cursor-not-allowed"
                      )}>
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="font-semibold text-sm leading-tight line-clamp-1">{p.name}</p>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: info.hex }} />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.client}</p>
                      {p.displayAddress && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />{p.displayAddress}
                        </p>
                      )}
                      {!hasGeo && (
                        <p className="text-xs text-warning mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />Sem localização
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border flex-shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Legenda</p>
            <div className="space-y-1.5">
              {LEGEND.map(l => (
                <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.hex }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative flex-1">
          {geocoding && mapped.length === 0 && (
            <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Geocodificando endereços…</p>
            </div>
          )}

          <MapContainer
            center={[-14.235, -51.925]}
            zoom={4}
            style={{ width: "100%", height: MAP_H }}
            zoomControl
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

            {mapped.map(p => {
              const info     = st(p.status);
              const isActive = p.id === activeId;
              const types    = p.type.split(",").map(t => t.trim()).filter(Boolean);
              return (
                <Marker key={p.id} position={[p.lat, p.lng]}
                        icon={dotIcon(info.hex, isActive)}
                        eventHandlers={{ click: () => setActiveId(p.id) }}>
                  <Popup maxWidth={260}>
                    <div style={{ padding: "4px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <strong style={{ fontSize: 13 }}>{p.name}</strong>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 999,
                          backgroundColor: `${info.hex}20`, color: info.hex, whiteSpace: "nowrap",
                        }}>{info.label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>📁 {p.client}</span>
                      {p.displayAddress && (
                        <span style={{ fontSize: 12, color: "#6b7280" }}>📍 {p.displayAddress}</span>
                      )}
                      {p.manager && (
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          <strong>Gerente:</strong> {p.manager}
                        </span>
                      )}
                      {types.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingTop: 4, borderTop: "1px solid #f0f0f0" }}>
                          {types.map(t => (
                            <span key={t} style={{
                              fontSize: 10, padding: "2px 6px", borderRadius: 4,
                              background: "#f3f4f6", color: "#374151", fontWeight: 500,
                            }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default Mapa;
