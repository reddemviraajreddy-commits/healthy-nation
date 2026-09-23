import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Watch,
  Smartphone,
  HeartPulse,
  Footprints,
  Moon,
  Droplet,
  Activity,
  Flame,
  Plus,
  CheckCircle2,
  Battery,
  Wifi,
  WifiOff,
  Plug,
  Bluetooth,
  BluetoothSearching,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Metric = {
  key: string;
  label: string;
  icon: any;
  value: string;
};

type Device = {
  id: string;
  name: string;
  brand: string;
  type: "Watch" | "Phone" | "Band" | "Scale" | "Monitor";
  icon: any;
  connected: boolean;
  battery: number;
  lastSync: string;
  metrics: Metric[];
};

const initialDevices: Device[] = [
  {
    id: "apple-watch",
    name: "Apple Watch Series 9",
    brand: "Apple",
    type: "Watch",
    icon: Watch,
    connected: true,
    battery: 78,
    lastSync: "2 min ago",
    metrics: [
      { key: "steps", label: "Steps", icon: Footprints, value: "8,420" },
      { key: "hr", label: "Heart Rate", icon: HeartPulse, value: "72 bpm" },
      { key: "calories", label: "Calories", icon: Flame, value: "412 kcal" },
      { key: "sleep", label: "Sleep", icon: Moon, value: "7h 12m" },
    ],
  },
  {
    id: "fitbit",
    name: "Fitbit Charge 6",
    brand: "Fitbit",
    type: "Band",
    icon: Activity,
    connected: true,
    battery: 54,
    lastSync: "12 min ago",
    metrics: [
      { key: "steps", label: "Steps", icon: Footprints, value: "9,108" },
      { key: "hr", label: "Heart Rate", icon: HeartPulse, value: "69 bpm" },
      { key: "spo2", label: "SpO2", icon: Droplet, value: "97%" },
    ],
  },
  {
    id: "iphone",
    name: "iPhone Health",
    brand: "Apple",
    type: "Phone",
    icon: Smartphone,
    connected: true,
    battery: 92,
    lastSync: "Just now",
    metrics: [
      { key: "steps", label: "Steps", icon: Footprints, value: "8,420" },
      { key: "flights", label: "Flights Climbed", icon: Activity, value: "12" },
      { key: "distance", label: "Distance", icon: Activity, value: "5.8 km" },
    ],
  },
];

const availableDevices = [
  { name: "Garmin Venu 3", type: "Watch", icon: Watch },
  { name: "Samsung Galaxy Watch 6", type: "Watch", icon: Watch },
  { name: "Withings Body+ Scale", type: "Scale", icon: Activity },
  { name: "Oura Ring Gen 3", type: "Band", icon: Activity },
  { name: "Omron Blood Pressure Monitor", type: "Monitor", icon: HeartPulse },
];

type BleDevice = {
  id: string;
  name: string;
  device: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  battery?: number;
  heartRate?: number;
  connected: boolean;
  connectedAt: number;
};

const HEART_RATE_SERVICE = 0x180d;
const HEART_RATE_MEASUREMENT = 0x2a37;
const BATTERY_SERVICE = 0x180f;
const BATTERY_LEVEL = 0x2a19;
const DEVICE_INFO_SERVICE = 0x180a;

function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const rate16Bits = flags & 0x1;
  return rate16Bits ? value.getUint16(1, true) : value.getUint8(1);
}

