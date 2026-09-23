import { useState } from "react";
import { useListVitals, useGetVitalTrends, useCreateVital } from "@workspace/api-client-react";
import { VitalType, VitalReading } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/format";
import { HeartPulse, Droplet, Activity, Thermometer, Moon, Footprints, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const VITAL_TYPES = [
  { id: "heart_rate", label: "Heart Rate", icon: HeartPulse, unit: "bpm" },
  { id: "blood_pressure", label: "Blood Pressure", icon: Activity, unit: "mmHg" },
  { id: "spo2", label: "SpO2", icon: Droplet, unit: "%" },
  { id: "temperature", label: "Temperature", icon: Thermometer, unit: "°F" },
  { id: "steps", label: "Steps", icon: Footprints, unit: "steps" },
  { id: "sleep", label: "Sleep", icon: Moon, unit: "hrs" },
];

export default function VitalsPage() {
  const [activeTab, setActiveTab] = useState<VitalType>("heart_rate");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vitalsList, isLoading: vitalsLoading } = useListVitals({ vitalType: activeTab });
  const { data: trends, isLoading: trendsLoading } = useGetVitalTrends(
    { vitalType: activeTab, days: 30 },
    { query: { enabled: !!activeTab, queryKey: ["vitalTrends", activeTab] } }
  );

  const createVital = useCreateVital();

  const handleAddVital = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get("vitalType") as VitalType;
    const value = Number(formData.get("value"));
    const valueSecondary = formData.get("valueSecondary") ? Number(formData.get("valueSecondary")) : undefined;

    try {
      await createVital.mutateAsync({
        data: {
          vitalType: type,
          value,
          valueSecondary,
          unit: VITAL_TYPES.find(v => v.id === type)?.unit || "",
          notes: formData.get("notes") as string,
        }
      });
      
      toast({ title: "Vital recorded successfully" });
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/vitals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vitals/latest"] });
      queryClient.invalidateQueries({ queryKey: ["vitalTrends"] });
    } catch (err) {
      toast({ title: "Failed to record vital", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vitals Tracker</h1>
          <p className="text-muted-foreground mt-1">Monitor your health metrics over time.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> Log Reading</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Vital</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddVital} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select name="vitalType" defaultValue={activeTab}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VITAL_TYPES.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input name="value" type="number" step="0.1" required />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Value <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input name="valueSecondary" type="number" step="0.1" placeholder="e.g. Diastolic" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input name="notes" placeholder="How were you feeling?" />
              </div>
              <Button type="submit" className="w-full" disabled={createVital.isPending}>
                {createVital.isPending ? "Saving..." : "Save Reading"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 snap-x hide-scrollbar">
        {VITAL_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = activeTab === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id as VitalType)}
              className={`flex-shrink-0 snap-start flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-card text-card-foreground border border-border hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium whitespace-nowrap">{type.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Trends (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                {!trendsLoading && trends && trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(val) => format(new Date(val), "MMM d")}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                      />
                      <YAxis 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-sm)' }}
                        labelFormatter={(val) => format(new Date(val), "MMM d, yyyy")}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      {trends[0]?.valueSecondary !== null && trends[0]?.valueSecondary !== undefined && (
                        <Line 
                          type="monotone" 
                          dataKey="valueSecondary" 
                          stroke="hsl(var(--chart-2))" 
                          strokeWidth={3}
                          dot={{ r: 4, fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : trendsLoading ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Activity className="h-10 w-10 mb-2 opacity-20" />
                    <p>Not enough data to show trends.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vitalsList?.map((vital, i) => (
                  <motion.div 
                    key={vital.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-lg">{vital.value}{vital.valueSecondary ? `/${vital.valueSecondary}` : ''}</span>
                        <span className="text-xs text-muted-foreground">{vital.unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(vital.recordedAt)}
                      </div>
                    </div>
                    {vital.status !== 'normal' && (
                      <Badge variant={vital.status === 'critical' ? 'destructive' : 'secondary'} className={vital.status === 'warning' ? 'bg-chart-3 text-white' : ''}>
                        {vital.status}
                      </Badge>
                    )}
                  </motion.div>
                ))}
                {!vitalsLoading && (!vitalsList || vitalsList.length === 0) && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No readings found for this metric.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
