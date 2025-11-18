import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

const Schedules = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Cronogramas</h1>
        <p className="text-muted-foreground">Visualize e gerencie cronogramas de projetos</p>
      </div>

      <Card className="p-12 text-center">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Módulo em Desenvolvimento</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          O módulo de cronogramas com Gráfico de Gantt interativo será implementado em breve.
        </p>
      </Card>
    </div>
  );
};

export default Schedules;
