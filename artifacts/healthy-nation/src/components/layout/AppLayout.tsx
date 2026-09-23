import { Link, useLocation } from "wouter";
import { useGetActiveSos } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import { LogOut } from "lucide-react";
import { 
  Activity, 
  Stethoscope, 
  Calendar, 
  Clock, 
  Pill, 
  ShoppingBag, 
  AlertCircle,
  Menu,
  Home,
  User,
  Phone,
  Watch,
  Shield,
  BellRing
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { data: activeSos } = useGetActiveSos({ query: { queryKey: ["activeSos"] } });
  const { user } = useUser();
  const { signOut } = useClerk();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/vitals", label: "Vitals", icon: Activity },
    { href: "/devices", label: "Track Devices", icon: Watch },
    { href: "/triage", label: "AI Symptom Checker", icon: Stethoscope },
    { href: "/doctors", label: "Find Doctors", icon: User },
    { href: "/appointments", label: "Appointments", icon: Calendar },
    { href: "/history", label: "Medical History", icon: Clock },
    { href: "/pharmacy", label: "Pharmacy", icon: Pill },
    { href: "/reminders", label: "Medicine Reminders", icon: BellRing },
    { href: "/orders", label: "Orders", icon: ShoppingBag },
    { href: "/insurance", label: "Insurance", icon: Shield },
  ];

  const NavLinks = () => (
    <div className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer no-underline ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar h-screen sticky top-0">
        <div className="p-6">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
              <span className="font-semibold text-xl text-primary tracking-tight">Healthy Nation</span>
            </div>
          </Link>
        </div>
        
        <div className="flex-1 px-4 py-2 overflow-y-auto">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-border mt-auto space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-1">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-medium">
                  {(user.firstName || user.primaryEmailAddress?.emailAddress || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.firstName || user.primaryEmailAddress?.emailAddress}
                </div>
                <button
                  onClick={() => signOut({ redirectUrl: basePath || "/" })}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>
            </div>
          )}
          <Link href="/emergency">
            <Button variant="destructive" className="w-full gap-2 shadow-sm">
              <AlertCircle className="h-4 w-4" />
              Emergency SOS
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar - Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-30">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-6 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                    <Activity className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-xl text-primary tracking-tight">Healthy Nation</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 px-4 py-2 overflow-y-auto">
                <NavLinks />
              </div>
              <div className="p-4 border-t border-border">
                <Link href="/emergency">
                  <Button variant="destructive" className="w-full gap-2 shadow-sm">
                    <AlertCircle className="h-4 w-4" />
                    Emergency SOS
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="bg-primary text-primary-foreground p-1 rounded-md">
                <Activity className="h-4 w-4" />
              </div>
              <span className="font-semibold text-lg text-primary tracking-tight">Healthy Nation</span>
            </div>
          </Link>

          <div className="w-10"></div> {/* Spacer for centering */}
        </header>

        {/* SOS Banner */}
        {activeSos && activeSos.status === "active" && (
          <div className="bg-destructive text-destructive-foreground p-3 text-center text-sm font-medium animate-pulse flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Emergency SOS is active. Help has been notified.
            <Link href="/emergency">
              <span className="underline cursor-pointer ml-2">View details</span>
            </Link>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
