import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIChatFAB } from "@/components/AIChatPanel";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import Dashboard from "./pages/Dashboard";
import DocumentDetail from "./pages/DocumentDetail";
import AdvancedSearch from "./pages/AdvancedSearch";
import AIAgent from "./pages/AIAgent";
import WordCloud from "./pages/WordCloud";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import NotFound from "./pages/NotFound";

// Agent Hub
import AgentHubPage from "./features/agent-hub/AgentHubPage";

// Proposal Assistant stubs
import AnalysisPage from "./features/proposal-assistant/pages/AnalysisPage";
import ProposalPage from "./features/proposal-assistant/pages/ProposalPage";
import ResearchPage from "./features/proposal-assistant/pages/ResearchPage";
import DeliverablesPage from "./features/proposal-assistant/pages/DeliverablesPage";
import HistoryPage from "./features/proposal-assistant/pages/HistoryPage";
import SettingsPage from "./features/proposal-assistant/pages/SettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex flex-1 flex-col">
              <header className="flex h-12 items-center border-b bg-background px-4">
                <SidebarTrigger />
              </header>
              <main className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/doc/*" element={<DocumentDetail />} />
                  <Route path="/advanced-search" element={<AdvancedSearch />} />
                  <Route path="/ai-agent" element={<AIAgent />} />
                  <Route path="/visualization/wordcloud" element={<WordCloud />} />
                  <Route path="/visualization/knowledge-graph" element={<KnowledgeGraph />} />

                  {/* Agent Hub */}
                  <Route path="/agent" element={<AgentHubPage />} />

                  {/* Proposal Assistant */}
                  <Route path="/assistant/analysis" element={<AnalysisPage />} />
                  <Route path="/assistant/proposal" element={<ProposalPage />} />
                  <Route path="/assistant/research" element={<ResearchPage />} />
                  <Route path="/assistant/deliverables" element={<DeliverablesPage />} />
                  <Route path="/assistant/history" element={<HistoryPage />} />
                  <Route path="/assistant/settings" element={<SettingsPage />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
          <AIChatFAB />
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
