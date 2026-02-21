import { Search, FolderOpen, BarChart3, Bot, Cloud, Network, Home, Zap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

const mainItems = [
  { title: "검색", url: "/", icon: Search },
  { title: "현황", url: "/dashboard", icon: BarChart3 },
];

const browseChildren = [
  { title: "폴더 탐색", url: "/browse", icon: FolderOpen },
  { title: "지식 그래프", url: "/visualization/knowledge-graph", icon: Network },
];

const vizItems = [
  { title: "워드 클라우드", url: "/visualization/wordcloud", icon: Cloud },
];

function MenuGroup({ label, items }: { label: string; items: { title: string; url: string; icon: React.ElementType }[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end
                  className="flex items-center gap-2"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function BrowseGroup() {
  const location = useLocation();
  const isBrowseActive = browseChildren.some((c) => location.pathname === c.url);

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <Collapsible defaultOpen={isBrowseActive} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton className="flex items-center gap-2 w-full">
                  <FolderOpen className="h-4 w-4" />
                  <span className="flex-1 text-left">탐색</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu className="pl-4 mt-1">
                  {browseChildren.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className="flex items-center gap-2"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const navigate = useNavigate();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate("/"); }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">Knowledge Wiki</span>
            <span className="text-xs text-sidebar-foreground/60">컨설팅 산출물 검색</span>
          </div>
        </button>
      </SidebarHeader>
      <SidebarContent>
        {/* Home */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    className="flex items-center gap-2"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Home className="h-4 w-4" />
                    <span>홈</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <MenuGroup label="메뉴" items={mainItems} />
        <BrowseGroup />

        {/* AI 에이전트 — 단일 최상위 버튼 */}
        <SidebarGroup>
          <SidebarGroupLabel>AI</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/agent"
                    end
                    className="flex items-center gap-2"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Zap className="h-4 w-4" />
                    <span>AI 에이전트</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/ai-agent"
                    end
                    className="flex items-center gap-2"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <Bot className="h-4 w-4" />
                    <span>챗봇</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <MenuGroup label="시각화" items={vizItems} />
      </SidebarContent>
    </Sidebar>
  );
}
