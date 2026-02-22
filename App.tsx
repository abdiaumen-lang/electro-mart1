import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartSheet } from "@/components/CartSheet";

// Pages
import Home from "@/pages/Home";
import ProductDetails from "@/pages/ProductDetails";
import Checkout from "@/pages/Checkout";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import AdminNewProduct from "@/pages/AdminNewProduct";
import AdminEditProduct from "@/pages/AdminEditProduct";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Home} /> {/* Reuse home but with filters which it handles */}
      <Route path="/product/:id" component={ProductDetails} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/products/new" component={AdminNewProduct} />
      <Route path="/admin/products/:id/edit" component={AdminEditProduct} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

import { WhatsAppButton } from "@/components/WhatsAppButton";
import { LanguageProvider } from "@/hooks/use-language";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <CartSheet />
          <WhatsAppButton />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