export default function DevicesPage() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [addOpen, setAddOpen] = useState(false);
  const [bleSupported, setBleSupported] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [bleDevices, setBleDevices] = useState<BleDevice[]>([]);
  const bleRef = useRef<Map<string, BleDevice>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBleSupported("bluetooth" in navigator);
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }
  }, []);

  const openInNewTab = () => {
    const url = window.location.href;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const updateBle = (id: string, patch: Partial<BleDevice>) => {
    const existing = bleRef.current.get(id);
    if (!existing) return;
    const next = { ...existing, ...patch };
    bleRef.current.set(id, next);
    setBleDevices(Array.from(bleRef.current.values()));
  };

  const scanBluetooth = async () => {
    if (!("bluetooth" in navigator)) {
      toast({
        title: "Bluetooth not available",
        description: "Use Chrome, Edge, or Opera on desktop, or Chrome on Android, over HTTPS.",
        variant: "destructive",
      });
      return;
    }
    if (inIframe) {
      toast({
        title: "Bluetooth blocked in preview",
        description: "Opening the app in a new tab so Bluetooth can work.",
      });
      openInNewTab();
      return;
    }
    setScanning(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [HEART_RATE_SERVICE, BATTERY_SERVICE, DEVICE_INFO_SERVICE],
      });
      const id = device.id || `${device.name}-${Date.now()}`;
      const entry: BleDevice = {
        id,
        name: device.name || "Unknown device",
        device,
        connected: false,
        connectedAt: Date.now(),
      };
      bleRef.current.set(id, entry);
      setBleDevices(Array.from(bleRef.current.values()));

      device.addEventListener("gattserverdisconnected", () => {
        updateBle(id, { connected: false });
        toast({ title: `${entry.name} disconnected` });
      });

      const server = await device.gatt!.connect();
      updateBle(id, { server, connected: true });
      toast({ title: "Connected", description: `${entry.name} is now streaming.` });

      try {
        const battSvc = await server.getPrimaryService(BATTERY_SERVICE);
        const battChar = await battSvc.getCharacteristic(BATTERY_LEVEL);
        const battVal = await battChar.readValue();
        updateBle(id, { battery: battVal.getUint8(0) });
        await battChar.startNotifications();
        battChar.addEventListener("characteristicvaluechanged", (ev: any) => {
          updateBle(id, { battery: ev.target.value.getUint8(0) });
        });
      } catch {}

      try {
        const hrSvc = await server.getPrimaryService(HEART_RATE_SERVICE);
        const hrChar = await hrSvc.getCharacteristic(HEART_RATE_MEASUREMENT);
        await hrChar.startNotifications();
        hrChar.addEventListener("characteristicvaluechanged", (ev: any) => {
          updateBle(id, { heartRate: parseHeartRate(ev.target.value) });
        });
      } catch {}
    } catch (err: any) {
      const name = err?.name;
      const msg = String(err?.message || "");
      if (name === "NotFoundError") {
        // user cancelled the chooser — silent
      } else if (
        name === "SecurityError" ||
        name === "NotAllowedError" ||
        /permissions policy|disallowed|not allowed|secure context/i.test(msg)
      ) {
        toast({
          title: "Bluetooth blocked here",
          description: "Open the app in a new tab to use Bluetooth (the preview frame blocks it).",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bluetooth error",
          description: msg || "Failed to connect.",
          variant: "destructive",
        });
      }
    } finally {
      setScanning(false);
    }
  };

  const disconnectBle = (id: string) => {
    const entry = bleRef.current.get(id);
    if (entry?.device.gatt?.connected) {
      entry.device.gatt.disconnect();
    }
    bleRef.current.delete(id);
    setBleDevices(Array.from(bleRef.current.values()));
  };

  const toggleConnection = (id: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, connected: !d.connected, lastSync: !d.connected ? "Just now" : d.lastSync }
          : d,
      ),
    );
  };

  const syncDevice = (id: string) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, lastSync: "Just now" } : d)));
    toast({ title: "Sync complete", description: "Latest health data has been pulled." });
  };

  const addDevice = (name: string, type: Device["type"], icon: any) => {
    const newDevice: Device = {
      id: `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name,
      brand: name.split(" ")[0],
      type,
      icon,
      connected: true,
      battery: 100,
      lastSync: "Just now",
      metrics: [
        { key: "steps", label: "Steps", icon: Footprints, value: "0" },
        { key: "hr", label: "Heart Rate", icon: HeartPulse, value: "—" },
      ],
    };
    setDevices((prev) => [...prev, newDevice]);
    setAddOpen(false);
    toast({ title: "Device connected", description: `${name} is now syncing your health data.` });
  };

  const connectedCount = devices.filter((d) => d.connected).length;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            Track Devices
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-1"
          >
            Manage wearables and health trackers connected to your Healthy Nation account.
          </motion.p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={scanBluetooth}
            disabled={scanning || !bleSupported}
            variant="outline"
            className="gap-2"
            title={bleSupported ? "Scan for nearby Bluetooth devices" : "Web Bluetooth not supported in this browser"}
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BluetoothSearching className="h-4 w-4" />
            )}
            {scanning ? "Scanning..." : "Scan Nearby"}
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Device
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Connected</CardDescription>
            <CardTitle className="text-3xl">{connectedCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            of {devices.length} paired devices
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Metrics tracked</CardDescription>
            <CardTitle className="text-3xl">
              {new Set(devices.flatMap((d) => d.metrics.map((m) => m.key))).size}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Steps, HR, SpO2, sleep & more
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last sync</CardDescription>
            <CardTitle className="text-3xl">Just now</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Auto-sync runs every 5 minutes
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
                <Bluetooth className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Nearby Bluetooth devices</CardTitle>
                <CardDescription>
                  {!bleSupported
                    ? "Web Bluetooth isn't available in this browser. Use Chrome, Edge, or Opera over HTTPS."
                    : inIframe
                      ? "The preview frame blocks Bluetooth. Open the app in a new tab to scan and stream live."
                      : "Live BLE connection from your browser. Heart rate and battery stream in real time."}
                </CardDescription>
              </div>
            </div>
            {inIframe && bleSupported && (
              <Button size="sm" variant="default" onClick={openInNewTab} className="gap-2">
                <BluetoothSearching className="h-4 w-4" /> Open in new tab
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bleDevices.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">
              {inIframe && bleSupported
                ? "Open the app in a new tab, then tap Scan Nearby and pick a device from the system chooser."
                : <>No devices connected yet. Tap <strong>Scan Nearby</strong> and pick a device from the system chooser.</>}
            </div>
          ) : (
            <div className="space-y-3">
              {bleDevices.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-border bg-background p-4 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-md ${
                        b.connected ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Bluetooth className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.connected ? "Connected" : "Disconnected"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {b.heartRate !== undefined && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <HeartPulse className="h-4 w-4 text-rose-600" />
                        <span className="font-semibold">{b.heartRate}</span>
                        <span className="text-muted-foreground">bpm</span>
                      </div>
                    )}
                    {b.battery !== undefined && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Battery className="h-4 w-4" />
                        <span className="font-semibold">{b.battery}%</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => disconnectBle(b.id)}
                      className="gap-1"
                    >
                      <X className="h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {devices.map((device, i) => {
          const Icon = device.icon;
          return (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl ${
                          device.connected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {device.name}
                          {device.connected ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <WifiOff className="h-3 w-3" /> Disconnected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-3 flex-wrap">
                          <span>{device.brand} • {device.type}</span>
                          {device.connected && (
                            <>
                              <span className="inline-flex items-center gap-1">
                                <Battery className="h-3.5 w-3.5" /> {device.battery}%
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Wifi className="h-3.5 w-3.5" /> Last sync {device.lastSync}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={device.connected}
                        onCheckedChange={() => toggleConnection(device.id)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!device.connected}
                        onClick={() => syncDevice(device.id)}
                      >
                        Sync now
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {device.connected && (
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {device.metrics.map((m) => {
                        const MIcon = m.icon;
                        return (
                          <div
                            key={m.key}
                            className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3"
                          >
                            <div className="p-2 rounded-md bg-background text-primary">
                              <MIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground truncate">{m.label}</div>
                              <div className="font-semibold truncate">{m.value}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" /> Connect a new device
            </DialogTitle>
            <DialogDescription>
              Select a device to pair. We'll start syncing your health metrics automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {availableDevices.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.name}
                  onClick={() => addDevice(d.name, d.type as Device["type"], d.icon)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.type}</div>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
