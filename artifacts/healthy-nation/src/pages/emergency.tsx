import { useState, useEffect } from "react";
import { useTriggerSos, useGetActiveSos, useListEmergencyContacts, useListHospitals, useResolveSos, getGetActiveSosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Phone, MapPin, Activity, ShieldAlert, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/lib/format";

export default function EmergencyPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const { toast } = useToast();
  
  const { data: activeSos, refetch: refetchSos } = useGetActiveSos({ query: { queryKey: ["activeSos"] } });
  const { data: contacts } = useListEmergencyContacts();
  const { data: hospitals } = useListHospitals();
  
  const triggerSos = useTriggerSos();
  const resolveSos = useResolveSos();
  const queryClient = useQueryClient();

  const handleResolve = async () => {
    if (!activeSos) return;
    try {
      await resolveSos.mutateAsync({ id: activeSos.id });
      await queryClient.invalidateQueries({ queryKey: ["activeSos"] });
      await queryClient.invalidateQueries({ queryKey: getGetActiveSosQueryKey() });
      refetchSos();
      toast({ title: "SOS resolved", description: "The emergency has been marked as resolved." });
    } catch (err) {
      toast({ title: "Failed to resolve SOS", variant: "destructive" });
    }
  };

  // Poll active SOS status every 5 seconds if active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSos && activeSos.status === "active") {
      interval = setInterval(() => {
        refetchSos();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeSos, refetchSos]);

  const handleTrigger = async () => {
    try {
      await triggerSos.mutateAsync({ data: { notes: "Triggered from mobile app" } });
      setConfirmOpen(false);
      refetchSos();
      toast({ title: "SOS Activated", description: "Help is on the way.", variant: "destructive" });
    } catch (err) {
      toast({ title: "Failed to activate SOS", variant: "destructive" });
    }
  };

  const isActive = activeSos && activeSos.status === "active";

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <div className="text-center space-y-2 mt-4 md:mt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Emergency Hub</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          In a life-threatening medical emergency, call your local emergency services immediately (911/112).
        </p>
      </div>

      {isActive ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-destructive text-destructive-foreground rounded-3xl p-8 shadow-xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10 text-center space-y-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">SOS is Active</h2>
              <p className="text-destructive-foreground/80 text-lg">
                Emergency protocol activated at {formatTime(activeSos.triggeredAt)}. 
                <br/>We have notified {activeSos.contactsNotified} emergency contacts.
              </p>
            </div>
            
            <div className="bg-black/20 rounded-xl p-6 text-left max-w-md mx-auto backdrop-blur-sm">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Nearest ER (Recommended)
              </h3>
              {activeSos.hospitals && activeSos.hospitals[0] ? (
                <div>
                  <div className="text-xl font-bold mb-1">{activeSos.hospitals[0].name}</div>
                  <div className="text-destructive-foreground/80 mb-3">{activeSos.hospitals[0].address}</div>
                  <div className="flex items-center justify-between text-sm font-medium bg-white/10 rounded-lg p-3">
                    <span>{activeSos.hospitals[0].distanceKm} km away</span>
                    <span>~{activeSos.hospitals[0].etaMinutes} mins</span>
                  </div>
                </div>
              ) : (
                <div className="opacity-80">Locating nearest hospital...</div>
              )}
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="mt-4 font-bold"
              onClick={handleResolve}
              disabled={resolveSos.isPending}
            >
              {resolveSos.isPending ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setIsPressing(true)}
                onHoverEnd={() => setIsPressing(false)}
                className="w-64 h-64 rounded-full bg-destructive shadow-[0_0_60px_-15px_rgba(255,0,0,0.5)] flex flex-col items-center justify-center border-8 border-destructive/20 transition-all focus:outline-none relative group"
              >
                <div className={`absolute inset-0 rounded-full border-4 border-white/30 transition-all duration-1000 ${isPressing ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}`}></div>
                <AlertCircle className="h-20 w-20 text-white mb-2" />
                <span className="text-white text-3xl font-black tracking-widest uppercase">SOS</span>
                <span className="text-white/80 text-sm mt-2 font-medium">TAP FOR HELP</span>
              </motion.button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert className="h-8 w-8 text-destructive" />
                </div>
                <DialogTitle className="text-center text-2xl">Confirm Emergency</DialogTitle>
                <DialogDescription className="text-center text-base">
                  This will notify your emergency contacts and share your current location. Proceed?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-3 mt-6">
                <Button variant="outline" className="flex-1 h-12 text-lg" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button variant="destructive" className="flex-1 h-12 text-lg font-bold" onClick={handleTrigger} disabled={triggerSos.isPending}>
                  {triggerSos.isPending ? "Activating..." : "Yes, I need help"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Emergency Contacts</CardTitle>
              <CardDescription>Notified automatically when SOS is active.</CardDescription>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {contacts?.map(contact => (
                <div key={contact.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <UserIcon contact={contact} />
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {contact.name}
                        {contact.isPrimary && <span className="text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">Primary</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">{contact.relationship}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!contacts || contacts.length === 0) && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No emergency contacts added.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nearby Hospitals (ER)</CardTitle>
            <CardDescription>Based on your current location.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {hospitals?.map(hospital => (
                <div key={hospital.id} className="flex items-start gap-4 p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="mt-1 text-chart-4">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{hospital.name}</div>
                    <div className="text-sm text-muted-foreground mb-2">{hospital.address}</div>
                    <div className="flex gap-2">
                      <span className="text-xs font-medium bg-muted px-2 py-1 rounded-md">{hospital.distanceKm} km</span>
                      <span className="text-xs font-medium bg-muted px-2 py-1 rounded-md">{hospital.etaMinutes} min</span>
                      <span className="text-xs font-medium bg-chart-4/10 text-chart-4 px-2 py-1 rounded-md">{hospital.traumaLevel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UserIcon({ contact }: { contact: any }) {
  // Just a simple initial placeholder
  return <span className="font-bold text-sm">{contact.name.charAt(0)}</span>;
}
