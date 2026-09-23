import { useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { 
  useGetDashboardSummary, 
  useGetRecentActivity,
  useGetProfile
} from "@workspace/api-client-react";
import { ActivityItem } from "@workspace/api-client-react";
import { 
  HeartPulse, 
  Droplet, 
  Activity, 
  Thermometer, 
  Moon, 
  Footprints, 
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronRight,
  ArrowRight,
  Clock,
  Stethoscope,
  ShoppingBag
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime, formatDate, formatRelative } from "@/lib/format";
import { motion } from "framer-motion";

const VITAL_ICONS: Record<string, any> = {
  heart_rate: HeartPulse,
  spo2: Droplet,
  blood_pressure: Activity,
  temperature: Thermometer,
  sleep: Moon,
  steps: Footprints,
};

const VITAL_LABELS: Record<string, string> = {
  heart_rate: "Heart Rate",
  spo2: "SpO2",
  blood_pressure: "Blood Pressure",
  temperature: "Temperature",
  sleep: "Sleep",
  steps: "Steps",
  glucose: "Glucose",
  respiratory_rate: "Resp. Rate"
};

export default function Dashboard() {
  const { user } = useUser();
  const { data: profile, isLoading: profileLoading } = useGetProfile();
  const displayName =
    user?.firstName ||
    user?.fullName?.split(" ")[0] ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    profile?.name?.split(" ")[0] ||
    "there";
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 5 });

  const isLoading = profileLoading || summaryLoading || activityLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight"
          >
            Good morning, {displayName}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-1"
          >
            Here is your health overview for today.
          </motion.p>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 bg-white dark:bg-card p-3 rounded-2xl shadow-sm border border-border"
        >
          <div className="text-center px-4 border-r border-border">
            <div className="text-sm text-muted-foreground font-medium mb-1">Health Score</div>
            <div className="text-2xl font-bold text-primary">{summary?.healthScore}</div>
          </div>
          <div className="text-center px-4">
            <div className="text-sm text-muted-foreground font-medium mb-1">Adherence</div>
            <div className="text-2xl font-bold text-chart-2">{summary?.adherencePercent}%</div>
          </div>
        </motion.div>
      </header>

      {summary?.alerts && summary.alerts.length > 0 && (
        <div className="space-y-3">
          {summary.alerts.map((alert, i) => (
            <motion.div 
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-xl border flex items-start gap-4 shadow-sm ${
                alert.severity === 'critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                alert.severity === 'warning' ? 'bg-chart-3/10 border-chart-3/20 text-chart-3' :
                'bg-primary/10 border-primary/20 text-primary'
              }`}
            >
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold">{alert.title}</h4>
                <p className="text-sm opacity-90 mt-1">{alert.message}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary?.latestVitals?.slice(0, 4).map((vital, i) => {
          const Icon = VITAL_ICONS[vital.vitalType] || Activity;
          return (
            <motion.div 
              key={vital.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (i * 0.1) }}
            >
              <Card className="hover-elevate transition-all duration-300">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    {vital.status !== 'normal' && (
                      <Badge variant={vital.status === 'critical' ? 'destructive' : 'secondary'} className={vital.status === 'warning' ? 'bg-chart-3 text-white' : ''}>
                        {vital.status}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{VITAL_LABELS[vital.vitalType]}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight">{vital.value}{vital.valueSecondary ? `/${vital.valueSecondary}` : ''}</span>
                      <span className="text-sm text-muted-foreground font-medium">{vital.unit}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Upcoming Appointments</CardTitle>
                <CardDescription>Your scheduled visits and calls</CardDescription>
              </div>
              <Link href="/appointments">
                <Button variant="ghost" size="sm" className="text-primary">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {summary?.upcomingAppointments && summary.upcomingAppointments.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {summary.upcomingAppointments.slice(0, 2).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="bg-background rounded-lg p-3 text-center min-w-[70px] border border-border shadow-sm">
                        <div className="text-xs font-semibold text-primary uppercase">{formatDate(apt.scheduledAt).split(' ')[0]}</div>
                        <div className="text-lg font-bold">{new Date(apt.scheduledAt).getDate()}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">Dr. {apt.doctorName}</h4>
                        <p className="text-sm text-muted-foreground truncate">{apt.doctorSpecialty} • {apt.visitType === 'telemedicine' ? 'Video Call' : 'In Person'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatTime(apt.scheduledAt)}</span>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">Details</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No upcoming appointments</p>
                  <Link href="/doctors">
                    <Button variant="outline" className="mt-4">Book an appointment</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-primary text-primary-foreground border-none shadow-md relative overflow-hidden group cursor-pointer">
              <Link href="/triage" className="absolute inset-0 z-10" />
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-6">
                <Stethoscope className="h-8 w-8 mb-4 text-primary-foreground/80" />
                <h3 className="text-lg font-semibold mb-1">Check Symptoms</h3>
                <p className="text-primary-foreground/70 text-sm mb-4">Not feeling well? Talk to our AI triage assistant.</p>
                <div className="flex items-center text-sm font-medium">
                  Start triage <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card hover-elevate transition-all cursor-pointer">
              <Link href="/pharmacy" className="absolute inset-0 z-10" />
              <CardContent className="p-6">
                <div className="p-2 bg-secondary text-secondary-foreground rounded-lg w-fit mb-4">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Order Medicines</h3>
                <p className="text-muted-foreground text-sm mb-4">Get your prescriptions delivered to your door.</p>
                <div className="flex items-center text-sm font-medium text-primary">
                  Browse pharmacy <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {activity?.map((item, i) => (
                  <div key={item.id} className="flex gap-4 relative">
                    {i !== activity.length - 1 && (
                      <div className="absolute top-8 left-[11px] bottom-[-24px] w-px bg-border" />
                    )}
                    <div className="relative z-10 mt-1">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center border-2 border-background">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                    </div>
                    <div className="flex-1 pb-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{formatRelative(item.occurredAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full text-muted-foreground">View all activity</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
