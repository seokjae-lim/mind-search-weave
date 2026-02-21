import { Search, FolderOpen, BarChart3, Bot, Cloud, Network } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const mainItems = [
  { title: "검색", url: "/", icon: Search },
  { title: "탐색", url: "/browse", icon: FolderOpen },
  { title: "현황", url: "/dashboard", icon: BarChart3 },
];

const aiItems = [
  { title: "AI 에이전트", url: "/ai-agent", icon: Bot },
];

const vizItems = [
  { title: "워드 클라우드", url: "/visualization/wordcloud", icon: Cloud },
  { title: "지식 그래프", url: "/visualization/knowledge-graph", icon: Network },
];

function MenuGroup({ label, items }: { label: string; items: typeof mainItems }) {
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
        <MenuGroup label="메뉴" items={mainItems} />
        <MenuGroup label="AI" items={aiItems} />
        <MenuGroup label="시각화" items={vizItems} />
      </SidebarContent>
    </Sidebar>
  );
}
