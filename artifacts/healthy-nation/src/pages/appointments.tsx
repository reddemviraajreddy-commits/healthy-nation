import { useState } from "react";
import { useListAppointments, useUpdateAppointment, Appointment } from "@workspace/api-client-react";
import { formatDateTime, formatDate, formatTime, formatCurrency } from "@/lib/format";
import { Calendar as CalendarIcon, Clock, Video, MapPin, MoreVertical, X, Check, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<string>("upcoming");
  const { data: appointments, isLoading } = useListAppointments();
  
  const upcoming = appointments?.filter(a => ['confirmed', 'pending_confirmation'].includes(a.status)) || [];
  const past = appointments?.filter(a => ['completed', 'cancelled', 'no_show'].includes(a.status)) || [];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground mt-1">Manage your upcoming visits and view history.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 w-full max-w-md grid grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : upcoming.length > 0 ? (
            upcoming.map((apt, i) => (
              <motion.div key={apt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <AppointmentCard appointment={apt} isUpcoming={true} />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 border rounded-xl bg-card">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium">No upcoming appointments</h3>
              <p className="text-muted-foreground mt-1 mb-6">You're all caught up for now.</p>
              <Button>Book an Appointment</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="space-y-4">
          {past.length > 0 ? (
            past.map((apt, i) => (
              <motion.div key={apt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <AppointmentCard appointment={apt} isUpcoming={false} />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16 border rounded-xl bg-card text-muted-foreground">
              No past appointments found.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppointmentCard({ appointment, isUpcoming }: { appointment: Appointment, isUpcoming: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateAppointment = useUpdateAppointment();

  const handleCancel = async () => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      try {
        await updateAppointment.mutateAsync({ 
          id: appointment.id,
          data: { status: "cancelled", cancellationReason: "Cancelled by patient" }
        });
        toast({ title: "Appointment cancelled" });
        queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      } catch (err) {
        toast({ title: "Failed to cancel", variant: "destructive" });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-chart-2 text-white hover:bg-chart-2">Confirmed</Badge>;
      case 'pending_confirmation': return <Badge variant="outline" className="text-chart-3 border-chart-3">Pending</Badge>;
      case 'completed': return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden hover-elevate transition-all">
      <div className="flex flex-col md:flex-row">
        {/* Left Date Sidebar (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center p-6 bg-muted/30 border-r border-border w-40 shrink-0">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider">{formatDate(appointment.scheduledAt).split(' ')[0]}</div>
          <div className="text-4xl font-black my-1">{new Date(appointment.scheduledAt).getDate()}</div>
          <div className="text-sm text-muted-foreground">{formatTime(appointment.scheduledAt)}</div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              {/* Mobile Date visible only on small screens */}
              <div className="md:hidden flex flex-col items-center justify-center p-2 bg-muted rounded-lg border border-border w-16 shrink-0">
                <div className="text-xs font-semibold text-primary uppercase">{formatDate(appointment.scheduledAt).split(' ')[0]}</div>
                <div className="text-xl font-bold">{new Date(appointment.scheduledAt).getDate()}</div>
              </div>

              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border shadow-sm hidden sm:block">
                  <AvatarImage src={appointment.doctorPhotoUrl} alt={appointment.doctorName} />
                  <AvatarFallback>{appointment.doctorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">Dr. {appointment.doctorName}</h3>
                  <p className="text-muted-foreground text-sm">{appointment.doctorSpecialty}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(appointment.status)}
              {isUpcoming && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleCancel}>
                      <X className="mr-2 h-4 w-4" /> Cancel Appointment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              {appointment.visitType === 'telemedicine' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              <span className="font-medium text-foreground">
                {appointment.visitType === 'telemedicine' ? 'Video Consultation' : 'In-person Visit'}
              </span>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Clock className="h-4 w-4" />
              <span>{formatTime(appointment.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="truncate" title={appointment.reason}>{appointment.reason}</span>
            </div>
          </div>

          {isUpcoming && appointment.status === 'confirmed' && (
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              {appointment.visitType === 'telemedicine' ? (
                <Button className="w-full sm:w-auto gap-2 bg-chart-2 hover:bg-chart-2/90" disabled={!appointment.videoCallLink}>
                  <Video className="h-4 w-4" /> 
                  Join Video Call
                </Button>
              ) : (
                <Button className="w-full sm:w-auto gap-2" variant="outline">
                  <MapPin className="h-4 w-4" /> Get Directions
                </Button>
              )}
              <div className="text-sm font-medium ml-auto hidden sm:block">
                Fee: {formatCurrency(appointment.fee)}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
