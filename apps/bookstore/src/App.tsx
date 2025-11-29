import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Cart from "./pages/Cart";
import BookDetail from "./pages/BookDetail";
import Admin from "./pages/Admin";
import Library from "./pages/Library";
import Reader from "./pages/Reader";
import NotFound from "./pages/NotFound";
import BookSearchPage from "./pages/BookSearchPage";
import PaymentCallback from "./pages/PaymentCallback";
import Navigation from "./components/Navigation";
import { CountryProvider } from "./contexts/CountryContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CountryProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/cart" element={<Navigation><Cart /></Navigation>} />
            <Route path="/book/:id" element={<Navigation><BookDetail /></Navigation>} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/library" element={<Navigation><Library /></Navigation>} />
            <Route path="/reader/:orderId/:bookId" element={<Reader />} />
            <Route path="/payment-callback" element={<PaymentCallback />} />
            <Route path="/search" element={<Navigation><BookSearchPage /></Navigation>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </CountryProvider>
  </QueryClientProvider>
);

export default App;
