import { type LucideIcon, Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface StubPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function StubPage({ icon: Icon, title, description }: StubPageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground max-w-md">{description}</p>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 text-sm font-medium">
        <Construction className="h-4 w-4" />
        연결 준비중 (Coming Soon)
      </div>
      <Button variant="outline" onClick={() => navigate("/agent")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        에이전트 허브로 돌아가기
      </Button>
    </div>
  );
}
