import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin, Search, FolderKanban, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeoProject extends Project {
  lat: number;
  lng: number;
  geocodeStatus: "ok" | "error";
  displayAddress: string;
}

interface ParsedAddress {
  street: string;
  city: string;
  state: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEPARATOR = "|||";

function parseAddress(raw: string): ParsedAddress {
  if (!raw) return { street: "", city: "", state: "" };
  const parts = raw.split(SEPARATOR);
  if (parts.length === 3) return { street: parts[0], city: parts[1], state: parts[2] };
  return { street: raw, city: "", state: "" };
}

function buildGeoQuery(raw: string): string | null {
  const { street, city, state } = parseAddress(raw);
  if (city && state) return `${street ? street + ", " : ""}${city}, ${state}, Brasil`;
  if (city) return `${city}, Brasil`;
  if (street) return `${street}, Brasil`;
  return null;
}

function formatDisplayAddress(raw: string): string {
  const { street, city, state } = parseAddress(raw);
  return [street, city, state].filter(Boolean).join(", ");
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; hex: string }> = {
  planning:  { label: "Planejamento", color: "bg-primary/10 text-primary",   hex: "#3b82f6" },
  execution: { label: "Em Execução",  color: "bg-accent/10 text-accent",     hex: "#f97316" },
  completed: { label: "Concluído",    color: "bg-success/10 text-success",   hex: "#10b981" },
  onhold:    { label: "Em Espera",    color: "bg-warning/10 text-warning",   hex: "#f59e0b" },
  // DB legacy values
  "Em Andamento": { label: "Em Andamento", color: "bg-accent/10 text-accent",   hex: "#f97316" },
  "in_progress":  { label: "Em Andamento", color: "bg-accent/10 text-accent",   hex: "#f97316" },
  "Planejamento": { label: "Planejamento", color: "bg-primary/10 text-primary", hex: "#3b82f6" },
  "Concluído":    { label: "Concluído",    color: "bg-success/10 text-success", hex: "#10b981" },
};

function getStatusInfo(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, color: "bg-muted text-muted-foreground", hex: "#6b7280" };
}

// ─── Custom marker icon ───────────────────────────────────────────────────────

function createMarkerIcon(hex: string, active = false) {
  const size = active ? 18 : 14;
  const ring = active ? `box-shadow:0 0 0 4px ${hex}44;` : "";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${hex};
      border:2.5px solid white;
      border-radius:50%;
      ${ring}
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

// ─── Map fly-to controller ────────────────────────────────────────────────────

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

// ─── Geocoding hook ───────────────────────────────────────────────────────────

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
    });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  } catch {
    return null;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Mapa = () => {
  const { projects, loading } = useProjects();
  const [geoProjects, setGeoProjects] = useState<GeoProject[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const geocodedRef = useRef(false);

  // Geocode all projects once they load
  useEffect(() => {
    if (loading || projects.length === 0 || geocodedRef.current) return;
    geocodedRef.current = true;
    setGeocoding(true);

    const run = async () => {
      const results: GeoProject[] = [];
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i];
        const query = buildGeoQuery(p.address || "");
        let lat = 0, lng = 0, ok = false;

        if (query) {
          const geo = await geocode(query);
          if (geo) { lat = geo.lat; lng = geo.lng; ok = true; }
          // Nominatim asks for ≥1s between requests
          if (i < projects.length - 1) await new Promise(r => setTimeout(r, 1100));
        }

        results.push({
          ...p,
          lat,
          lng,
          geocodeStatus: ok ? "ok" : "error",
          displayAddress: formatDisplayAddress(p.address || ""),
        });
      }
      setGeoProjects(results);
      setGeocoding(false);
    };

    run();
  }, [loading, projects]);

  const mapped = geoProjects.filter(p => p.geocodeStatus === "ok");
  const failed  = geoProjects.filter(p => p.geocodeStatus === "error");

  const filtered = geoProjects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.client.toLowerCase().includes(search.toLowerCase()) ||
    p.displayAddress.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback((p: GeoProject) => {
    if (p.geocodeStatus !== "ok") return;
    setActiveId(p.id);
    setFlyTarget({ lat: p.lat, lng: p.lng });
  }, []);

  // Brazil center as default view
  const defaultCenter: [number, number] = [-14.235, -51.925];
  const defaultZoom = 4;

  return (
    <div className="flex flex-col h-[calc(100vh-64px-48px)] -mx-6 -mt-0">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Mapa de Projetos</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {geocoding && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Localizando endereços…
            </span>
          )}
          {!geocoding && geoProjects.length > 0 && (
            <>
              <span className="flex items-center gap-1 text-success">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />
                {mapped.length} no mapa
              </span>
              {failed.length > 0 && (
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {failed.length} sem localização
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Buscar projeto…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading || geocoding ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum projeto encontrado
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map(p => {
                  const status = getStatusInfo(p.status);
                  const isActive = p.id === activeId;
                  const hasGeo = p.geocodeStatus === "ok";
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      disabled={!hasGeo}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2.5 transition-all duration-150",
                        "hover:bg-muted/70 focus:outline-none",
                        isActive && "bg-primary/8 border border-primary/20",
                        !hasGeo && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm leading-tight line-clamp-1">{p.name}</p>
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: status.hex }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.client}</p>
                      {p.displayAddress && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {p.displayAddress}
                        </p>
                      )}
                      {!hasGeo && (
                        <p className="text-xs text-warning mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Endereço não localizado
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="p-3 border-t border-border space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Legenda</p>
            {[
              { label: "Planejamento", hex: "#3b82f6" },
              { label: "Em Execução",  hex: "#f97316" },
              { label: "Concluído",    hex: "#10b981" },
              { label: "Em Espera",    hex: "#f59e0b" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.hex }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {(loading || (geocoding && mapped.length === 0)) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-muted/60 backdrop-blur-sm gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {loading ? "Carregando projetos…" : "Geocodificando endereços…"}
              </p>
            </div>
          )}

          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

            {mapped.map(p => {
              const status = getStatusInfo(p.status);
              const isActive = p.id === activeId;
              const types = p.type ? p.type.split(",").map(t => t.trim()).filter(Boolean) : [];
              return (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={createMarkerIcon(status.hex, isActive)}
                  eventHandlers={{
                    click: () => setActiveId(p.id),
                  }}
                >
                  <Popup maxWidth={260} className="project-popup">
                    <div className="space-y-2 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm leading-tight">{p.name}</p>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `${status.hex}20`, color: status.hex }}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <FolderKanban className="w-3 h-3" />
                        {p.client}
                      </div>

                      {p.displayAddress && (
                        <div className="flex items-start gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {p.displayAddress}
                        </div>
                      )}

                      {p.manager && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Gerente:</span> {p.manager}
                        </p>
                      )}

                      {types.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {types.map(t => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium"
                            >
                              {t}
                            </span>
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
