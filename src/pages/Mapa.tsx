import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useProjects } from "@/hooks/useProjects";
import { useAuthContext } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, AlertCircle, Loader2, ChevronDown, ChevronUp, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import { getProjectTypes } from "@/utils/projectTypes";

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
    : { street: raw, city: "", state: "" };
}

function geoQuery(raw: string): string | null {
  const { street, city, state } = parseAddr(raw || "");
  if (city && state) return `${street ? street + ", " : ""}${city}, ${state}, Brasil`;
  if (city) return `${city}, Brasil`;
  if (street) return `${street}, Brasil`;
  return null;
}

function displayAddr(raw: string) {
  const { street, city, state } = parseAddr(raw || "");
  return [street, city, state].filter(Boolean).join(", ");
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; hex: string }> = {
  planning:       { label: "Planejamento",  hex: "#3b82f6" },
  "Planejamento": { label: "Planejamento",  hex: "#3b82f6" },
  execution:      { label: "Em Execução",   hex: "#f97316" },
  "Em Andamento": { label: "Em Andamento",  hex: "#f97316" },
  in_progress:    { label: "Em Andamento",  hex: "#f97316" },
  completed:      { label: "Concluído",     hex: "#10b981" },
  "Concluído":    { label: "Concluído",     hex: "#10b981" },
  onhold:         { label: "Em Espera",     hex: "#f59e0b" },
  stopped:         { label: "Parado",          hex: "#ef4444" },
  started_stopped: { label: "Iniciado/Parado", hex: "#a855f7" },
  obra_civil:      { label: "Obra Civil",       hex: "#92400e" },
};

const ALL_STATUSES = [
  { key: "planning",    label: "Planejamento", hex: "#3b82f6" },
  { key: "execution",   label: "Em Execução",  hex: "#f97316" },
  { key: "completed",   label: "Concluído",    hex: "#10b981" },
  { key: "onhold",      label: "Em Espera",    hex: "#f59e0b" },
  { key: "stopped",         label: "Parado",          hex: "#ef4444" },
  { key: "started_stopped", label: "Iniciado/Parado", hex: "#a855f7" },
  { key: "obra_civil",      label: "Obra Civil",       hex: "#92400e" },
];

const CANONICAL: Record<string, string> = {
  planning:       "planning",
  "Planejamento": "planning",
  execution:      "execution",
  "Em Andamento": "execution",
  in_progress:    "execution",
  completed:      "completed",
  "Concluído":    "completed",
  onhold:         "onhold",
  stopped:         "stopped",
  started_stopped: "started_stopped",
  obra_civil:      "obra_civil",
};

function st(s: string) {
  return STATUS_CONFIG[s] ?? { label: s, hex: "#6b7280" };
}

function canonicalStatus(s: string): string {
  return CANONICAL[s] ?? s;
}

// ─── Marker icon ─────────────────────────────────────────────────────────────

function dotIcon(hex: string, active = false) {
  const sz = active ? 18 : 13;
  const ring = active
    ? `box-shadow:0 0 0 4px ${hex}44,0 2px 8px rgba(0,0,0,.4)`
    : "box-shadow:0 2px 5px rgba(0,0,0,.35)";
  return L.divIcon({
    className: "",
    html: `<div style="width:${sz}px;height:${sz}px;background:${hex};border:2.5px solid #fff;border-radius:50%;${ring}"></div>`,
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -(sz / 2 + 4)],
  });
}

// ─── Geo cache ────────────────────────────────────────────────────────────────

const GEO_CACHE_KEY = "secureproject:geocache_v1";
const GEO_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type GeoEntry = { lat: number; lng: number; ok: boolean; ts: number };

function readGeoCache(): Record<string, GeoEntry> {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) ?? "{}"); }
  catch { return {}; }
}

function writeGeoCache(cache: Record<string, GeoEntry>) {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); }
  catch { /* storage quota */ }
}

// ─── Persistent view ──────────────────────────────────────────────────────────

const VIEW_KEY = "secureproject_mapa_view";
interface SavedView { center: [number, number]; zoom: number }

function loadView(): SavedView | null {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SavedView;
    if (Array.isArray(v.center) && v.center.length === 2 && typeof v.zoom === "number") return v;
  } catch { /* ignore */ }
  return null;
}

