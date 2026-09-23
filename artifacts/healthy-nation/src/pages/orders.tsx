import { useListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatCurrency, formatRelative, formatDateTime } from "@/lib/format";
import { ShoppingBag, Package, Truck, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function OrdersPage() {
  const { data: orders, isLoading } = useListOrders();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'delivered': return { icon: CheckCircle2, color: 'text-chart-2', bg: 'bg-chart-2/10 border-chart-2/20', label: 'Delivered' };
      case 'out_for_delivery': return { icon: Truck, color: 'text-primary', bg: 'bg-primary/10 border-primary/20', label: 'Out for Delivery' };
      case 'dispatched': return { icon: Package, color: 'text-chart-3', bg: 'bg-chart-3/10 border-chart-3/20', label: 'Dispatched' };
      case 'cancelled': return { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', label: 'Cancelled' };
      default: return { icon: ShoppingBag, color: 'text-muted-foreground', bg: 'bg-muted border-border', label: status.replace('_', ' ') };
    }
  };

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground mt-1">Track your medicine deliveries.</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)
        ) : orders?.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No orders yet</h3>
            <Link href="/pharmacy"><Button variant="link" className="mt-2 text-primary">Browse Pharmacy</Button></Link>
          </div>
        ) : (
          orders?.map((order, i) => {
            const conf = getStatusConfig(order.status);
            const Icon = conf.icon;
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Link href={`/orders/${order.id}`}>
                  <Card className="hover-elevate cursor-pointer transition-all">
                    <CardContent className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border ${conf.bg}`}>
                        <Icon className={`h-6 w-6 ${conf.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">Order #{order.id}</h3>
                          <Badge variant="outline" className={`capitalize ${conf.color} ${conf.bg}`}>{conf.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{order.pharmacyName} • {order.itemCount} items</p>
                        <p className="text-xs text-muted-foreground mt-1.5">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0 w-full sm:w-auto flex flex-row sm:flex-col justify-between items-center sm:items-end">
                        <div className="font-black text-xl">{formatCurrency(order.totalAmount)}</div>
                        <div className="text-sm font-medium text-primary flex items-center gap-1 mt-1">
                          View details <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
