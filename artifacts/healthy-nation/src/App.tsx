import { useEffect, useRef } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "@/pages/dashboard";
import VitalsPage from "@/pages/vitals";
import DevicesPage from "@/pages/devices";
import InsurancePage from "@/pages/insurance";
import RemindersPage from "@/pages/reminders";
import EmergencyPage from "@/pages/emergency";
import AppointmentsPage from "@/pages/appointments";
import HistoryPage from "@/pages/history";
import TriagePage from "@/pages/triage";
import DoctorsPage from "@/pages/doctors";
import DoctorProfilePage from "@/pages/doctor-profile";
import PharmacyPage from "@/pages/pharmacy";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(185 70% 25%)",
    colorForeground: "hsl(185 50% 12%)",
    colorMutedForeground: "hsl(185 15% 45%)",
    colorDanger: "hsl(0 70% 50%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(170 20% 97%)",
    colorInputForeground: "hsl(185 50% 12%)",
    colorNeutral: "hsl(170 15% 88%)",
    colorModalBackdrop: "rgba(15, 110, 115, 0.45)",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground text-2xl font-semibold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-medium hover:underline",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-destructive",
    logoBox: "mb-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-border hover:bg-muted",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
    formFieldInput: "bg-input border border-border",
    footerAction: "text-muted-foreground",
    dividerLine: "bg-border",
    alert: "border border-destructive/40 bg-destructive/5",
    otpCodeFieldInput: "bg-input border border-border",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>{children}</AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/vitals">{() => <Protected><VitalsPage /></Protected>}</Route>
      <Route path="/devices">{() => <Protected><DevicesPage /></Protected>}</Route>
      <Route path="/insurance">{() => <Protected><InsurancePage /></Protected>}</Route>
      <Route path="/reminders">{() => <Protected><RemindersPage /></Protected>}</Route>
      <Route path="/emergency">{() => <Protected><EmergencyPage /></Protected>}</Route>
      <Route path="/appointments">{() => <Protected><AppointmentsPage /></Protected>}</Route>
      <Route path="/history">{() => <Protected><HistoryPage /></Protected>}</Route>
      <Route path="/triage">{() => <Protected><TriagePage /></Protected>}</Route>
      <Route path="/doctors">{() => <Protected><DoctorsPage /></Protected>}</Route>
      <Route path="/doctors/:id">{() => <Protected><DoctorProfilePage /></Protected>}</Route>
      <Route path="/pharmacy">{() => <Protected><PharmacyPage /></Protected>}</Route>
      <Route path="/orders">{() => <Protected><OrdersPage /></Protected>}</Route>
      <Route path="/orders/:id">{() => <Protected><OrderDetailPage /></Protected>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