function MapStateSaver() {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      const z = e.target.getZoom();
      localStorage.setItem(VIEW_KEY, JSON.stringify({ center: [c.lat, c.lng], zoom: z }));
    },
  });
  return null;
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

// ─── Filter panel ─────────────────────────────────────────────────────────────

function FilterPanel({
  allTypes,
  activeStatuses,
  activeTypes,
  onToggleStatus,
  onToggleType,
  onClear,
}: {
  allTypes: string[];
  activeStatuses: Set<string>;
  activeTypes: Set<string>;
  onToggleStatus: (k: string) => void;
  onToggleType: (t: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(true);
  const hasActive = activeStatuses.size < ALL_STATUSES.length || activeTypes.size < allTypes.length;

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          Filtros
          {hasActive && (
            <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              !
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Status */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Status</p>
            <div className="space-y-1">
              {ALL_STATUSES.map(({ key, label, hex }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activeStatuses.has(key)}
                    onChange={() => onToggleStatus(key)}
                    className="rounded border-border w-3.5 h-3.5 accent-primary"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-xs text-foreground group-hover:text-foreground/80">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tipo */}
          {allTypes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tipo de Serviço</p>
              <div className="flex flex-wrap gap-1">
                {allTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => onToggleType(t)}
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                      activeTypes.has(t)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear */}
          {hasActive && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_H = "calc(100vh - 64px - 24px - 53px)";
const DEFAULT_VIEW: SavedView = { center: [-14.235, -51.925], zoom: 4 };

// ─── Page ────────────────────────────────────────────────────────────────────

const Mapa = () => {
  const savedView = loadView() ?? DEFAULT_VIEW;
  const { allowedClientIds, allowedClientGroupIds } = useAuthContext();
  const { projects, loading } = useProjects(allowedClientIds, allowedClientGroupIds);
  const [geoProjects, setGeoProjects] = useState<GeoProject[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [geoKey, setGeoKey] = useState(0);
  const didGeocode = useRef(false);

  const refreshGeo = useCallback(() => {
    localStorage.removeItem(GEO_CACHE_KEY);
    setGeoProjects([]);
    didGeocode.current = false;
    setGeoKey((k) => k + 1);
  }, []);

  // Filters
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(
    () => new Set(ALL_STATUSES.map((s) => s.key))
  );
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [allTypes, setAllTypes] = useState<string[]>([]);

  // Extract unique service types from projects
  useEffect(() => {
    if (projects.length === 0) return;
    const types = new Set<string>();
    projects.forEach((p) => {
      getProjectTypes(p.type).forEach((t) => types.add(t));
    });
    const arr = Array.from(types).sort();
    setAllTypes(arr);
    setActiveTypes(new Set(arr)); // all selected by default
  }, [projects]);

  useEffect(() => {
    if (loading || projects.length === 0 || didGeocode.current) return;
    didGeocode.current = true;

    const cache = readGeoCache();
    const initial: GeoProject[] = [];
    const toFetch: number[] = [];

    // First pass: resolve from cache synchronously (only successful geocodes are cached)
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const q = geoQuery(p.address || "");
      const entry = q ? cache[q] : undefined;
      const fresh = entry && entry.ok && Date.now() - entry.ts < GEO_TTL_MS;

      initial.push({
        ...p,
        lat: fresh ? entry!.lat : 0,
        lng: fresh ? entry!.lng : 0,
        geocodeStatus: fresh ? "ok" : "error",
        displayAddress: displayAddr(p.address || ""),
      });

      if (!fresh && q) toFetch.push(i);
    }

    // Render cached results immediately — map is usable right away
    setGeoProjects(initial);

    if (toFetch.length === 0) return; // all from cache, done

    setGeocoding(true);

    (async () => {
      const current = [...initial];
      let cacheUpdated = false;

      for (let idx = 0; idx < toFetch.length; idx++) {
        const i = toFetch[idx];
        const p = projects[i];
        const q = geoQuery(p.address || "")!;

        const g = await geocode(q);

        // Only cache successful results — failures are retried on next load
        if (g) {
          cache[q] = { lat: g.lat, lng: g.lng, ok: true, ts: Date.now() };
          cacheUpdated = true;
        }

        current[i] = {
          ...p,
          lat: g?.lat ?? 0,
          lng: g?.lng ?? 0,
          geocodeStatus: g ? "ok" : "error",
          displayAddress: displayAddr(p.address || ""),
        };

        setGeoProjects([...current]); // progressive — each marker appears as it resolves

        if (idx < toFetch.length - 1) await new Promise((r) => setTimeout(r, 1100));
      }

      if (cacheUpdated) writeGeoCache(cache);
      setGeocoding(false);
    })();
  }, [loading, projects, geoKey]);

  const toggleStatus = useCallback((key: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleType = useCallback((t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveStatuses(new Set(ALL_STATUSES.map((s) => s.key)));
    setActiveTypes(new Set(allTypes));
  }, [allTypes]);

  // Apply all filters
  const filtered = geoProjects.filter((p) => {
    const matchSearch = [p.name, p.client, p.displayAddress]
      .some((s) => s?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = activeStatuses.has(canonicalStatus(p.status));
    const pTypes = getProjectTypes(p.type);
    const matchType = allTypes.length === 0 || pTypes.length === 0
      ? true
      : pTypes.some((t) => activeTypes.has(t));
    return matchSearch && matchStatus && matchType;
  });

  const mapped = geoProjects.filter((p) => p.geocodeStatus === "ok");
  const failed = geoProjects.filter((p) => p.geocodeStatus === "error");
  const visibleMapped = filtered.filter((p) => p.geocodeStatus === "ok");

  const select = useCallback((p: GeoProject) => {
    if (p.geocodeStatus !== "ok") return;
    setActiveId(p.id);
    setFlyTarget({ lat: p.lat, lng: p.lng });
  }, []);

  return (
    <div style={{ margin: "0 -24px -24px -24px" }}>

      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-end gap-4 px-6 border-b border-border bg-card"
        style={{ height: 53 }}
      >
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
              {visibleMapped.length !== mapped.length && (
                <Badge variant="outline" className="text-xs">
                  {visibleMapped.length} visível{visibleMapped.length !== 1 ? "is" : ""}
                </Badge>
              )}
            </>
          )}
          <button
            onClick={refreshGeo}
            disabled={geocoding}
            title="Forçar atualização das localizações"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${geocoding ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex" style={{ height: MAP_H }}>

        {/* Sidebar */}
        <div
          className="border-r border-border bg-card flex flex-col"
          style={{ width: 280, minWidth: 280 }}
        >
          {/* Search */}
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Buscar projeto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex-shrink-0">
            <FilterPanel
              allTypes={allTypes}
              activeStatuses={activeStatuses}
              activeTypes={activeTypes}
              onToggleStatus={toggleStatus}
              onToggleType={toggleType}
              onClear={clearFilters}
            />
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto">
            {loading || (geocoding && geoProjects.length === 0) ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum projeto encontrado
              </p>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map((p) => {
                  const info = st(p.status);
                  const isActive = p.id === activeId;
                  const hasGeo = p.geocodeStatus === "ok";
                  return (
                    <button
                      key={p.id}
                      onClick={() => select(p)}
                      disabled={!hasGeo}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2.5 transition-colors focus:outline-none hover:bg-muted/70",
                        isActive && "bg-primary/8 border border-primary/20",
                        !hasGeo && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="font-semibold text-sm leading-tight line-clamp-1">{p.name}</p>
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: info.hex }}
                        />
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

          {/* Legend */}
          <div className="p-3 border-t border-border flex-shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Legenda</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {ALL_STATUSES.map((l) => (
                <div key={l.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.hex }} />
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
            center={savedView.center}
            zoom={savedView.zoom}
            style={{ width: "100%", height: MAP_H }}
            zoomControl
          >
            <MapStateSaver />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}

            {visibleMapped.map((p) => {
              const info = st(p.status);
              const isActive = p.id === activeId;
              const types = getProjectTypes(p.type);
              return (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={dotIcon(info.hex, isActive)}
                  eventHandlers={{ click: () => setActiveId(p.id) }}
                >
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
                          {types.map((t) => (
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
