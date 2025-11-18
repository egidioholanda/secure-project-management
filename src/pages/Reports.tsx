import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

const Reports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
        <p className="text-muted-foreground">Gere relatórios de progresso para clientes</p>
      </div>

      <Card className="p-12 text-center">
        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Módulo em Desenvolvimento</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          O módulo de geração de relatórios será implementado em breve.
        </p>
      </Card>
    </div>
  );
};

export default Reports;
